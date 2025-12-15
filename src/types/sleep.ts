// Sleep Tracking System TypeScript Types
// Corresponds to sleep score feature specification and database schema
// Based on research from NSF Sleep Health Index, PSQI, and wearable device algorithms

// ============================================================================
// DATABASE TYPES (matching Supabase schema)
// ============================================================================

/**
 * Daily sleep score record
 * Corresponds to sleep_scores table
 */
export interface SleepScore {
  id: string
  user_id: string
  score_date: string // YYYY-MM-DD format

  // Overall score (0-100)
  total_score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

  // Component scores (0-100 each)
  duration_score: number
  consistency_score: number
  quality_score: number

  // Raw metrics
  sleep_hours: number
  consistency_std_dev: number | null
  energy_level: number | null // 1-5 scale from mood logs
  stress_level: number | null // 1-5 scale from mood logs

  // Calculated insights
  sleep_deficit_hours: number | null // Difference from optimal 8hrs
  is_optimal_range: boolean // True if 7-9 hours

  // Metadata & relations
  dream_id: string | null
  mood_log_id: string | null
  calculation_version: string

  created_at: string
  updated_at: string
}

/**
 * Weekly sleep summary aggregation
 * Corresponds to weekly_sleep_summaries table
 */
export interface WeeklySleepSummary {
  id: string
  user_id: string
  week_start_date: string // YYYY-MM-DD (Monday)
  week_end_date: string // YYYY-MM-DD (Sunday)

  // Aggregate scores
  avg_total_score: number
  avg_duration_hours: number
  avg_quality_score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

  // Sleep debt tracking
  total_sleep_debt: number
  debt_severity: 'none' | 'mild' | 'moderate' | 'severe'

  // Pattern insights
  most_consistent_metric: 'duration' | 'quality' | 'timing' | null
  worst_night_date: string | null
  best_night_date: string | null
  nights_tracked: number

  // Trend analysis
  trend: 'improving' | 'stable' | 'declining'
  trend_direction: number // +1, 0, -1

  // AI-generated insights
  ai_summary: string | null
  recommendations: string[]

  created_at: string
}

/**
 * Personalized sleep insight or recommendation
 * Corresponds to sleep_insights table
 */
export interface SleepInsight {
  id: string
  user_id: string
  insight_date: string // YYYY-MM-DD

  // Insight metadata
  insight_type: 'pattern' | 'recommendation' | 'achievement' | 'warning'
  category: 'duration' | 'consistency' | 'quality' | 'debt'
  priority: number // 1-5, where 5 is highest priority

  // Content
  title: string
  message: string
  action_items: string[]

  // Display control
  is_viewed: boolean
  is_dismissed: boolean
  expires_at: string | null

  created_at: string
}

// ============================================================================
// CALCULATION & ANALYSIS TYPES
// ============================================================================

/**
 * Sleep debt metrics for tracking cumulative deficit
 */
export interface SleepDebtMetrics {
  total_debt_hours: number // Cumulative deficit from optimal
  debt_per_night: number // Average nightly deficit
  recovery_nights_needed: number // Estimated nights to recover
  severity: 'none' | 'mild' | 'moderate' | 'severe'
}

/**
 * Detected sleep pattern (recurring trends)
 */
export interface SleepPattern {
  pattern_type: 'weekday_vs_weekend' | 'consistency_trend' | 'quality_decline' | 'debt_accumulation' | 'improvement_streak'
  description: string
  detected_at: string // Date when pattern was detected
  confidence: number // 0-100
  data_points: number // Number of nights analyzed
  recommendation: string
}

/**
 * Factor affecting sleep quality
 */
export type SleepFactor =
  | 'stress'
  | 'caffeine'
  | 'exercise'
  | 'screen_time'
  | 'alcohol'
  | 'sleep_environment'
  | 'schedule_changes'
  | 'mood'
  | 'life_events'

/**
 * Correlation analysis result between sleep and other metrics
 */
export interface SleepCorrelation {
  factor: SleepFactor | string // Can be custom factors
  correlation_coefficient: number // -1 to 1
  significance: 'strong' | 'moderate' | 'weak' | 'none'
  direction: 'positive' | 'negative' | 'neutral'
  sample_size: number
  insights: string[]
}

/**
 * Comprehensive sleep analytics response
 */
export interface SleepAnalytics {
  // Summary statistics
  summary: {
    avg_score: number
    avg_duration: number
    avg_quality: number
    nights_tracked: number
    current_grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
    optimal_range_adherence: number // Percentage of nights in 7-9hr range
  }

  // Trends over time
  trends: {
    score_trend: { date: string; score: number }[]
    duration_trend: { date: string; hours: number }[]
    quality_trend: { date: string; score: number }[]
    consistency_over_time: { date: string; std_dev: number }[]
  }

  // Sleep debt tracking
  debt: SleepDebtMetrics

  // Pattern detection
  patterns: SleepPattern[]

  // Correlations with other metrics
  correlations: SleepCorrelation[]

  // Best and worst nights
  best_night: SleepScore | null
  worst_night: SleepScore | null

  // Day of week analysis
  day_of_week_stats: {
    day: string
    avg_score: number
    avg_duration: number
    count: number
  }[]
}

// ============================================================================
// INPUT TYPES (for API requests)
// ============================================================================

/**
 * Input for calculating/creating a new sleep score
 */
export interface CreateSleepScoreInput {
  userId: string
  date: string // YYYY-MM-DD
  dreamId?: string // Optional: link to specific dream
  forceRecalculate?: boolean // Recalculate even if exists
}

/**
 * Input for updating an existing sleep score
 */
export interface UpdateSleepScoreInput {
  scoreId: string
  userId: string

  // Optional fields that can be updated
  energy_level?: number
  stress_level?: number
  sleep_hours?: number

  // Flag to trigger recalculation
  recalculate?: boolean
}

/**
 * Input for calculating weekly summary
 */
export interface CreateWeeklySummaryInput {
  userId: string
  weekStartDate: string // Monday of the week (YYYY-MM-DD)
}

/**
 * Input for generating sleep insights
 */
export interface GenerateInsightInput {
  userId: string
  insightType?: 'pattern' | 'recommendation' | 'achievement' | 'warning'
  lookbackDays?: number // How many days to analyze (default: 30)
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response from sleep score calculation endpoint
 */
export interface CalculateSleepScoreResponse {
  score: SleepScore
  insights: string[]
  xp_awarded?: number
  achievement_unlocked?: {
    id: string
    name: string
    description: string
    icon: string
  }
}

/**
 * Response from sleep score history endpoint
 */
export interface SleepScoreHistoryResponse {
  scores: SleepScore[]
  summary: {
    avg_score: number
    avg_duration: number
    nights_tracked: number
    current_streak: number
    best_night: SleepScore | null
    worst_night: SleepScore | null
  }
}

/**
 * Response from weekly summary endpoint
 */
export interface WeeklySummaryResponse {
  summary: WeeklySleepSummary
  daily_breakdown: SleepScore[]
  sleep_debt: SleepDebtMetrics
  recommendations: string[]
}

/**
 * Response from insights endpoint
 */
export interface SleepInsightsResponse {
  insights: SleepInsight[]
  unviewed_count: number
}

/**
 * Response from trends analysis endpoint
 */
export interface SleepTrendsResponse {
  period: string
  analytics: SleepAnalytics
  pattern_insights: {
    best_day_of_week: string
    worst_day_of_week: string
    weekend_vs_weekday: {
      weekend_avg: number
      weekday_avg: number
      difference: number
    }
    monthly_variance: number
  }
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Props for sleep score card component
 */
export interface SleepScoreCardProps {
  score: SleepScore
  size?: 'compact' | 'full'
  showDetails?: boolean
  onViewDetails?: () => void
}

/**
 * Props for sleep trend chart component
 */
export interface SleepTrendChartProps {
  scores: SleepScore[]
  metric: 'total_score' | 'duration' | 'quality' | 'consistency'
  timeRange: 'week' | 'month' | 'quarter' | 'year'
  showGoalLine?: boolean
}

/**
 * Props for sleep insight card component
 */
export interface SleepInsightCardProps {
  insight: SleepInsight
  onView: (insightId: string) => void
  onDismiss: (insightId: string) => void
  onActionClick?: (action: string) => void
}

/**
 * Props for sleep dashboard component
 */
export interface SleepDashboardProps {
  userId: string
  onNavigateToDream?: (dreamId: string) => void
  onViewWeeklySummary?: (weekStartDate: string) => void
}

// ============================================================================
// HELPER TYPES & CONSTANTS
// ============================================================================

/**
 * Sleep score grade with metadata
 */
export interface SleepGrade {
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
  color: string
  description: string
  scoreRange: { min: number; max: number }
}

/**
 * Sleep quality category
 */
export type SleepQualityCategory = 'exceptional' | 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

/**
 * Time period for analytics
 */
export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year' | 'all-time'

/**
 * Metric type for charts and analysis
 */
export type SleepMetric = 'total_score' | 'duration_score' | 'consistency_score' | 'quality_score' | 'sleep_hours'

/**
 * Trend direction
 */
export type TrendDirection = 'improving' | 'stable' | 'declining'

// ============================================================================
// GRADE METADATA (for UI display)
// ============================================================================

export const SLEEP_GRADES: Record<SleepGrade['grade'], SleepGrade> = {
  S: {
    grade: 'S',
    label: 'Exceptional',
    color: 'text-purple-500',
    description: 'Outstanding sleep health',
    scoreRange: { min: 90, max: 100 }
  },
  A: {
    grade: 'A',
    label: 'Excellent',
    color: 'text-green-500',
    description: 'Excellent sleep quality',
    scoreRange: { min: 80, max: 89 }
  },
  B: {
    grade: 'B',
    label: 'Good',
    color: 'text-blue-500',
    description: 'Good sleep patterns',
    scoreRange: { min: 70, max: 79 }
  },
  C: {
    grade: 'C',
    label: 'Fair',
    color: 'text-yellow-500',
    description: 'Adequate but could improve',
    scoreRange: { min: 60, max: 69 }
  },
  D: {
    grade: 'D',
    label: 'Poor',
    color: 'text-orange-500',
    description: 'Needs attention',
    scoreRange: { min: 50, max: 59 }
  },
  F: {
    grade: 'F',
    label: 'Critical',
    color: 'text-red-500',
    description: 'Requires immediate action',
    scoreRange: { min: 0, max: 49 }
  }
}

// ============================================================================
// OPTIMAL RANGES (based on sleep science research)
// ============================================================================

export const OPTIMAL_SLEEP_RANGES = {
  DURATION: {
    MIN: 7,
    MAX: 9,
    OPTIMAL: 8,
    CRITICAL_MIN: 4,
    CRITICAL_MAX: 12
  },
  ENERGY: {
    MIN: 1,
    MAX: 5,
    OPTIMAL: 4
  },
  STRESS: {
    MIN: 1,
    MAX: 5,
    OPTIMAL: 2
  },
  CONSISTENCY_STD_DEV: {
    PERFECT: 0.5,
    EXCELLENT: 1.0,
    GOOD: 1.5,
    FAIR: 2.0
  }
} as const

// ============================================================================
// SCORE WEIGHTS (for calculation)
// ============================================================================

export const SCORE_WEIGHTS = {
  DURATION: 0.40,
  CONSISTENCY: 0.30,
  QUALITY: 0.30
} as const

// ============================================================================
// GAMIFICATION INTEGRATION
// ============================================================================

/**
 * XP rewards for sleep-related activities
 */
export const SLEEP_XP_REWARDS = {
  SCORE_S: 20,
  SCORE_A: 15,
  SCORE_B: 10,
  SCORE_C: 5,
  OPTIMAL_RANGE: 10,
  CONSISTENCY_BONUS: 15,
  PERFECT_WEEK: 50,
  DEBT_FREE_WEEK: 30
} as const

/**
 * Sleep-related achievement codes
 */
export type SleepAchievementCode =
  | 'SLEEP_PERFECT_WEEK'
  | 'SLEEP_100_NIGHTS'
  | 'SLEEP_PERFECT_SCORE'
  | 'SLEEP_DEBT_FREE'
  | 'SLEEP_CONSISTENCY_MASTER'
  | 'SLEEP_EARLY_BIRD'
  | 'SLEEP_CHAMPION'

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * User sleep tracking preferences
 */
export interface SleepPreferences {
  target_sleep_hours: number // Default: 8
  bedtime_reminder: boolean // Default: false
  reminder_time: string | null // HH:MM format
  show_sleep_score_on_home: boolean // Default: true
  score_notifications: boolean // Default: true
  preferred_metric: SleepMetric // Default: 'total_score'
  goal_grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' // Default: 'A'
}

// ============================================================================
// FILTERS & SORTING
// ============================================================================

/**
 * Filter options for sleep score history
 */
export interface SleepScoreFilters {
  dateRange?: { from: string; to: string }
  gradeFilter?: ('S' | 'A' | 'B' | 'C' | 'D' | 'F')[]
  minScore?: number
  maxScore?: number
  minDuration?: number
  maxDuration?: number
  hasLinkedMood?: boolean
  sortBy?: 'date-asc' | 'date-desc' | 'score-asc' | 'score-desc' | 'duration-asc' | 'duration-desc'
}

/**
 * Sort options for sleep scores
 */
export type SleepScoreSortOption =
  | 'date-asc'
  | 'date-desc'
  | 'score-asc'
  | 'score-desc'
  | 'duration-asc'
  | 'duration-desc'
