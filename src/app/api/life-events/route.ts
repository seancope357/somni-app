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
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

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

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to create life event:', error)
    return NextResponse.json(
      { error: 'Failed to create life event' },
      { status: 500 }
    )
  }
}
