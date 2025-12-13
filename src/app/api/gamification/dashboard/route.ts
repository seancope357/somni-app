import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateXPForLevel, getTitleForLevel } from '@/lib/gamification'
import { getDateDaysAgo } from '@/lib/date-utils'
import type { GamificationDashboard } from '@/types/gamification'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/gamification/dashboard
 * Fetch complete gamification state for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Fetch all gamification data in parallel
    const [
      streaksResult,
      levelResult,
      achievementsResult,
      goalsResult,
      dailyStatsResult,
      unviewedCountResult
    ] = await Promise.all([
      // 1. Streaks
      supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single(),

      // 2. Level & XP
      supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single(),

      // 3. Recent achievements (last 5)
      supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(5),

      // 4. Active goals
      supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('end_date', { ascending: true }),

      // 5. Daily activity stats (today + last 7 days)
      supabase
        .from('daily_activity_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', getDateDaysAgo(7))
        .order('activity_date', { ascending: false }),

      // 6. Count unviewed achievements
      supabase
        .from('user_achievements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_viewed', false)
    ])

    // Initialize defaults if user is new
    let streaks = streaksResult.data
    if (!streaks) {
      const { data: newStreaks } = await supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          current_dream_streak: 0,
          longest_dream_streak: 0,
          current_mood_streak: 0,
          longest_mood_streak: 0,
          current_wellness_streak: 0,
          longest_wellness_streak: 0,
          streak_freezes_available: 0,
          streak_freezes_used: 0
        })
        .select()
        .single()
      streaks = newStreaks!
    }

    let level = levelResult.data
    if (!level) {
      const { data: newLevel } = await supabase
        .from('user_levels')
        .insert({
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          xp_to_next_level: calculateXPForLevel(1),
          current_title: getTitleForLevel(1)
        })
        .select()
        .single()
      level = newLevel!
    }

    const achievements = achievementsResult.data || []
    const goals = goalsResult.data || []
    const dailyStats = dailyStatsResult.data || []
    const unviewedCount = unviewedCountResult.count || 0

    // Calculate level progress
    const xpInCurrentLevel = level.total_xp - getXPForPreviousLevel(level.current_level)
    const xpRequiredForLevel = calculateXPForLevel(level.current_level)
    const progressPercentage = Math.round((xpInCurrentLevel / xpRequiredForLevel) * 100)
    const nextTitle = getTitleForLevel(level.current_level + 1)

    const levelProgress = {
      current_level: level.current_level,
      current_xp: xpInCurrentLevel,
      xp_to_next_level: xpRequiredForLevel,
      progress_percentage: progressPercentage,
      current_title: level.current_title,
      next_title: nextTitle
    }

    // Process achievements
    const recentAchievements = achievements.map(ua => ({
      achievement: ua.achievement,
      just_unlocked: !ua.is_viewed,
      progress: 100 // Already unlocked
    }))

    // Process goals with progress
    const activeGoals = goals.map(goal => {
      const today = new Date()
      const endDate = new Date(goal.end_date)
      const startDate = new Date(goal.start_date)
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      const progressPercentage = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))

      // Calculate if on track
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysElapsed = totalDays - daysRemaining
      const expectedProgress = daysElapsed > 0 ? (daysElapsed / totalDays) * 100 : 0
      const isOnTrack = progressPercentage >= expectedProgress * 0.8

      const dailyTarget = totalDays > 0 ? Math.ceil(goal.target_value / totalDays) : goal.target_value

      return {
        goal,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        is_on_track: isOnTrack,
        daily_target: dailyTarget
      }
    })

    // Process daily activity
    const today = dailyStats.find(s => s.activity_date === new Date().toISOString().split('T')[0]) || {
      id: '',
      user_id: userId,
      activity_date: new Date().toISOString().split('T')[0],
      dreams_logged: 0,
      moods_logged: 0,
      journals_written: 0,
      life_events_added: 0,
      chat_messages_sent: 0,
      avg_dream_length: 0,
      avg_mood_score: null,
      time_spent_minutes: 0,
      features_used: [],
      xp_earned: 0,
      created_at: new Date().toISOString()
    }

    const thisWeek = dailyStats.slice(0, 7)
    const totalThisWeek = thisWeek.reduce(
      (acc, stat) => ({
        dreams: acc.dreams + stat.dreams_logged,
        moods: acc.moods + stat.moods_logged,
        journals: acc.journals + stat.journals_written,
        xp: acc.xp + stat.xp_earned
      }),
      { dreams: 0, moods: 0, journals: 0, xp: 0 }
    )

    const activitySummary = {
      today,
      this_week: thisWeek,
      total_this_week: totalThisWeek
    }

    // Build response
    const dashboard: GamificationDashboard = {
      streaks,
      level: levelProgress,
      recent_achievements: recentAchievements,
      active_goals: activeGoals,
      daily_activity: activitySummary,
      unviewed_achievements_count: unviewedCount
    }

    return NextResponse.json(dashboard)

  } catch (error: any) {
    console.error('Gamification dashboard error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch gamification dashboard' },
      { status: 500 }
    )
  }
}

// Helper functions
function getXPForPreviousLevel(currentLevel: number): number {
  let totalXP = 0
  for (let i = 1; i < currentLevel; i++) {
    totalXP += calculateXPForLevel(i)
  }
  return totalXP
}
