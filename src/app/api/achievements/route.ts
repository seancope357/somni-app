import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Get all achievements and user progress
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get all achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .order('sort_order')

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError)
      return NextResponse.json(
        { error: 'Failed to fetch achievements' },
        { status: 500 }
      )
    }

    // Get user's achievement progress
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)

    if (userError) {
      console.error('Error fetching user achievements:', userError)
    }

    // Merge the data
    const mergedAchievements = achievements.map(achievement => {
      const userProgress = userAchievements?.find(
        ua => ua.achievement_id === achievement.id
      )

      return {
        ...achievement,
        progress: userProgress?.progress || 0,
        is_completed: userProgress?.is_completed || false,
        completed_at: userProgress?.completed_at || null
      }
    })

    // Calculate stats
    const completedCount = mergedAchievements.filter(a => a.is_completed).length
    const totalCount = mergedAchievements.length
    const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return NextResponse.json({
      achievements: mergedAchievements,
      stats: {
        completed: completedCount,
        total: totalCount,
        percent_complete: percentComplete
      }
    })

  } catch (error) {
    console.error('Failed to get achievements:', error)
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    )
  }
}
