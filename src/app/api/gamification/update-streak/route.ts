import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Update user streak
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
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Call the database function to update streak
    const { data, error } = await supabase.rpc('update_user_streak', {
      p_user_id: userId,
      p_activity_date: new Date().toISOString().split('T')[0]
    })

    if (error) {
      console.error('Error updating streak:', error)
      return NextResponse.json(
        { error: 'Failed to update streak' },
        { status: 500 }
      )
    }

    const result = data[0]

    return NextResponse.json({
      current_streak: result.current_streak,
      longest_streak: result.longest_streak,
      is_new_record: result.is_new_record
    })

  } catch (error) {
    console.error('Failed to update streak:', error)
    return NextResponse.json(
      { error: 'Failed to update streak' },
      { status: 500 }
    )
  }
}
