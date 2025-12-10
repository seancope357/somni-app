-- Gamification System Migration for DREAMONEIR
-- Adds streak tracking, achievements, goals, XP system, and progress tracking

-- ============================================================================
-- 1. USER STREAKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dream logging streaks
  current_dream_streak INTEGER DEFAULT 0,
  longest_dream_streak INTEGER DEFAULT 0,
  last_dream_date DATE,

  -- Mood logging streaks
  current_mood_streak INTEGER DEFAULT 0,
  longest_mood_streak INTEGER DEFAULT 0,
  last_mood_date DATE,

  -- Combined wellness streak (dream OR mood daily)
  current_wellness_streak INTEGER DEFAULT 0,
  longest_wellness_streak INTEGER DEFAULT 0,
  last_wellness_date DATE,

  -- Streak freeze inventory (like Duolingo)
  streak_freezes_available INTEGER DEFAULT 0,
  streak_freezes_used INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================================================
-- 2. ACHIEVEMENTS TABLE (Master list of all possible achievements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'first_dream', 'dream_10'

  -- Display info
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL, -- emoji or icon identifier

  -- Achievement properties
  category VARCHAR(50) NOT NULL, -- 'beginner', 'consistency', 'volume', 'quality', 'insight', 'special'
  tier VARCHAR(20) NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum', 'legendary'
  xp_reward INTEGER DEFAULT 0,

  -- Unlock criteria (JSON for flexibility)
  criteria JSONB NOT NULL,
  -- Example: {"type": "dream_count", "threshold": 10}
  -- Example: {"type": "streak", "category": "dream", "threshold": 7}

  -- Display order
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE, -- Secret achievements
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. USER ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_viewed BOOLEAN DEFAULT FALSE, -- For notification badge

  UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- 4. USER GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal definition
  goal_type VARCHAR(50) NOT NULL, -- 'dream_count', 'mood_count', 'journal_count', 'custom'
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,

  -- Time frame
  period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'failed', 'abandoned'
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Display
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. USER XP & LEVELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- XP system
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  xp_to_next_level INTEGER DEFAULT 100, -- Dynamic based on level

  -- Titles/Ranks (unlocked at certain levels)
  current_title VARCHAR(100) DEFAULT 'Dream Novice',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================================================
-- 6. DAILY ACTIVITY STATS (for progress tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_activity_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,

  -- Counts
  dreams_logged INTEGER DEFAULT 0,
  moods_logged INTEGER DEFAULT 0,
  journals_written INTEGER DEFAULT 0,
  life_events_added INTEGER DEFAULT 0,
  chat_messages_sent INTEGER DEFAULT 0,

  -- Quality metrics
  avg_dream_length INTEGER DEFAULT 0, -- word count
  avg_mood_score DECIMAL(3,1),

  -- Engagement
  time_spent_minutes INTEGER DEFAULT 0,
  features_used TEXT[], -- ['interpret', 'chat', 'patterns']

  -- XP earned today
  xp_earned INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, activity_date)
);

-- ============================================================================
-- 7. WEEKLY SUMMARIES (auto-generated)
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Aggregated stats
  total_dreams INTEGER DEFAULT 0,
  total_moods INTEGER DEFAULT 0,
  total_journals INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,

  -- Highlights
  most_common_emotion VARCHAR(100),
  most_active_day VARCHAR(20), -- day of week
  completion_rate DECIMAL(5,2), -- percentage of daily goals met

  -- Generated insights
  ai_summary TEXT, -- AI-generated weekly recap

  is_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, week_start_date)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Streaks policies
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievements policies (users can view all achievements, but only their unlocks)
CREATE POLICY "Anyone can view achievements catalog"
  ON achievements FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can view their own unlocked achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Levels policies
CREATE POLICY "Users can view their own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own level"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level"
  ON user_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Daily stats policies
CREATE POLICY "Users can view their own daily stats"
  ON daily_activity_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily stats"
  ON daily_activity_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats"
  ON daily_activity_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Weekly summaries policies
CREATE POLICY "Users can view their own weekly summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS for Auto-updating Timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Achievement Definitions
-- ============================================================================
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
('explorer', 'Full Experience', 'Use all app features at least once', '🗺️', 'special', 'gold', 250, '{"type": "features_used", "threshold": 8}', 53);

-- ============================================================================
-- FUNCTIONS for Gamification Logic
-- ============================================================================

-- Function to calculate XP required for next level (exponential curve like Duolingo)
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Formula: base_xp * (level ^ 1.5)
  -- Level 1->2: 100 XP
  -- Level 2->3: 141 XP
  -- Level 3->4: 173 XP
  -- Level 10->11: 316 XP
  RETURN FLOOR(100 * POWER(level_num, 1.5));
END;
$$ LANGUAGE plpgsql;

-- Function to get title for level
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
-- SUCCESS!
-- ============================================================================
-- Migration complete. Next steps:
-- 1. Run this SQL in Supabase Dashboard
-- 2. Create API routes for gamification endpoints
-- 3. Build React components for UI
-- 4. Integrate hooks into existing actions (dream logging, mood logging, etc.)
