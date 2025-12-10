import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAchievements } from '@/lib/gamification'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/gamification/achievements
 * List all achievements with unlock status for user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category') // Optional filter
    const tier = searchParams.get('tier') // Optional filter

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get all achievements
    let query = supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)

    if (category) {
      query = query.eq('category', category)
    }
    if (tier) {
      query = query.eq('tier', tier)
    }

    const { data: allAchievements, error: achievementsError } = await query.order('sort_order')

    if (achievementsError) throw achievementsError

    // Get user's unlocked achievements
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at, is_viewed')
      .eq('user_id', userId)

    if (userError) throw userError

    const unlockedMap = new Map(
      userAchievements?.map(ua => [ua.achievement_id, ua]) || []
    )

    // Combine data
    const achievementsWithStatus = allAchievements?.map(achievement => {
      const unlock = unlockedMap.get(achievement.id)
      return {
        ...achievement,
        is_unlocked: !!unlock,
        unlocked_at: unlock?.unlocked_at || null,
        is_viewed: unlock?.is_viewed || false,
        progress: unlock ? 100 : calculateProgress(achievement, userId)
      }
    }) || []

    // Group by category for easier display
    const grouped = achievementsWithStatus.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = []
      }
      acc[achievement.category].push(achievement)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      achievements: achievementsWithStatus,
      grouped,
      total: achievementsWithStatus.length,
      unlocked: achievementsWithStatus.filter(a => a.is_unlocked).length
    })

  } catch (error: any) {
    console.error('Achievements fetch error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gamification/achievements/check
 * Manually trigger achievement check (e.g., after dream/mood logging)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, triggerType } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Check for new achievements
    const result = await checkAchievements(userId, triggerType)

    return NextResponse.json({
      success: true,
      newly_unlocked: result.newly_unlocked,
      xp_gained: result.xp_gained,
      level_up: result.level_up,
      new_level: result.new_level,
      celebration_needed: result.newly_unlocked.length > 0 || result.level_up
    })

  } catch (error: any) {
    console.error('Achievement check error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to check achievements' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/gamification/achievements/mark-viewed
 * Mark achievements as viewed (clear notification badges)
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, achievementIds } = body

    if (!userId || !achievementIds) {
      return NextResponse.json({ error: 'User ID and achievement IDs required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_achievements')
      .update({ is_viewed: true })
      .eq('user_id', userId)
      .in('achievement_id', achievementIds)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Mark viewed error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to mark achievements as viewed' },
      { status: 500 }
    )
  }
}

// Helper: Calculate progress toward achievement (0-100)
// This is a simplified version - you'd expand this based on criteria type
function calculateProgress(achievement: any, userId: string): number {
  // For now, return 0 for locked achievements
  // In a full implementation, you'd query current progress
  // E.g., if threshold is 10 dreams and user has 5, return 50
  return 0
}
