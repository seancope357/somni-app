import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateGoalProgress, awardXP } from '@/lib/gamification'
import type { GoalType, GoalPeriod } from '@/types/gamification'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/gamification/goals
 * Fetch user's goals (active, completed, or all)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'active' // active, completed, all

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    let query = supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: goals, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(
      (goals || []).map(async (goal) => {
        try {
          const progress = await calculateGoalProgress(goal.id)
          return { ...goal, ...progress }
        } catch (e) {
          return { ...goal, progress_percentage: 0, days_remaining: 0, is_on_track: false }
        }
      })
    )

    return NextResponse.json({
      goals: goalsWithProgress,
      total: goalsWithProgress.length,
      active: goalsWithProgress.filter(g => g.status === 'active').length,
      completed: goalsWithProgress.filter(g => g.status === 'completed').length
    })

  } catch (error: any) {
    console.error('Goals fetch error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gamification/goals
 * Create a new goal
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, goalType, targetValue, period, title, description, icon, customDates } = body

    if (!userId || !goalType || !targetValue || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate start and end dates based on period
    const today = new Date()
    let startDate = today.toISOString().split('T')[0]
    let endDate: string

    if (customDates) {
      startDate = customDates.start
      endDate = customDates.end
    } else {
      switch (period) {
        case 'daily':
          endDate = today.toISOString().split('T')[0]
          break
        case 'weekly':
          const nextWeek = new Date(today)
          nextWeek.setDate(today.getDate() + 7)
          endDate = nextWeek.toISOString().split('T')[0]
          break
        case 'monthly':
          const nextMonth = new Date(today)
          nextMonth.setMonth(today.getMonth() + 1)
          endDate = nextMonth.toISOString().split('T')[0]
          break
        default:
          return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
      }
    }

    const { data: goal, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: userId,
        goal_type: goalType,
        target_value: targetValue,
        current_value: 0,
        period: period || 'custom',
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        title,
        description: description || null,
        icon: icon || '🎯'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      goal
    })

  } catch (error: any) {
    console.error('Goal creation error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create goal' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/gamification/goals/:id
 * Update goal (progress, status, etc.)
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, goalId, updates } = body

    if (!userId || !goalId) {
      return NextResponse.json(
        { error: 'User ID and goal ID required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: goal, error: fetchError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Check if goal was completed
    const wasCompleted = goal.status === 'completed'
    const isNowCompleted = updates.status === 'completed'

    if (isNowCompleted && !wasCompleted) {
      updates.completed_at = new Date().toISOString()
      // Award XP for goal completion
      await awardXP(userId, 50, `Goal completed: ${goal.title}`)
    }

    const { data: updatedGoal, error: updateError } = await supabase
      .from('user_goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      goal: updatedGoal,
      xp_awarded: isNowCompleted && !wasCompleted ? 50 : 0
    })

  } catch (error: any) {
    console.error('Goal update error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update goal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/gamification/goals
 * Delete/abandon a goal
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const goalId = searchParams.get('goalId')

    if (!userId || !goalId) {
      return NextResponse.json(
        { error: 'User ID and goal ID required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: goal } = await supabase
      .from('user_goals')
      .select('user_id')
      .eq('id', goalId)
      .single()

    if (!goal || goal.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('user_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Goal deletion error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete goal' },
      { status: 500 }
    )
  }
}

/**
 * Goal presets for quick creation
 */
export const GOAL_PRESETS = [
  {
    title: 'Dream Journal Week',
    description: 'Log a dream every day this week',
    goal_type: 'dream_count',
    target_value: 7,
    period: 'weekly',
    icon: '📖'
  },
  {
    title: 'Mood Tracking Month',
    description: 'Log your mood daily for 30 days',
    goal_type: 'mood_count',
    target_value: 30,
    period: 'monthly',
    icon: '😊'
  },
  {
    title: 'Weekly Reflection',
    description: 'Write 5 journal entries this week',
    goal_type: 'journal_count',
    target_value: 5,
    period: 'weekly',
    icon: '✍️'
  },
  {
    title: 'Dream Explorer',
    description: 'Log 10 dreams this month',
    goal_type: 'dream_count',
    target_value: 10,
    period: 'monthly',
    icon: '🌙'
  }
]
