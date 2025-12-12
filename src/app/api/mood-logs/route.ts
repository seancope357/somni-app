import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { awardXP, updateStreak, checkAchievements } from '@/lib/gamification'

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

    // Gamification: Award XP and update streak
    try {
      await awardXP(userId, 5, 'Mood logged')
      await updateStreak(userId, 'mood', log_date)
      await updateStreak(userId, 'wellness', log_date) // Mood contributes to wellness
      await checkAchievements(userId)
    } catch (gamificationError) {
      console.error('Gamification error (non-blocking):', gamificationError)
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
