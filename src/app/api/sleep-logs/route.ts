import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { awardXP, updateStreak, checkAchievements, updateDailyStats, updateGoalProgress } from '@/lib/gamification'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const from = searchParams.get('from') // YYYY-MM-DD
    const to = searchParams.get('to') // YYYY-MM-DD

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })

    if (from) {
      query = query.gte('log_date', from)
    }
    if (to) {
      query = query.lte('log_date', to)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sleep logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sleep logs' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Failed to fetch sleep logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sleep logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      log_date,
      sleep_duration,
      sleep_quality,
      restfulness,
      bedtime,
      wake_time,
      interruptions,
      notes
    } = body

    // Validate required fields
    if (!userId || !log_date || !sleep_duration) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, log_date, sleep_duration' },
        { status: 400 }
      )
    }

    // Validate sleep_duration is a positive number
    if (sleep_duration <= 0 || sleep_duration > 24) {
      return NextResponse.json(
        { error: 'Sleep duration must be between 0 and 24 hours' },
        { status: 400 }
      )
    }

    // Validate sleep_quality and restfulness if provided (1-5 range)
    if (sleep_quality && (sleep_quality < 1 || sleep_quality > 5)) {
      return NextResponse.json(
        { error: 'Sleep quality must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (restfulness && (restfulness < 1 || restfulness > 5)) {
      return NextResponse.json(
        { error: 'Restfulness must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check for duplicate log_date for this user
    const { data: existing } = await supabase
      .from('sleep_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', log_date)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Sleep log already exists for this date. Use PATCH to update.' },
        { status: 409 }
      )
    }

    // Insert sleep log (sleep_score will be auto-calculated by trigger)
    const { data, error } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: userId,
        log_date,
        sleep_duration,
        sleep_quality: sleep_quality || null,
        restfulness: restfulness || null,
        bedtime: bedtime || null,
        wake_time: wake_time || null,
        interruptions: interruptions || 0,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving sleep log:', error)
      return NextResponse.json(
        { error: 'Failed to save sleep log' },
        { status: 500 }
      )
    }

    // Gamification: Award XP, update streak, track daily stats, update goals, and check achievements
    try {
      await awardXP(userId, 10, 'Sleep logged')
      await updateStreak(userId, 'sleep', log_date)

      // Update daily activity stats
      await updateDailyStats(userId, { sleep_logs_logged: 1 })

      // Update goal progress for sleep-related goals
      await updateGoalProgress(userId, 'sleep_count', 1)

      // Check for newly unlocked achievements
      await checkAchievements(userId)
    } catch (gamificationError) {
      console.error('Gamification error (non-blocking):', gamificationError)
      // Don't fail the request if gamification fails
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to save sleep log:', error)
    return NextResponse.json(
      { error: 'Failed to save sleep log' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, sleepLogId, updates } = body

    if (!userId || !sleepLogId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, sleepLogId, updates' },
        { status: 400 }
      )
    }

    // Validate userId owns the sleep log
    const { data: existing, error: fetchError } = await supabase
      .from('sleep_logs')
      .select('user_id')
      .eq('id', sleepLogId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Sleep log not found' },
        { status: 404 }
      )
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this sleep log' },
        { status: 403 }
      )
    }

    // Validate updates if provided
    if (updates.sleep_duration !== undefined) {
      if (updates.sleep_duration <= 0 || updates.sleep_duration > 24) {
        return NextResponse.json(
          { error: 'Sleep duration must be between 0 and 24 hours' },
          { status: 400 }
        )
      }
    }

    if (updates.sleep_quality !== undefined) {
      if (updates.sleep_quality < 1 || updates.sleep_quality > 5) {
        return NextResponse.json(
          { error: 'Sleep quality must be between 1 and 5' },
          { status: 400 }
        )
      }
    }

    if (updates.restfulness !== undefined) {
      if (updates.restfulness < 1 || updates.restfulness > 5) {
        return NextResponse.json(
          { error: 'Restfulness must be between 1 and 5' },
          { status: 400 }
        )
      }
    }

    // Don't allow updating user_id or log_date
    const allowedUpdates = { ...updates }
    delete allowedUpdates.user_id
    delete allowedUpdates.log_date
    delete allowedUpdates.id

    // Update sleep log (score will be recalculated by trigger)
    const { data, error } = await supabase
      .from('sleep_logs')
      .update(allowedUpdates)
      .eq('id', sleepLogId)
      .select()
      .single()

    if (error) {
      console.error('Error updating sleep log:', error)
      return NextResponse.json(
        { error: 'Failed to update sleep log' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to update sleep log:', error)
    return NextResponse.json(
      { error: 'Failed to update sleep log' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sleepLogId = searchParams.get('sleepLogId')

    if (!userId || !sleepLogId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, sleepLogId' },
        { status: 400 }
      )
    }

    // Validate userId owns the sleep log
    const { data: existing, error: fetchError } = await supabase
      .from('sleep_logs')
      .select('user_id')
      .eq('id', sleepLogId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Sleep log not found' },
        { status: 404 }
      )
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this sleep log' },
        { status: 403 }
      )
    }

    // Delete sleep log
    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', sleepLogId)

    if (error) {
      console.error('Error deleting sleep log:', error)
      return NextResponse.json(
        { error: 'Failed to delete sleep log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Sleep log deleted successfully' })

  } catch (error) {
    console.error('Failed to delete sleep log:', error)
    return NextResponse.json(
      { error: 'Failed to delete sleep log' },
      { status: 500 }
    )
  }
}
