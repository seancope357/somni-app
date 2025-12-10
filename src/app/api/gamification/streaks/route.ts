import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateStreak } from '@/lib/gamification'
import type { StreakType } from '@/types/gamification'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/gamification/streaks
 * Fetch current streak data for user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const { data: streaks, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error
    }

    // Initialize if doesn't exist
    if (!streaks) {
      const { data: newStreaks, error: insertError } = await supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          current_dream_streak: 0,
          longest_dream_streak: 0,
          current_mood_streak: 0,
          longest_mood_streak: 0,
          current_wellness_streak: 0,
          longest_wellness_streak: 0,
          streak_freezes_available: 0,
          streak_freezes_used: 0
        })
        .select()
        .single()

      if (insertError) throw insertError
      return NextResponse.json(newStreaks)
    }

    // Check for streak warnings (about to break)
    const warnings = []
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    if (streaks.last_dream_date && streaks.last_dream_date !== today) {
      const lastDate = new Date(streaks.last_dream_date)
      const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60)
      if (hoursSince >= 24 && hoursSince < 48 && streaks.current_dream_streak > 0) {
        warnings.push({
          streak_type: 'dream',
          current_streak: streaks.current_dream_streak,
          hours_until_break: Math.max(0, 48 - hoursSince),
          can_use_freeze: streaks.streak_freezes_available > 0
        })
      }
    }

    if (streaks.last_mood_date && streaks.last_mood_date !== today) {
      const lastDate = new Date(streaks.last_mood_date)
      const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60)
      if (hoursSince >= 24 && hoursSince < 48 && streaks.current_mood_streak > 0) {
        warnings.push({
          streak_type: 'mood',
          current_streak: streaks.current_mood_streak,
          hours_until_break: Math.max(0, 48 - hoursSince),
          can_use_freeze: streaks.streak_freezes_available > 0
        })
      }
    }

    return NextResponse.json({
      streaks,
      warnings
    })

  } catch (error: any) {
    console.error('Streaks fetch error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch streaks' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gamification/streaks/update
 * Update streak after logging activity
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, type, date } = body

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'User ID and streak type required' },
        { status: 400 }
      )
    }

    const activityDate = date || new Date().toISOString().split('T')[0]
    const result = await updateStreak(userId, type as StreakType, activityDate)

    return NextResponse.json({
      success: true,
      current_streak: result.streak,
      milestone_reached: result.milestone,
      xp_awarded: result.xp_awarded || 0,
      celebration: result.milestone ? {
        type: 'streak_milestone',
        title: `${result.streak}-Day Streak!`,
        description: `You're on fire! Keep it up!`,
        icon: '🔥',
        animation: 'pulse',
        xp_reward: result.xp_awarded
      } : null
    })

  } catch (error: any) {
    console.error('Streak update error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update streak' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gamification/streaks/freeze
 * Use a streak freeze to protect against break
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, streakType } = body

    if (!userId || !streakType) {
      return NextResponse.json(
        { error: 'User ID and streak type required' },
        { status: 400 }
      )
    }

    // Get current streaks
    const { data: streaks, error: fetchError } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError
    if (!streaks) {
      return NextResponse.json({ error: 'Streaks not found' }, { status: 404 })
    }

    if (streaks.streak_freezes_available <= 0) {
      return NextResponse.json({ error: 'No streak freezes available' }, { status: 400 })
    }

    // Use freeze and update last date to today
    const today = new Date().toISOString().split('T')[0]
    const updates: any = {
      streak_freezes_available: streaks.streak_freezes_available - 1,
      streak_freezes_used: streaks.streak_freezes_used + 1
    }

    if (streakType === 'dream') {
      updates.last_dream_date = today
    } else if (streakType === 'mood') {
      updates.last_mood_date = today
    } else if (streakType === 'wellness') {
      updates.last_wellness_date = today
    }

    const { error: updateError } = await supabase
      .from('user_streaks')
      .update(updates)
      .eq('user_id', userId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Streak freeze applied!',
      freezes_remaining: updates.streak_freezes_available
    })

  } catch (error: any) {
    console.error('Streak freeze error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to apply streak freeze' },
      { status: 500 }
    )
  }
}
