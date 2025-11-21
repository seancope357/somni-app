import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Update the event
    const { data, error } = await supabase
      .from('life_events')
      .update({
        title,
        description: description || null,
        category,
        intensity: intensity || null,
        date_start,
        date_end: date_end || null,
        tags: tags || []
      })
      .eq('id', params.id)
      .eq('user_id', userId) // Ensure user owns this event
      .select()
      .single()

    if (error) {
      console.error('Error updating life event:', error)
      return NextResponse.json(
        { error: 'Failed to update life event' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Event not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to update life event:', error)
    return NextResponse.json(
      { error: 'Failed to update life event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('life_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting life event:', error)
      return NextResponse.json(
        { error: 'Failed to delete life event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete life event:', error)
    return NextResponse.json(
      { error: 'Failed to delete life event' },
      { status: 500 }
    )
  }
}
