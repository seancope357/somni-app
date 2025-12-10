// Gamification System Utility Functions
// Core business logic for XP, achievements, streaks, and levels

import { createClient } from '@supabase/supabase-js'
import type {
  Achievement,
  AchievementCheck,
  UserStreak,
  StreakType,
  UserLevel,
  XPEvent,
  CelebrationEvent,
  AchievementCriteria
} from '@/types/gamification'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// XP & LEVELING
// ============================================================================

/**
 * Calculate XP required for a specific level (exponential curve)
 */
export function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

/**
 * Get title for a specific level
 */
export function getTitleForLevel(level: number): string {
  if (level < 5) return 'Dream Novice'
  if (level < 10) return 'Dream Seeker'
  if (level < 20) return 'Dream Explorer'
  if (level < 30) return 'Dream Interpreter'
  if (level < 40) return 'Dream Sage'
  if (level < 50) return 'Dream Master'
  return 'Dream Legend'
}

/**
 * Award XP to a user and handle level-ups
 */
export async function awardXP(
  userId: string,
  amount: number,
  source: string
): Promise<{ level_up: boolean; new_level?: number; celebration?: CelebrationEvent }> {
  // Get or create user level record
  let { data: userLevel } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!userLevel) {
    // Initialize new user
    const { data: newLevel } = await supabase
      .from('user_levels')
      .insert({
        user_id: userId,
        total_xp: amount,
        current_level: 1,
        xp_to_next_level: calculateXPForLevel(1),
        current_title: getTitleForLevel(1)
      })
      .select()
      .single()

    userLevel = newLevel!
    return { level_up: false }
  }

  // Add XP
  const newTotalXP = userLevel.total_xp + amount
  let currentLevel = userLevel.current_level
  let xpForNextLevel = userLevel.xp_to_next_level
  let leveledUp = false
  let levelsGained = 0

  // Check for level-ups (can level up multiple times)
  while (newTotalXP >= xpForNextLevel) {
    currentLevel++
    levelsGained++
    xpForNextLevel += calculateXPForLevel(currentLevel)
    leveledUp = true
  }

  const newTitle = getTitleForLevel(currentLevel)

  // Update database
  await supabase
    .from('user_levels')
    .update({
      total_xp: newTotalXP,
      current_level: currentLevel,
      xp_to_next_level: xpForNextLevel,
      current_title: newTitle
    })
    .eq('user_id', userId)

  // Update daily stats
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('daily_activity_stats')
    .upsert({
      user_id: userId,
      activity_date: today,
      xp_earned: supabase.sql`xp_earned + ${amount}`
    }, {
      onConflict: 'user_id,activity_date'
    })

  if (leveledUp) {
    return {
      level_up: true,
      new_level: currentLevel,
      celebration: {
        type: 'level_up',
        title: `Level ${currentLevel}!`,
        description: `You're now a ${newTitle}`,
        icon: '⭐',
        animation: 'fireworks'
      }
    }
  }

  return { level_up: false }
}

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

/**
 * Update streak for a user after logging activity
 */
export async function updateStreak(
  userId: string,
  type: StreakType,
  activityDate: string
): Promise<{ streak: number; milestone: boolean; xp_awarded?: number }> {
  // Get or create streak record
  let { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!streak) {
    // Initialize new streak record
    const { data: newStreak } = await supabase
      .from('user_streaks')
      .insert({
        user_id: userId,
        current_dream_streak: type === 'dream' ? 1 : 0,
        longest_dream_streak: type === 'dream' ? 1 : 0,
        last_dream_date: type === 'dream' ? activityDate : null,
        current_mood_streak: type === 'mood' ? 1 : 0,
        longest_mood_streak: type === 'mood' ? 1 : 0,
        last_mood_date: type === 'mood' ? activityDate : null,
        current_wellness_streak: 1,
        longest_wellness_streak: 1,
        last_wellness_date: activityDate
      })
      .select()
      .single()

    return { streak: 1, milestone: false }
  }

  const yesterday = new Date(activityDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const updates: any = {}
  let currentStreak = 0
  let isMilestone = false

  // Update specific streak type
  if (type === 'dream') {
    const lastDate = streak.last_dream_date
    if (lastDate === activityDate) {
      // Already logged today
      return { streak: streak.current_dream_streak, milestone: false }
    } else if (lastDate === yesterdayStr) {
      // Continuing streak
      currentStreak = streak.current_dream_streak + 1
      updates.current_dream_streak = currentStreak
      updates.longest_dream_streak = Math.max(currentStreak, streak.longest_dream_streak)
    } else {
      // Streak broken
      currentStreak = 1
      updates.current_dream_streak = 1
    }
    updates.last_dream_date = activityDate
  }

  if (type === 'mood') {
    const lastDate = streak.last_mood_date
    if (lastDate === activityDate) {
      return { streak: streak.current_mood_streak, milestone: false }
    } else if (lastDate === yesterdayStr) {
      currentStreak = streak.current_mood_streak + 1
      updates.current_mood_streak = currentStreak
      updates.longest_mood_streak = Math.max(currentStreak, streak.longest_mood_streak)
    } else {
      currentStreak = 1
      updates.current_mood_streak = 1
    }
    updates.last_mood_date = activityDate
  }

  // Always update wellness streak (dream OR mood)
  const lastWellness = streak.last_wellness_date
  if (lastWellness !== activityDate) {
    if (lastWellness === yesterdayStr) {
      const wellnessStreak = streak.current_wellness_streak + 1
      updates.current_wellness_streak = wellnessStreak
      updates.longest_wellness_streak = Math.max(wellnessStreak, streak.longest_wellness_streak)
      currentStreak = wellnessStreak

      // Check for milestone (multiples of 7, 30, etc.)
      if (wellnessStreak % 7 === 0 || wellnessStreak === 30 || wellnessStreak === 60 || wellnessStreak === 100) {
        isMilestone = true
      }
    } else {
      updates.current_wellness_streak = 1
      currentStreak = Math.max(currentStreak, 1)
    }
    updates.last_wellness_date = activityDate
  }

  // Update database
  await supabase
    .from('user_streaks')
    .update(updates)
    .eq('user_id', userId)

  // Award milestone XP
  let xpAwarded = 0
  if (isMilestone) {
    xpAwarded = 25
    await awardXP(userId, xpAwarded, `${currentStreak}-day streak milestone`)
  }

  return { streak: currentStreak, milestone: isMilestone, xp_awarded: xpAwarded }
}

// ============================================================================
// ACHIEVEMENT CHECKING
// ============================================================================

/**
 * Check if user qualifies for achievements based on criteria
 */
export async function checkAchievements(
  userId: string,
  triggerType?: string
): Promise<AchievementCheck> {
  // Get all active achievements
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (!allAchievements) {
    return { newly_unlocked: [], xp_gained: 0, level_up: false }
  }

  // Get user's already unlocked achievements
  const { data: unlockedAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const unlockedIds = new Set(unlockedAchievements?.map(a => a.achievement_id) || [])

  // Filter to achievements not yet unlocked
  const candidateAchievements = allAchievements.filter(a => !unlockedIds.has(a.id))

  // Check each candidate
  const newlyUnlocked: Achievement[] = []

  for (const achievement of candidateAchievements) {
    const qualifies = await checkAchievementCriteria(userId, achievement.criteria)
    if (qualifies) {
      // Unlock achievement
      await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          is_viewed: false
        })

      newlyUnlocked.push(achievement)
    }
  }

  // Award XP for newly unlocked achievements
  let totalXP = 0
  let leveledUp = false
  let newLevel: number | undefined

  for (const achievement of newlyUnlocked) {
    totalXP += achievement.xp_reward
  }

  if (totalXP > 0) {
    const result = await awardXP(userId, totalXP, 'Achievements unlocked')
    leveledUp = result.level_up
    newLevel = result.new_level
  }

  return {
    newly_unlocked: newlyUnlocked,
    xp_gained: totalXP,
    level_up: leveledUp,
    new_level: newLevel
  }
}

/**
 * Check if user meets criteria for a specific achievement
 */
async function checkAchievementCriteria(
  userId: string,
  criteria: AchievementCriteria
): Promise<boolean> {
  const { type, threshold, category } = criteria

  switch (type) {
    case 'dream_count': {
      const { count } = await supabase
        .from('dreams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      return (count || 0) >= (threshold || 0)
    }

    case 'mood_count': {
      const { count } = await supabase
        .from('mood_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      return (count || 0) >= (threshold || 0)
    }

    case 'journal_count': {
      const { count } = await supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      return (count || 0) >= (threshold || 0)
    }

    case 'streak': {
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!streak) return false

      if (category === 'dream') {
        return streak.current_dream_streak >= (threshold || 0)
      } else if (category === 'mood') {
        return streak.current_mood_streak >= (threshold || 0)
      } else if (category === 'wellness') {
        return streak.current_wellness_streak >= (threshold || 0)
      }
      return false
    }

    case 'onboarding_complete': {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('id')
        .eq('user_id', userId)
        .single()
      return !!onboarding
    }

    // Add more criteria checks as needed
    default:
      return false
  }
}

// ============================================================================
// GOAL MANAGEMENT
// ============================================================================

/**
 * Calculate progress for a goal
 */
export async function calculateGoalProgress(goalId: string): Promise<{
  current_value: number
  progress_percentage: number
  days_remaining: number
  is_on_track: boolean
}> {
  const { data: goal } = await supabase
    .from('user_goals')
    .select('*')
    .eq('id', goalId)
    .single()

  if (!goal) {
    throw new Error('Goal not found')
  }

  const today = new Date()
  const endDate = new Date(goal.end_date)
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const progressPercentage = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))

  // Calculate if on track
  const totalDays = Math.ceil(
    (new Date(goal.end_date).getTime() - new Date(goal.start_date).getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysElapsed = totalDays - daysRemaining
  const expectedProgress = daysElapsed > 0 ? (daysElapsed / totalDays) * 100 : 0
  const isOnTrack = progressPercentage >= expectedProgress * 0.8 // Within 80% of expected

  return {
    current_value: goal.current_value,
    progress_percentage: progressPercentage,
    days_remaining: daysRemaining,
    is_on_track: isOnTrack
  }
}

/**
 * Update goal progress after activity
 */
export async function updateGoalProgress(
  userId: string,
  goalType: 'dream_count' | 'mood_count' | 'journal_count',
  incrementBy: number = 1
): Promise<string[]> {
  // Get active goals of this type
  const { data: goals } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_type', goalType)
    .eq('status', 'active')

  if (!goals || goals.length === 0) return []

  const completedGoalIds: string[] = []

  for (const goal of goals) {
    const newValue = goal.current_value + incrementBy

    // Check if goal is now completed
    if (newValue >= goal.target_value && goal.status === 'active') {
      await supabase
        .from('user_goals')
        .update({
          current_value: newValue,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', goal.id)

      completedGoalIds.push(goal.id)

      // Award XP for goal completion
      await awardXP(userId, 50, `Goal completed: ${goal.title}`)
    } else {
      await supabase
        .from('user_goals')
        .update({ current_value: newValue })
        .eq('id', goal.id)
    }
  }

  return completedGoalIds
}

// ============================================================================
// DAILY ACTIVITY TRACKING
// ============================================================================

/**
 * Update daily activity stats
 */
export async function updateDailyStats(
  userId: string,
  updates: {
    dreams_logged?: number
    moods_logged?: number
    journals_written?: number
    life_events_added?: number
    chat_messages_sent?: number
  }
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  // Get existing stats for today
  const { data: existing } = await supabase
    .from('daily_activity_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .single()

  if (existing) {
    // Update existing record
    const updateData: any = {}
    if (updates.dreams_logged) {
      updateData.dreams_logged = existing.dreams_logged + updates.dreams_logged
    }
    if (updates.moods_logged) {
      updateData.moods_logged = existing.moods_logged + updates.moods_logged
    }
    if (updates.journals_written) {
      updateData.journals_written = existing.journals_written + updates.journals_written
    }
    if (updates.life_events_added) {
      updateData.life_events_added = existing.life_events_added + updates.life_events_added
    }
    if (updates.chat_messages_sent) {
      updateData.chat_messages_sent = existing.chat_messages_sent + updates.chat_messages_sent
    }

    await supabase
      .from('daily_activity_stats')
      .update(updateData)
      .eq('user_id', userId)
      .eq('activity_date', today)
  } else {
    // Create new record
    await supabase
      .from('daily_activity_stats')
      .insert({
        user_id: userId,
        activity_date: today,
        dreams_logged: updates.dreams_logged || 0,
        moods_logged: updates.moods_logged || 0,
        journals_written: updates.journals_written || 0,
        life_events_added: updates.life_events_added || 0,
        chat_messages_sent: updates.chat_messages_sent || 0,
        xp_earned: 0
      })
  }
}
