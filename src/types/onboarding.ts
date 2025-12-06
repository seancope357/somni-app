// Onboarding data types for DREAMONEIR

export interface OnboardingData {
  id?: string
  user_id?: string

  // Basic info
  preferred_name?: string
  communication_style?: 'direct' | 'gentle' | 'balanced'

  // Goals and motivations
  primary_goals?: string[]
  primary_goal_other?: string

  // Sleep and dream patterns
  sleep_schedule?: 'regular' | 'irregular' | 'shift-work'
  typical_sleep_hours?: number
  sleep_quality?: 'excellent' | 'good' | 'fair' | 'poor'
  dream_recall_frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | 'always'
  dream_types?: string[]
  recurring_themes?: string[]
  recurring_symbols?: string[]

  // Psychological perspective preferences
  preferred_perspectives?: string[]
  perspective_interest_level?: 'very-interested' | 'somewhat-interested' | 'not-interested'

  // Life context (optional)
  current_life_context?: string
  major_life_events?: string[]
  relationship_status?: 'single' | 'partnered' | 'married' | 'complicated' | 'prefer-not-to-say'
  work_situation?: 'employed' | 'student' | 'unemployed' | 'retired' | 'other'

  // Emotional processing
  emotional_processing_style?: string[]
  stress_level?: 'low' | 'moderate' | 'high' | 'very-high'
  primary_stressors?: string[]

  // Safety and boundaries
  topics_to_avoid?: string[]
  comfort_with_depth?: 'surface' | 'moderate' | 'deep'

  // Mental health context (optional, sensitive)
  mental_health_context?: string
  therapy_experience?: boolean
  meditation_practice?: boolean

  // Notification preferences
  notification_preference?: 'immediate' | 'daily-summary' | 'weekly-report' | 'none'
  privacy_level?: 'private' | 'anonymous-insights' | 'community-sharing'

  // Metadata
  completed?: boolean
  completed_at?: string
  evaluation_notes?: string
  flags_for_followup?: string[]

  created_at?: string
  updated_at?: string
}

export type OnboardingStep =
  | 'welcome'
  | 'name-goals'
  | 'sleep-patterns'
  | 'dream-recall'
  | 'perspectives'
  | 'life-context'
  | 'emotional-processing'
  | 'boundaries'
  | 'preferences'
  | 'complete'

export interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
  step?: OnboardingStep
  timestamp: number
}
