import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// Create Supabase client

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    // Get user ID from query params or headers
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const { data: dreams, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching dreams:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dream history' },
        { status: 500 }
      )
    }

    return NextResponse.json(dreams || [])

  } catch (error) {
    console.error('Failed to fetch dreams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dream history' },
      { status: 500 }
    )
  }
}
