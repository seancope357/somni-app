import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { awardXP, checkAchievements } from '@/lib/gamification'

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
    const categories = searchParams.get('categories')?.split(',')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('life_events')
      .select('*')
      .eq('user_id', userId)
      .order('date_start', { ascending: false })

    if (from) {
      query = query.gte('date_start', from)
    }
    if (to) {
      query = query.lte('date_start', to)
    }
    if (categories && categories.length > 0) {
      query = query.in('category', categories)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching life events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch life events' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Failed to fetch life events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch life events' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, title, description, category, intensity, date_start, date_end, tags } = body

    if (!userId || !title || !category || !date_start) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, category, date_start' },
        { status: 400 }
      )
    }

    // Validate intensity if provided
    if (intensity && (intensity < 1 || intensity > 5)) {
      return NextResponse.json(
        { error: 'Intensity must be between 1 and 5' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('life_events')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        category,
        intensity: intensity || null,
        date_start,
        date_end: date_end || null,
        tags: tags || []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating life event:', error)
      return NextResponse.json(
        { error: 'Failed to create life event' },
        { status: 500 }
      )
    }

    // Gamification: Award XP for creating a life event
    try {
      await awardXP(userId, 10, 'Life event logged')
      await checkAchievements(userId)
    } catch (gamificationError) {
      console.error('Gamification error (non-blocking):', gamificationError)
      // Don't fail the request if gamification fails
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to create life event:', error)
    return NextResponse.json(
      { error: 'Failed to create life event' },
      { status: 500 }
    )
  }
}
