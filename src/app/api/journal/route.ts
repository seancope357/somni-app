import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get journal entries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dreamId = searchParams.get('dreamId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        dreams (
          id,
          content,
          interpretation,
          symbols,
          emotions,
          themes,
          sleep_hours
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by dream if provided
    if (dreamId) {
      query = query.eq('dream_id', dreamId)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching journal entries:', error)
      return NextResponse.json(
        { error: 'Failed to fetch journal entries' },
        { status: 500 }
      )
    }

    return NextResponse.json(entries || [])

  } catch (error) {
    console.error('Failed to fetch journal entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    )
  }
}

// Create journal entry
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      dreamId,
      title,
      content,
      tags,
      moodRating
    } = body

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'User ID and content required' },
        { status: 400 }
      )
    }

    // Validate mood rating if provided
    if (moodRating !== undefined && moodRating !== null) {
      if (moodRating < 1 || moodRating > 5) {
        return NextResponse.json(
          { error: 'Mood rating must be between 1 and 5' },
          { status: 400 }
        )
      }
    }

    const entryData = {
      user_id: userId,
      dream_id: dreamId || null,
      title: title || null,
      content,
      tags: tags || [],
      mood_rating: moodRating || null
    }

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .insert(entryData)
      .select()
      .single()

    if (error) {
      console.error('Error creating journal entry:', error)
      return NextResponse.json(
        { error: 'Failed to create journal entry' },
        { status: 500 }
      )
    }

    // If linked to a dream, update the dream's has_journal flag
    if (dreamId) {
      await supabase
        .from('dreams')
        .update({ has_journal: true })
        .eq('id', dreamId)
    }

    return NextResponse.json(entry)

  } catch (error) {
    console.error('Failed to create journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
}
