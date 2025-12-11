import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'


// Update journal entry
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    const id = params.id
    const body = await request.json()
    const {
      title,
      content,
      tags,
      moodRating
    } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content required' },
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

    const updateData: any = {
      content,
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (tags !== undefined) updateData.tags = tags
    if (moodRating !== undefined) updateData.mood_rating = moodRating

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating journal entry:', error)
      return NextResponse.json(
        { error: 'Failed to update journal entry' },
        { status: 500 }
      )
    }

    return NextResponse.json(entry)

  } catch (error) {
    console.error('Failed to update journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to update journal entry' },
      { status: 500 }
    )
  }
}

// Delete journal entry
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    const id = params.id

    // Get the entry first to check if it's linked to a dream
    const { data: entry } = await supabase
      .from('journal_entries')
      .select('dream_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting journal entry:', error)
      return NextResponse.json(
        { error: 'Failed to delete journal entry' },
        { status: 500 }
      )
    }

    // If it was linked to a dream, check if there are other entries for that dream
    if (entry?.dream_id) {
      const { data: otherEntries } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('dream_id', entry.dream_id)
        .limit(1)

      // If no other entries, update dream's has_journal flag
      if (!otherEntries || otherEntries.length === 0) {
        await supabase
          .from('dreams')
          .update({ has_journal: false })
          .eq('id', entry.dream_id)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    )
  }
}
