-- ============================================================================
-- DREAMONEIR / SOMNI - COMPLETE SUPABASE MIGRATION
-- ============================================================================
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Safe to run multiple times - uses IF NOT EXISTS checks
-- ============================================================================

-- ============================================================================
-- PART 1: Multi-Perspective Dream Analysis Fields
-- ============================================================================
-- Adds support for Jungian, Freudian, and Cognitive/Evolutionary perspectives

ALTER TABLE dreams
ADD COLUMN IF NOT EXISTS jungian_analysis TEXT,
ADD COLUMN IF NOT EXISTS freudian_analysis TEXT,
ADD COLUMN IF NOT EXISTS cognitive_analysis TEXT,
ADD COLUMN IF NOT EXISTS synthesized_analysis TEXT,
ADD COLUMN IF NOT EXISTS archetypal_figures TEXT[],
ADD COLUMN IF NOT EXISTS cognitive_patterns TEXT[],
ADD COLUMN IF NOT EXISTS wish_indicators TEXT[],
ADD COLUMN IF NOT EXISTS reflection_questions TEXT[];

-- Add indexes for improved query performance on array columns
CREATE INDEX IF NOT EXISTS idx_dreams_archetypal_figures ON dreams USING GIN(archetypal_figures);
CREATE INDEX IF NOT EXISTS idx_dreams_cognitive_patterns ON dreams USING GIN(cognitive_patterns);
CREATE INDEX IF NOT EXISTS idx_dreams_wish_indicators ON dreams USING GIN(wish_indicators);

-- Add comments to document the new columns
COMMENT ON COLUMN dreams.jungian_analysis IS 'Jungian perspective interpretation focusing on archetypes, collective unconscious, and individuation';
COMMENT ON COLUMN dreams.freudian_analysis IS 'Freudian perspective interpretation focusing on wish fulfillment and unconscious conflicts';
COMMENT ON COLUMN dreams.cognitive_analysis IS 'Cognitive/Evolutionary perspective interpretation focusing on continuity and threat simulation';
COMMENT ON COLUMN dreams.synthesized_analysis IS 'Integrated multi-perspective interpretation with practical insights';
COMMENT ON COLUMN dreams.archetypal_figures IS 'Jungian archetypal figures identified in dream (e.g., Shadow, Anima, Wise Old Man)';
COMMENT ON COLUMN dreams.cognitive_patterns IS 'Cognitive patterns and schemas identified in dream content';
COMMENT ON COLUMN dreams.wish_indicators IS 'Potential Freudian wish fulfillment elements and repressed desires';
COMMENT ON COLUMN dreams.reflection_questions IS 'Questions for deeper reflection and exploration';

-- ============================================================================
-- PART 2: Chat History Feature
-- ============================================================================

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dream_id UUID REFERENCES dreams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_dream_id ON chat_conversations(dream_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- Enable Row Level Security
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
CREATE POLICY "Users can view their own conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON chat_conversations;
CREATE POLICY "Users can create their own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON chat_conversations;
CREATE POLICY "Users can update their own conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON chat_conversations;
CREATE POLICY "Users can delete their own conversations"
  ON chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON chat_messages;
CREATE POLICY "Users can create messages in their conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON chat_messages;
CREATE POLICY "Users can delete messages in their conversations"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when messages are added
DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_conversation_timestamp();

-- ============================================================================
-- PART 3: Weekly Digests
-- ============================================================================

-- Create weekly_digests table
CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Date range for this digest
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,

  -- AI-generated content
  summary text NOT NULL,
  pattern_trends jsonb,
  mood_insights jsonb,
  goal_progress jsonb,
  reflection_prompts text[],

  -- Statistics
  total_dreams integer DEFAULT 0,
  total_journal_entries integer DEFAULT 0,
  average_mood float,
  average_sleep_hours float,
  top_symbols text[],
  top_emotions text[],
  top_themes text[],

  -- Metadata
  generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  viewed boolean DEFAULT false,
  viewed_at timestamp with time zone,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS weekly_digests_user_id_idx ON public.weekly_digests(user_id);
CREATE INDEX IF NOT EXISTS weekly_digests_week_start_idx ON public.weekly_digests(week_start_date DESC);
CREATE INDEX IF NOT EXISTS weekly_digests_viewed_idx ON public.weekly_digests(viewed);

-- Add unique constraint to prevent duplicate digests for same week
CREATE UNIQUE INDEX IF NOT EXISTS weekly_digests_user_week_idx
  ON public.weekly_digests(user_id, week_start_date);

-- Enable RLS
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own digests." ON public.weekly_digests;
CREATE POLICY "Users can view own digests."
  ON public.weekly_digests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own digests." ON public.weekly_digests;
CREATE POLICY "Users can insert own digests."
  ON public.weekly_digests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own digests." ON public.weekly_digests;
CREATE POLICY "Users can update own digests."
  ON public.weekly_digests FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own digests." ON public.weekly_digests;
CREATE POLICY "Users can delete own digests."
  ON public.weekly_digests FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: Onboarding System
-- ============================================================================

-- Create user_onboarding table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Basic info
  preferred_name text,
  communication_style text,

  -- Goals and motivations
  primary_goals text[],
  primary_goal_other text,

  -- Sleep and dream patterns
  sleep_schedule text,
  typical_sleep_hours float,
  sleep_quality text,
  dream_recall_frequency text,
  dream_types text[],
  recurring_themes text[],
  recurring_symbols text[],

  -- Psychological perspective preferences
  preferred_perspectives text[],
  perspective_interest_level text,

  -- Life context (optional)
  current_life_context text,
  major_life_events text[],
  relationship_status text,
  work_situation text,

  -- Emotional processing
  emotional_processing_style text[],
  stress_level text,
  primary_stressors text[],

  -- Safety and boundaries
  topics_to_avoid text[],
  comfort_with_depth text,

  -- Mental health context (optional, sensitive)
  mental_health_context text,
  therapy_experience boolean,
  meditation_practice boolean,

  -- Notification preferences
  notification_preference text,
  privacy_level text,

  -- Metadata
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  evaluation_notes text,
  flags_for_followup text[],

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_onboarding_user_id_idx ON public.user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS user_onboarding_completed_idx ON public.user_onboarding(completed);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own onboarding." ON public.user_onboarding;
CREATE POLICY "Users can view own onboarding."
  ON public.user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding." ON public.user_onboarding;
CREATE POLICY "Users can insert own onboarding."
  ON public.user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding." ON public.user_onboarding;
CREATE POLICY "Users can update own onboarding."
  ON public.user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own onboarding." ON public.user_onboarding;
CREATE POLICY "Users can delete own onboarding."
  ON public.user_onboarding FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_user_onboarding_updated_at();

-- Add onboarding_completed flag to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create index on profiles.onboarding_completed
CREATE INDEX IF NOT EXISTS profiles_onboarding_completed_idx ON public.profiles(onboarding_completed);

-- ============================================================================
-- PART 5: Gamification System
-- ============================================================================

-- User Streaks Table
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  current_dream_streak INTEGER DEFAULT 0,
  longest_dream_streak INTEGER DEFAULT 0,
  last_dream_date DATE,

  current_mood_streak INTEGER DEFAULT 0,
  longest_mood_streak INTEGER DEFAULT 0,
  last_mood_date DATE,

  current_wellness_streak INTEGER DEFAULT 0,
  longest_wellness_streak INTEGER DEFAULT 0,
  last_wellness_date DATE,

  streak_freezes_available INTEGER DEFAULT 0,
  streak_freezes_used INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Achievements Table (Master list)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,

  category VARCHAR(50) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  xp_reward INTEGER DEFAULT 0,

  criteria JSONB NOT NULL,

  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_viewed BOOLEAN DEFAULT FALSE,

  UNIQUE(user_id, achievement_id)
);

-- User Goals Table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  goal_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,

  period VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status VARCHAR(20) DEFAULT 'active',
  completed_at TIMESTAMP WITH TIME ZONE,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User XP & Levels Table
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  xp_to_next_level INTEGER DEFAULT 100,

  current_title VARCHAR(100) DEFAULT 'Dream Novice',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Daily Activity Stats
CREATE TABLE IF NOT EXISTS daily_activity_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,

  dreams_logged INTEGER DEFAULT 0,
  moods_logged INTEGER DEFAULT 0,
  journals_written INTEGER DEFAULT 0,
  life_events_added INTEGER DEFAULT 0,
  chat_messages_sent INTEGER DEFAULT 0,

  avg_dream_length INTEGER DEFAULT 0,
  avg_mood_score DECIMAL(3,1),

  time_spent_minutes INTEGER DEFAULT 0,
  features_used TEXT[],

  xp_earned INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, activity_date)
);

-- Weekly Summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  total_dreams INTEGER DEFAULT 0,
  total_moods INTEGER DEFAULT 0,
  total_journals INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,

  most_common_emotion VARCHAR(100),
  most_active_day VARCHAR(20),
  completion_rate DECIMAL(5,2),

  ai_summary TEXT,

  is_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, week_start_date)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON achievements(tier);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id_status ON user_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_goals_end_date ON user_goals(end_date);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_activity_stats(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_id ON weekly_summaries(user_id, week_start_date DESC);

-- Row Level Security
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Streaks policies
DROP POLICY IF EXISTS "Users can view their own streaks" ON user_streaks;
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own streaks" ON user_streaks;
CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own streaks" ON user_streaks;
CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievements policies
DROP POLICY IF EXISTS "Anyone can view achievements catalog" ON achievements;
CREATE POLICY "Anyone can view achievements catalog"
  ON achievements FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users can view their own unlocked achievements" ON user_achievements;
CREATE POLICY "Users can view their own unlocked achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;
CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own achievements" ON user_achievements;
CREATE POLICY "Users can update their own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- Goals policies
DROP POLICY IF EXISTS "Users can view their own goals" ON user_goals;
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own goals" ON user_goals;
CREATE POLICY "Users can create their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON user_goals;
CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON user_goals;
CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Levels policies
DROP POLICY IF EXISTS "Users can view their own level" ON user_levels;
CREATE POLICY "Users can view their own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;
CREATE POLICY "Users can update their own level"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own level" ON user_levels;
CREATE POLICY "Users can insert their own level"
  ON user_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Daily stats policies
DROP POLICY IF EXISTS "Users can view their own daily stats" ON daily_activity_stats;
CREATE POLICY "Users can view their own daily stats"
  ON daily_activity_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily stats" ON daily_activity_stats;
CREATE POLICY "Users can insert their own daily stats"
  ON daily_activity_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily stats" ON daily_activity_stats;
CREATE POLICY "Users can update their own daily stats"
  ON daily_activity_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Weekly summaries policies
DROP POLICY IF EXISTS "Users can view their own weekly summaries" ON weekly_summaries;
CREATE POLICY "Users can view their own weekly summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Triggers for Auto-updating Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_streaks_updated_at ON user_streaks;
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_levels_updated_at ON user_levels;
CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed Data: Achievement Definitions
INSERT INTO achievements (code, name, description, icon, category, tier, xp_reward, criteria, sort_order) VALUES
-- BEGINNER ACHIEVEMENTS (Bronze)
('first_dream', 'Dream Awakening', 'Log your first dream', '🌅', 'beginner', 'bronze', 10, '{"type": "dream_count", "threshold": 1}', 1),
('first_mood', 'Mood Check', 'Log your first mood', '😊', 'beginner', 'bronze', 10, '{"type": "mood_count", "threshold": 1}', 2),
('first_journal', 'Pen to Paper', 'Write your first journal entry', '📝', 'beginner', 'bronze', 10, '{"type": "journal_count", "threshold": 1}', 3),
('first_chat', 'Conversation Starter', 'Have your first chat with Dream Explorer', '💬', 'beginner', 'bronze', 10, '{"type": "chat_count", "threshold": 1}', 4),
('onboarding_complete', 'Getting Settled', 'Complete your onboarding profile', '🎯', 'beginner', 'bronze', 50, '{"type": "onboarding_complete"}', 5),

-- CONSISTENCY ACHIEVEMENTS (Silver/Gold)
('streak_3', 'Three Days Strong', 'Maintain a 3-day wellness streak', '🔥', 'consistency', 'bronze', 30, '{"type": "streak", "category": "wellness", "threshold": 3}', 10),
('streak_7', 'Week Warrior', 'Maintain a 7-day wellness streak', '⚡', 'consistency', 'silver', 70, '{"type": "streak", "category": "wellness", "threshold": 7}', 11),
('streak_14', 'Fortnight Champion', 'Maintain a 14-day wellness streak', '💪', 'consistency', 'silver', 150, '{"type": "streak", "category": "wellness", "threshold": 14}', 12),
('streak_30', 'Monthly Dedication', 'Maintain a 30-day wellness streak', '🏆', 'consistency', 'gold', 300, '{"type": "streak", "category": "wellness", "threshold": 30}', 13),
('streak_60', 'Commitment Master', 'Maintain a 60-day wellness streak', '👑', 'consistency', 'gold', 600, '{"type": "streak", "category": "wellness", "threshold": 60}', 14),
('streak_100', 'Century of Self-Care', 'Maintain a 100-day wellness streak', '💎', 'consistency', 'platinum', 1000, '{"type": "streak", "category": "wellness", "threshold": 100}', 15),

-- VOLUME ACHIEVEMENTS (Bronze/Silver/Gold)
('dreams_10', 'Dream Collector', 'Log 10 dreams', '📚', 'volume', 'bronze', 50, '{"type": "dream_count", "threshold": 10}', 20),
('dreams_25', 'Dream Chronicler', 'Log 25 dreams', '📖', 'volume', 'silver', 100, '{"type": "dream_count", "threshold": 25}', 21),
('dreams_50', 'Dream Historian', 'Log 50 dreams', '🏛️', 'volume', 'gold', 200, '{"type": "dream_count", "threshold": 50}', 22),
('dreams_100', 'Dream Archivist', 'Log 100 dreams', '🗂️', 'volume', 'platinum', 500, '{"type": "dream_count", "threshold": 100}', 23),
('moods_30', 'Emotion Tracker', 'Log 30 moods', '🎭', 'volume', 'bronze', 50, '{"type": "mood_count", "threshold": 30}', 24),
('moods_90', 'Mood Master', 'Log 90 moods', '🌈', 'volume', 'silver', 150, '{"type": "mood_count", "threshold": 90}', 25),
('journals_10', 'Reflective Writer', 'Write 10 journal entries', '✍️', 'volume', 'bronze', 50, '{"type": "journal_count", "threshold": 10}', 26),

-- QUALITY ACHIEVEMENTS (Gold)
('detailed_dream', 'Dream Weaver', 'Log a dream with 500+ words', '🎨', 'quality', 'gold', 100, '{"type": "dream_length", "threshold": 500}', 30),
('all_perspectives', 'Perspective Seeker', 'Read all 4 interpretation perspectives for a dream', '🔮', 'quality', 'silver', 75, '{"type": "perspectives_viewed", "threshold": 4}', 31),
('linked_event', 'Connector', 'Link a dream to a life event', '🔗', 'quality', 'silver', 50, '{"type": "dream_link_created"}', 32),

-- INSIGHT ACHIEVEMENTS (Gold/Platinum)
('pattern_found', 'Pattern Detective', 'Discover your first recurring pattern', '🔍', 'insight', 'gold', 150, '{"type": "pattern_discovered"}', 40),
('similar_dreams', 'Déjà Vu', 'Find similar dreams in your history', '🌀', 'insight', 'silver', 100, '{"type": "similar_dreams_found"}', 41),
('weekly_review', 'Self Reflector', 'View your first weekly summary', '📊', 'insight', 'silver', 75, '{"type": "weekly_summary_viewed"}', 42),

-- SPECIAL/HIDDEN ACHIEVEMENTS (Legendary)
('midnight_dream', 'Night Owl', 'Log a dream between midnight and 3am', '🦉', 'special', 'legendary', 200, '{"type": "time_based", "start": "00:00", "end": "03:00"}', 50),
('early_bird', 'Morning Lark', 'Log a dream before 6am', '🐦', 'special', 'legendary', 200, '{"type": "time_based", "start": "00:00", "end": "06:00"}', 51),
('perfect_week', 'Flawless Week', 'Complete all daily goals for 7 days straight', '✨', 'special', 'platinum', 500, '{"type": "perfect_week"}', 52),
('explorer', 'Full Experience', 'Use all app features at least once', '🗺️', 'special', 'gold', 250, '{"type": "features_used", "threshold": 8}', 53)
ON CONFLICT (code) DO NOTHING;

-- Functions for Gamification Logic
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(100 * POWER(level_num, 1.5));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_title_for_level(level_num INTEGER)
RETURNS VARCHAR AS $$
BEGIN
  CASE
    WHEN level_num < 5 THEN RETURN 'Dream Novice';
    WHEN level_num < 10 THEN RETURN 'Dream Seeker';
    WHEN level_num < 20 THEN RETURN 'Dream Explorer';
    WHEN level_num < 30 THEN RETURN 'Dream Interpreter';
    WHEN level_num < 40 THEN RETURN 'Dream Sage';
    WHEN level_num < 50 THEN RETURN 'Dream Master';
    ELSE RETURN 'Dream Legend';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Verify tables: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 2. Check RLS policies: SELECT * FROM pg_policies WHERE schemaname = 'public';
-- 3. Test your app!
-- ============================================================================
