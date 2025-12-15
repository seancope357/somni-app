// Gamification System TypeScript Types
// Corresponds to supabase-gamification-migration.sql

// ============================================================================
// STREAKS
// ============================================================================
export interface UserStreak {
  id: string
  user_id: string

  // Dream logging streaks
  current_dream_streak: number
  longest_dream_streak: number
  last_dream_date: string | null

  // Mood logging streaks
  current_mood_streak: number
  longest_mood_streak: number
  last_mood_date: string | null

  // Sleep logging streaks
  current_sleep_streak: number
  longest_sleep_streak: number
  last_sleep_date: string | null

  // Combined wellness streak
  current_wellness_streak: number
  longest_wellness_streak: number
  last_wellness_date: string | null

  // Streak freezes
  streak_freezes_available: number
  streak_freezes_used: number

  created_at: string
  updated_at: string
}

export type StreakType = 'dream' | 'mood' | 'sleep' | 'wellness'

export interface StreakUpdate {
  type: StreakType
  date: string // YYYY-MM-DD
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================
export type AchievementCategory = 'beginner' | 'consistency' | 'volume' | 'quality' | 'insight' | 'special'
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  tier: AchievementTier
  xp_reward: number
  criteria: AchievementCriteria
  sort_order: number
  is_hidden: boolean
  is_active: boolean
  created_at: string
}

export interface AchievementCriteria {
  type: 'dream_count' | 'mood_count' | 'journal_count' | 'chat_count' | 'sleep_count' |
        'streak' | 'dream_length' | 'perspectives_viewed' | 'dream_link_created' |
        'pattern_discovered' | 'similar_dreams_found' | 'weekly_summary_viewed' |
        'time_based' | 'perfect_week' | 'features_used' | 'onboarding_complete' |
        'sleep_score' | 'sleep_debt_free' | 'sleep_a_grade'
  threshold?: number
  category?: StreakType
  start?: string
  end?: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  is_viewed: boolean

  // Joined data from achievements table
  achievement?: Achievement
}

export interface AchievementUnlock {
  achievement: Achievement
  just_unlocked: boolean
  progress?: number // 0-100 percentage
}

// ============================================================================
// GOALS
// ============================================================================
export type GoalType = 'dream_count' | 'mood_count' | 'journal_count' | 'sleep_count' | 'custom'
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'custom'
export type GoalStatus = 'active' | 'completed' | 'failed' | 'abandoned'

export interface UserGoal {
  id: string
  user_id: string
  goal_type: GoalType
  target_value: number
  current_value: number
  period: GoalPeriod
  start_date: string
  end_date: string
  status: GoalStatus
  completed_at: string | null
  title: string
  description: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface GoalProgress {
  goal: UserGoal
  progress_percentage: number
  days_remaining: number
  is_on_track: boolean
  daily_target?: number
}

// ============================================================================
// XP & LEVELS
// ============================================================================
export interface UserLevel {
  id: string
  user_id: string
  total_xp: number
  current_level: number
  xp_to_next_level: number
  current_title: string
  created_at: string
  updated_at: string
}

export interface LevelProgress {
  current_level: number
  current_xp: number
  xp_to_next_level: number
  progress_percentage: number
  current_title: string
  next_title: string
}

export interface XPEvent {
  amount: number
  source: string
  description: string
}

// ============================================================================
// DAILY ACTIVITY
// ============================================================================
export interface DailyActivityStats {
  id: string
  user_id: string
  activity_date: string
  dreams_logged: number
  moods_logged: number
  sleep_logs_logged: number
  journals_written: number
  life_events_added: number
  chat_messages_sent: number
  avg_dream_length: number
  avg_mood_score: number | null
  time_spent_minutes: number
  features_used: string[]
  xp_earned: number
  created_at: string
}

export interface ActivitySummary {
  today: DailyActivityStats
  this_week: DailyActivityStats[]
  total_this_week: {
    dreams: number
    moods: number
    journals: number
    xp: number
  }
}

// ============================================================================
// WEEKLY SUMMARIES
// ============================================================================
export interface WeeklySummary {
  id: string
  user_id: string
  week_start_date: string
  week_end_date: string
  total_dreams: number
  total_moods: number
  total_journals: number
  total_xp_earned: number
  most_common_emotion: string | null
  most_active_day: string | null
  completion_rate: number
  ai_summary: string | null
  is_viewed: boolean
  created_at: string
}

// ============================================================================
// COMPOSITE TYPES (for API responses)
// ============================================================================
export interface GamificationDashboard {
  streaks: UserStreak
  level: LevelProgress
  recent_achievements: AchievementUnlock[]
  active_goals: GoalProgress[]
  daily_activity: ActivitySummary
  unviewed_achievements_count: number
}

export interface AchievementCheck {
  newly_unlocked: Achievement[]
  xp_gained: number
  level_up: boolean
  new_level?: number
}

// ============================================================================
// HELPER TYPES
// ============================================================================
export interface StreakBreakWarning {
  streak_type: StreakType
  current_streak: number
  hours_until_break: number
  can_use_freeze: boolean
}

export interface CelebrationEvent {
  type: 'achievement' | 'level_up' | 'streak_milestone' | 'goal_completed'
  title: string
  description: string
  icon: string
  animation: 'confetti' | 'fireworks' | 'glow' | 'pulse'
  xp_reward?: number
}

// ============================================================================
// TIER COLORS & ICONS (for UI)
// ============================================================================
export const TIER_COLORS: Record<AchievementTier, { bg: string; text: string; border: string }> = {
  bronze: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300'
  },
  silver: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300'
  },
  gold: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300'
  },
  platinum: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300'
  },
  legendary: {
    bg: 'bg-gradient-to-br from-purple-100 to-pink-100',
    text: 'text-purple-900',
    border: 'border-purple-500'
  }
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  beginner: 'Getting Started',
  consistency: 'Consistency',
  volume: 'Dedication',
  quality: 'Quality',
  insight: 'Discovery',
  special: 'Special'
}

// ============================================================================
// XP REWARD CONSTANTS
// ============================================================================
export const XP_REWARDS = {
  DREAM_LOGGED: 10,
  MOOD_LOGGED: 5,
  SLEEP_LOGGED: 10,
  JOURNAL_ENTRY: 15,
  LIFE_EVENT_ADDED: 10,
  CHAT_MESSAGE: 2,
  GOAL_COMPLETED: 50,
  STREAK_MILESTONE: 25, // per milestone day
  DETAILED_DREAM: 20, // 500+ words
  LINKED_EVENT: 10,
  VIEWED_ALL_PERSPECTIVES: 15
} as const
