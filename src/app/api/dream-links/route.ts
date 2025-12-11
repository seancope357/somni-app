import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'


// Get linked events for a dream
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
    const dreamId = searchParams.get('dreamId')
    const userId = searchParams.get('userId')

    if (!dreamId || !userId) {
      return NextResponse.json(
        { error: 'Dream ID and User ID required' },
        { status: 400 }
      )
    }

    // Verify the user owns this dream
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('id')
      .eq('id', dreamId)
      .eq('user_id', userId)
      .single()

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get linked life events
    const { data: links, error } = await supabase
      .from('dream_life_events')
      .select(`
        life_event_id,
        life_events (*)
      `)
      .eq('dream_id', dreamId)

    if (error) {
      console.error('Error fetching dream links:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dream links' },
        { status: 500 }
      )
    }

    // Extract life events from the joined data
    const lifeEvents = links?.map(link => (link as any).life_events) || []

    return NextResponse.json(lifeEvents)

  } catch (error) {
    console.error('Failed to fetch dream links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dream links' },
      { status: 500 }
    )
  }
}

// Link a dream to a life event
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
    const { dreamId, lifeEventId, userId } = body

    if (!dreamId || !lifeEventId || !userId) {
      return NextResponse.json(
        { error: 'Dream ID, Life Event ID, and User ID required' },
        { status: 400 }
      )
    }

    // Verify the user owns both the dream and the life event
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('id')
      .eq('id', dreamId)
      .eq('user_id', userId)
      .single()

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found or unauthorized' },
        { status: 404 }
      )
    }

    const { data: lifeEvent, error: eventError } = await supabase
      .from('life_events')
      .select('id')
      .eq('id', lifeEventId)
      .eq('user_id', userId)
      .single()

    if (eventError || !lifeEvent) {
      return NextResponse.json(
        { error: 'Life event not found or unauthorized' },
        { status: 404 }
      )
    }

    // Create the link
    const { data, error } = await supabase
      .from('dream_life_events')
      .insert({
        dream_id: dreamId,
        life_event_id: lifeEventId
      })
      .select()
      .single()

    if (error) {
      // Check if link already exists
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Link already exists' },
          { status: 409 }
        )
      }

      console.error('Error creating dream link:', error)
      return NextResponse.json(
        { error: 'Failed to create dream link' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to create dream link:', error)
    return NextResponse.json(
      { error: 'Failed to create dream link' },
      { status: 500 }
    )
  }
}

// Unlink a dream from a life event
export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dreamId = searchParams.get('dreamId')
    const lifeEventId = searchParams.get('lifeEventId')
    const userId = searchParams.get('userId')

    if (!dreamId || !lifeEventId || !userId) {
      return NextResponse.json(
        { error: 'Dream ID, Life Event ID, and User ID required' },
        { status: 400 }
      )
    }

    // Verify the user owns the dream
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('id')
      .eq('id', dreamId)
      .eq('user_id', userId)
      .single()

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete the link
    const { error } = await supabase
      .from('dream_life_events')
      .delete()
      .eq('dream_id', dreamId)
      .eq('life_event_id', lifeEventId)

    if (error) {
      console.error('Error deleting dream link:', error)
      return NextResponse.json(
        { error: 'Failed to delete dream link' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete dream link:', error)
    return NextResponse.json(
      { error: 'Failed to delete dream link' },
      { status: 500 }
    )
  }
}
