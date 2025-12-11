import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Add XP to user
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
    const { userId, amount, reason, relatedId, relatedType } = body

    if (!userId || !amount || !reason) {
      return NextResponse.json(
        { error: 'userId, amount, and reason are required' },
        { status: 400 }
      )
    }

    // Call the database function to add XP
    const { data, error } = await supabase.rpc('add_xp_to_user', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_related_id: relatedId || null,
      p_related_type: relatedType || null
    })

    if (error) {
      console.error('Error adding XP:', error)
      return NextResponse.json(
        { error: 'Failed to add XP' },
        { status: 500 }
      )
    }

    // data is an array with one row
    const result = data[0]

    return NextResponse.json({
      new_level: result.new_level,
      level_up: result.level_up,
      total_xp: result.total_xp
    })

  } catch (error) {
    console.error('Failed to add XP:', error)
    return NextResponse.json(
      { error: 'Failed to add XP' },
      { status: 500 }
    )
  }
}
