import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'


export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

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
      .from('mood_logs')
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
      console.error('Error fetching mood logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mood logs' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Failed to fetch mood logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mood logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { userId, log_date, mood, stress, energy, notes } = body

    if (!userId || !log_date || !mood || !stress || !energy) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, log_date, mood, stress, energy' },
        { status: 400 }
      )
    }

    // Validate ranges
    if (mood < 1 || mood > 5 || stress < 1 || stress > 5 || energy < 1 || energy > 5) {
      return NextResponse.json(
        { error: 'Mood, stress, and energy must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Upsert by user_id + log_date
    const { data, error } = await supabase
      .from('mood_logs')
      .upsert({
        user_id: userId,
        log_date,
        mood,
        stress,
        energy,
        notes: notes || null
      }, {
        onConflict: 'user_id,log_date'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving mood log:', error)
      return NextResponse.json(
        { error: 'Failed to save mood log' },
        { status: 500 }
      )
    }

    // Award XP and update gamification stats
    try {
      // Award XP for mood logging
      await supabase.rpc('add_xp_to_user', {
        p_user_id: userId,
        p_amount: 5, // XP_REWARDS.MOOD_LOGGED
        p_reason: 'Mood logged',
        p_related_id: data.id,
        p_related_type: 'mood_log'
      })

      // Update mood log counter
      await supabase.rpc('increment', {
        table_name: 'user_stats',
        row_id: userId,
        column_name: 'total_mood_logs',
        increment_by: 1
      }).catch(() => {
        // If increment RPC doesn't exist, update directly
        supabase
          .from('user_stats')
          .update({ total_mood_logs: supabase.sql`total_mood_logs + 1` })
          .eq('user_id', userId)
      })

      // Update streak
      await supabase.rpc('update_user_streak', {
        p_user_id: userId
      })
    } catch (gamificationError) {
      console.error('Failed to update gamification stats:', gamificationError)
      // Don't fail the request if gamification fails
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to save mood log:', error)
    return NextResponse.json(
      { error: 'Failed to save mood log' },
      { status: 500 }
    )
  }
}
