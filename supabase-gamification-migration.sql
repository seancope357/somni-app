-- DREAMONEIR Gamification System Migration
-- This adds achievements, XP, levels, and streaks to the app

-- ============================================
-- 1. USER STATS TABLE
-- ============================================
-- Tracks overall user progress and gamification stats
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- XP and Level System
  total_xp integer DEFAULT 0 NOT NULL,
  current_level integer DEFAULT 1 NOT NULL,
  xp_to_next_level integer DEFAULT 100 NOT NULL,

  -- Streaks
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_activity_date date,

  -- Counters
  total_dreams integer DEFAULT 0 NOT NULL,
  total_journal_entries integer DEFAULT 0 NOT NULL,
  total_mood_logs integer DEFAULT 0 NOT NULL,
  total_life_events integer DEFAULT 0 NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- ============================================
-- 2. ACHIEVEMENTS TABLE
-- ============================================
-- Defines all possible achievements in the system
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Achievement details
  code varchar(100) UNIQUE NOT NULL, -- e.g., 'first_dream', 'week_streak'
  name varchar(200) NOT NULL,
  description text NOT NULL,
  icon varchar(50), -- emoji or icon name

  -- Requirements
  category varchar(50) NOT NULL, -- 'dreams', 'streak', 'mood', 'journal', 'exploration'
  tier varchar(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  requirement_type varchar(50) NOT NULL, -- 'count', 'streak', 'special'
  requirement_value integer, -- e.g., 10 for "Log 10 dreams"

  -- Rewards
  xp_reward integer DEFAULT 0 NOT NULL,

  -- Metadata
  sort_order integer DEFAULT 0,
  is_hidden boolean DEFAULT false, -- secret achievements
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_code ON achievements(code);

-- ============================================
-- 3. USER ACHIEVEMENTS TABLE
-- ============================================
-- Tracks which achievements each user has unlocked
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,

  -- Progress tracking
  progress integer DEFAULT 0, -- current progress towards achievement
  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(user_id, is_completed);

-- ============================================
-- 4. XP TRANSACTIONS TABLE
-- ============================================
-- Logs all XP gains for transparency and analytics
CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Transaction details
  amount integer NOT NULL, -- can be negative for penalties
  reason varchar(200) NOT NULL, -- 'dream_logged', 'achievement_unlocked', etc.
  related_id uuid, -- ID of related entity (dream_id, achievement_id, etc.)
  related_type varchar(50), -- 'dream', 'achievement', 'mood', etc.

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created ON xp_transactions(user_id, created_at DESC);

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Function to calculate XP needed for a level
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level integer)
RETURNS integer AS $$
BEGIN
  -- XP curve: 100 * level^1.5
  -- Level 1: 100 XP
  -- Level 2: 283 XP
  -- Level 5: 1118 XP
  -- Level 10: 3162 XP
  RETURN FLOOR(100 * POWER(level, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP to user
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id uuid,
  p_amount integer,
  p_reason varchar(200),
  p_related_id uuid DEFAULT NULL,
  p_related_type varchar(50) DEFAULT NULL
)
RETURNS TABLE(new_level integer, level_up boolean, total_xp integer) AS $$
DECLARE
  v_current_level integer;
  v_total_xp integer;
  v_xp_to_next integer;
  v_new_level integer;
  v_level_up boolean := false;
BEGIN
  -- Get current stats
  SELECT current_level, total_xp, xp_to_next_level
  INTO v_current_level, v_total_xp, v_xp_to_next
  FROM user_stats
  WHERE user_id = p_user_id;

  -- If user stats don't exist, create them
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, total_xp, current_level, xp_to_next_level)
    VALUES (p_user_id, 0, 1, 100);
    v_current_level := 1;
    v_total_xp := 0;
    v_xp_to_next := 100;
  END IF;

  -- Add XP
  v_total_xp := v_total_xp + p_amount;
  v_new_level := v_current_level;

  -- Check for level up(s)
  WHILE v_total_xp >= (SELECT SUM(calculate_xp_for_level(i)) FROM generate_series(1, v_new_level) i) LOOP
    v_new_level := v_new_level + 1;
    v_level_up := true;
  END LOOP;

  -- Calculate XP to next level
  v_xp_to_next := (SELECT SUM(calculate_xp_for_level(i)) FROM generate_series(1, v_new_level) i) - v_total_xp;

  -- Update user stats
  UPDATE user_stats
  SET
    total_xp = v_total_xp,
    current_level = v_new_level,
    xp_to_next_level = v_xp_to_next,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO xp_transactions (user_id, amount, reason, related_id, related_type)
  VALUES (p_user_id, p_amount, p_reason, p_related_id, p_related_type);

  -- Return results
  RETURN QUERY SELECT v_new_level, v_level_up, v_total_xp;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id uuid, p_activity_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(current_streak integer, longest_streak integer, is_new_record boolean) AS $$
DECLARE
  v_current_streak integer;
  v_longest_streak integer;
  v_last_activity date;
  v_is_new_record boolean := false;
BEGIN
  -- Get current streak data
  SELECT
    COALESCE(us.current_streak, 0),
    COALESCE(us.longest_streak, 0),
    us.last_activity_date
  INTO v_current_streak, v_longest_streak, v_last_activity
  FROM user_stats us
  WHERE us.user_id = p_user_id;

  -- If no stats exist, create them
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, p_activity_date);
    RETURN QUERY SELECT 1, 1, true;
    RETURN;
  END IF;

  -- Calculate new streak
  IF v_last_activity IS NULL THEN
    -- First activity
    v_current_streak := 1;
  ELSIF p_activity_date = v_last_activity THEN
    -- Same day, no change
    RETURN QUERY SELECT v_current_streak, v_longest_streak, false;
    RETURN;
  ELSIF p_activity_date = v_last_activity + 1 THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  ELSIF p_activity_date > v_last_activity + 1 THEN
    -- Streak broken
    v_current_streak := 1;
  ELSE
    -- Activity in the past, don't update
    RETURN QUERY SELECT v_current_streak, v_longest_streak, false;
    RETURN;
  END IF;

  -- Check if new record
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
    v_is_new_record := true;
  END IF;

  -- Update stats
  UPDATE user_stats
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = p_activity_date,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_is_new_record;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. SEED ACHIEVEMENTS
-- ============================================
-- Insert predefined achievements
INSERT INTO achievements (code, name, description, icon, category, tier, requirement_type, requirement_value, xp_reward, sort_order) VALUES
  -- Dream achievements
  ('first_dream', 'First Dream', 'Log your first dream', '🌙', 'dreams', 'bronze', 'count', 1, 50, 1),
  ('dreamer_10', 'Dream Explorer', 'Log 10 dreams', '⭐', 'dreams', 'bronze', 'count', 10, 100, 2),
  ('dreamer_25', 'Dream Chronicler', 'Log 25 dreams', '✨', 'dreams', 'silver', 'count', 25, 250, 3),
  ('dreamer_50', 'Dream Master', 'Log 50 dreams', '🌟', 'dreams', 'silver', 'count', 50, 500, 4),
  ('dreamer_100', 'Dream Legend', 'Log 100 dreams', '💫', 'dreams', 'gold', 'count', 100, 1000, 5),
  ('dreamer_250', 'Dream Sage', 'Log 250 dreams', '🔮', 'dreams', 'platinum', 'count', 250, 2500, 6),

  -- Streak achievements
  ('streak_3', 'Getting Started', '3-day streak', '🔥', 'streak', 'bronze', 'streak', 3, 75, 10),
  ('streak_7', 'Week Warrior', '7-day streak', '⚡', 'streak', 'silver', 'streak', 7, 200, 11),
  ('streak_14', 'Two Weeks Strong', '14-day streak', '💪', 'streak', 'silver', 'streak', 14, 400, 12),
  ('streak_30', 'Month Master', '30-day streak', '👑', 'streak', 'gold', 'streak', 30, 1000, 13),
  ('streak_60', 'Unwavering', '60-day streak', '🏆', 'streak', 'gold', 'streak', 60, 2000, 14),
  ('streak_100', 'Centurion', '100-day streak', '🎖️', 'streak', 'platinum', 'streak', 100, 5000, 15),

  -- Mood tracking achievements
  ('mood_first', 'Emotional Awareness', 'Log your first mood', '😊', 'mood', 'bronze', 'count', 1, 25, 20),
  ('mood_10', 'Mood Tracker', 'Log 10 moods', '💭', 'mood', 'bronze', 'count', 10, 75, 21),
  ('mood_30', 'Self-Aware', 'Log 30 moods', '🧘', 'mood', 'silver', 'count', 30, 200, 22),
  ('mood_100', 'Emotional Master', 'Log 100 moods', '🌈', 'mood', 'gold', 'count', 100, 750, 23),

  -- Journal achievements
  ('journal_first', 'Deep Thinker', 'Write your first journal entry', '📔', 'journal', 'bronze', 'count', 1, 50, 30),
  ('journal_10', 'Reflective Soul', 'Write 10 journal entries', '📝', 'journal', 'bronze', 'count', 10, 100, 31),
  ('journal_25', 'Journaling Habit', 'Write 25 journal entries', '📖', 'journal', 'silver', 'count', 25, 250, 32),
  ('journal_50', 'Master Journaler', 'Write 50 journal entries', '✍️', 'journal', 'gold', 'count', 50, 500, 33),

  -- Life events achievements
  ('events_first', 'Life Mapper', 'Log your first life event', '📍', 'events', 'bronze', 'count', 1, 50, 40),
  ('events_10', 'Timeline Builder', 'Log 10 life events', '🗓️', 'events', 'silver', 'count', 10, 150, 41),
  ('events_25', 'Life Chronicler', 'Log 25 life events', '📅', 'events', 'gold', 'count', 25, 350, 42),

  -- Exploration achievements
  ('perspective_switch', 'Multi-Perspective', 'Try different analysis perspectives', '🔄', 'exploration', 'bronze', 'special', NULL, 100, 50),
  ('pattern_explorer', 'Pattern Seeker', 'View your pattern analysis', '📊', 'exploration', 'bronze', 'special', NULL, 75, 51),
  ('insights_viewer', 'Insight Hunter', 'Explore your insights', '💡', 'exploration', 'bronze', 'special', NULL, 75, 52),

  -- Hidden/Secret achievements
  ('night_owl', 'Night Owl', 'Log a dream after midnight', '🦉', 'dreams', 'bronze', 'special', NULL, 150, 100),
  ('early_bird', 'Early Bird', 'Log a dream before 6 AM', '🐦', 'dreams', 'bronze', 'special', NULL, 150, 101),
  ('dream_novelist', 'Dream Novelist', 'Log a dream with over 500 words', '📚', 'dreams', 'silver', 'special', NULL, 200, 102)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_achievements_updated_at BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Allow public read access to achievements table
GRANT SELECT ON achievements TO anon, authenticated;

COMMENT ON TABLE user_stats IS 'Tracks user progress, XP, levels, and streaks';
COMMENT ON TABLE achievements IS 'Defines all available achievements in the system';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON TABLE xp_transactions IS 'Logs all XP transactions for transparency';
