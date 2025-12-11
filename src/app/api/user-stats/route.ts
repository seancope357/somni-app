import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Get user stats
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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get or create user stats
    let { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No stats exist, create them
      const { data: newStats, error: insertError } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          xp_to_next_level: 100,
          current_streak: 0,
          longest_streak: 0,
          total_dreams: 0,
          total_journal_entries: 0,
          total_mood_logs: 0,
          total_life_events: 0
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user stats:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user stats' },
          { status: 500 }
        )
      }

      stats = newStats
    } else if (error) {
      console.error('Error fetching user stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user stats' },
        { status: 500 }
      )
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Failed to get user stats:', error)
    return NextResponse.json(
      { error: 'Failed to get user stats' },
      { status: 500 }
    )
  }
}

// Update user counters (called after actions like logging dream, mood, etc.)
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action required' },
        { status: 400 }
      )
    }

    // Map actions to counter fields
    const counterMap: { [key: string]: string } = {
      'dream': 'total_dreams',
      'journal': 'total_journal_entries',
      'mood': 'total_mood_logs',
      'event': 'total_life_events'
    }

    const counterField = counterMap[action]

    if (!counterField) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      )
    }

    // Increment the counter
    const { data, error } = await supabase.rpc('increment_user_counter', {
      p_user_id: userId,
      p_counter_field: counterField
    })

    if (error) {
      // If function doesn't exist, do it manually
      const { data: stats } = await supabase
        .from('user_stats')
        .select(counterField)
        .eq('user_id', userId)
        .single()

      const currentValue = stats ? (stats as any)[counterField] : 0

      const { error: updateError } = await supabase
        .from('user_stats')
        .update({ [counterField]: currentValue + 1 })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating counter:', updateError)
        return NextResponse.json(
          { error: 'Failed to update counter' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to update counter:', error)
    return NextResponse.json(
      { error: 'Failed to update counter' },
      { status: 500 }
    )
  }
}
