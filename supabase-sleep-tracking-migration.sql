-- =====================================================
-- DREAMONEIR SLEEP TRACKING & SCORING SYSTEM MIGRATION
-- Version: 1.0
-- Date: 2025-12-14
-- =====================================================
--
-- This migration implements a comprehensive sleep health tracking system
-- with automatic sleep score calculation (0-100) based on:
-- - Duration (35 points): Compared to user's typical sleep baseline
-- - Quality (40 points): Sleep quality, restfulness, ease of falling asleep, interruptions
-- - Consistency (25 points): Environmental quality and 7-day variance
--
-- Prerequisites: Requires existing dreams, mood_logs, user_streaks, daily_activity_stats tables
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SLEEP_LOGS TABLE
-- =====================================================
-- Primary table for tracking individual sleep sessions with comprehensive metrics

CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date tracking
  sleep_date DATE NOT NULL, -- The night of sleep (e.g., 2025-12-14 for sleep on night of Dec 14)
  bedtime TIMESTAMPTZ, -- When user went to bed
  wake_time TIMESTAMPTZ, -- When user woke up

  -- Duration metrics
  sleep_hours FLOAT NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  time_to_fall_asleep_minutes SMALLINT CHECK (time_to_fall_asleep_minutes >= 0), -- Sleep latency

  -- Quality metrics (1-5 scale)
  sleep_quality SMALLINT NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5), -- Overall quality rating
  restfulness SMALLINT CHECK (restfulness BETWEEN 1 AND 5), -- How rested user felt upon waking
  ease_of_falling_asleep SMALLINT CHECK (ease_of_falling_asleep BETWEEN 1 AND 5), -- How easily fell asleep

  -- Interruptions
  interruptions_count SMALLINT DEFAULT 0 CHECK (interruptions_count >= 0), -- Number of times woke up
  interruption_duration_minutes SMALLINT CHECK (interruption_duration_minutes >= 0), -- Total time awake during night

  -- Environmental factors
  sleep_environment_quality SMALLINT CHECK (sleep_environment_quality BETWEEN 1 AND 5), -- Room conditions
  used_sleep_aids BOOLEAN DEFAULT false, -- Medication, melatonin, etc.

  -- Calculated scores (auto-populated by trigger)
  sleep_score SMALLINT CHECK (sleep_score BETWEEN 0 AND 100), -- Overall score (0-100)
  duration_score SMALLINT CHECK (duration_score BETWEEN 0 AND 100), -- Duration component
  quality_score SMALLINT CHECK (quality_score BETWEEN 0 AND 100), -- Quality component
  consistency_score SMALLINT CHECK (consistency_score BETWEEN 0 AND 100), -- Consistency component
  grade VARCHAR(1) CHECK (grade IN ('S', 'A', 'B', 'C', 'D', 'F')), -- Letter grade

  -- Contextual data
  sleep_deficit_hours FLOAT, -- Difference from optimal 8 hours
  is_optimal_range BOOLEAN, -- True if 7-9 hours
  consistency_std_dev FLOAT, -- 7-day rolling standard deviation

  -- Notes and tags
  notes TEXT, -- User notes about the night
  tags TEXT[], -- e.g., ['late-night', 'weekend', 'stressful-day']

  -- Relations
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  mood_log_id UUID REFERENCES public.mood_logs(id) ON DELETE SET NULL,
  dream_count SMALLINT DEFAULT 0, -- Number of dreams logged for this night

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, sleep_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS sleep_logs_user_id_idx ON public.sleep_logs(user_id);
CREATE INDEX IF NOT EXISTS sleep_logs_user_date_idx ON public.sleep_logs(user_id, sleep_date DESC);
CREATE INDEX IF NOT EXISTS sleep_logs_sleep_score_idx ON public.sleep_logs(user_id, sleep_score DESC);
CREATE INDEX IF NOT EXISTS sleep_logs_grade_idx ON public.sleep_logs(user_id, grade);
CREATE INDEX IF NOT EXISTS sleep_logs_dream_id_idx ON public.sleep_logs(dream_id);

-- Row Level Security
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can view own sleep logs"
  ON public.sleep_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can insert own sleep logs"
  ON public.sleep_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can update own sleep logs"
  ON public.sleep_logs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can delete own sleep logs"
  ON public.sleep_logs FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. CALCULATE_SLEEP_SCORE() FUNCTION
-- =====================================================
-- PostgreSQL function that calculates 0-100 sleep score based on:
-- - Duration score (35% weight) - compared to optimal 7-9 hours
-- - Quality score (40% weight) - from sleep_quality, restfulness, ease_of_falling_asleep, interruptions
-- - Consistency score (25% weight) - from environment quality and 7-day variance

CREATE OR REPLACE FUNCTION public.calculate_sleep_score(
  p_user_id UUID,
  p_sleep_date DATE,
  p_sleep_hours FLOAT,
  p_sleep_quality SMALLINT,
  p_restfulness SMALLINT DEFAULT NULL,
  p_ease_of_falling_asleep SMALLINT DEFAULT NULL,
  p_interruptions_count SMALLINT DEFAULT 0,
  p_sleep_environment_quality SMALLINT DEFAULT NULL
)
RETURNS TABLE(
  total_score SMALLINT,
  duration_score SMALLINT,
  quality_score SMALLINT,
  consistency_score SMALLINT,
  grade VARCHAR(1),
  deficit_hours FLOAT,
  is_optimal BOOLEAN,
  std_dev FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_duration_score SMALLINT;
  v_quality_score SMALLINT;
  v_consistency_score SMALLINT;
  v_total_score SMALLINT;
  v_grade VARCHAR(1);
  v_deficit FLOAT;
  v_is_optimal BOOLEAN;
  v_std_dev FLOAT;
  v_sleep_hours_array FLOAT[];
  v_mean FLOAT;
  v_variance FLOAT;
  v_quality_base SMALLINT;
  v_quality_penalty SMALLINT;
BEGIN
  -- ==================================================================
  -- DURATION SCORE (35% weight)
  -- ==================================================================
  -- Optimal range: 7-9 hours = 100 points
  -- Below optimal: Linear decline from 7 to 4 hours
  -- Above optimal: Gentler decline from 9 to 12 hours

  IF p_sleep_hours >= 7 AND p_sleep_hours <= 9 THEN
    v_duration_score := 100;
  ELSIF p_sleep_hours < 7 THEN
    IF p_sleep_hours < 4 THEN
      v_duration_score := 0;
    ELSE
      -- Linear decline: (7 - sleep_hours) / 3 * 100
      v_duration_score := GREATEST(0, ROUND(100 - ((7 - p_sleep_hours) / 3.0) * 100));
    END IF;
  ELSE -- p_sleep_hours > 9
    IF p_sleep_hours > 12 THEN
      v_duration_score := 25;
    ELSE
      -- Gentler decline: (sleep_hours - 9) / 3 * 50
      v_duration_score := GREATEST(25, ROUND(100 - ((p_sleep_hours - 9) / 3.0) * 50));
    END IF;
  END IF;

  -- ==================================================================
  -- QUALITY SCORE (40% weight)
  -- ==================================================================
  -- Based on: sleep_quality (primary), restfulness, ease_of_falling_asleep, interruptions
  -- Scale each component to contribute to 100-point scale

  -- Base quality from sleep_quality rating (1-5)
  -- Map 1-5 to 20-100 (linear scale)
  v_quality_base := 20 + ((p_sleep_quality - 1) * 20);

  -- Add bonus points for other quality factors (if provided)
  v_quality_score := v_quality_base;

  IF p_restfulness IS NOT NULL THEN
    -- Restfulness contributes up to ±10 points
    v_quality_score := v_quality_score + ((p_restfulness - 3) * 3);
  END IF;

  IF p_ease_of_falling_asleep IS NOT NULL THEN
    -- Ease of falling asleep contributes up to ±10 points
    v_quality_score := v_quality_score + ((p_ease_of_falling_asleep - 3) * 3);
  END IF;

  -- Penalty for interruptions (up to -20 points)
  v_quality_penalty := LEAST(20, p_interruptions_count * 4);
  v_quality_score := v_quality_score - v_quality_penalty;

  -- Bonus for good environment (up to +10 points)
  IF p_sleep_environment_quality IS NOT NULL AND p_sleep_environment_quality >= 4 THEN
    v_quality_score := v_quality_score + ((p_sleep_environment_quality - 3) * 5);
  END IF;

  -- Clamp to 0-100 range
  v_quality_score := GREATEST(0, LEAST(100, v_quality_score));

  -- ==================================================================
  -- CONSISTENCY SCORE (25% weight)
  -- ==================================================================
  -- Based on 7-day rolling standard deviation of sleep hours
  -- Lower variance = higher consistency = higher score

  -- Get last 7 days of sleep hours (including current)
  SELECT ARRAY_AGG(sleep_hours ORDER BY sleep_date DESC)
  INTO v_sleep_hours_array
  FROM (
    SELECT sleep_hours, sleep_date
    FROM public.sleep_logs
    WHERE user_id = p_user_id
      AND sleep_date <= p_sleep_date
      AND sleep_hours IS NOT NULL
    ORDER BY sleep_date DESC
    LIMIT 7
  ) recent_sleep;

  -- Calculate standard deviation if we have enough data
  IF v_sleep_hours_array IS NULL OR array_length(v_sleep_hours_array, 1) < 3 THEN
    -- Not enough data, use neutral score
    v_consistency_score := 50;
    v_std_dev := NULL;
  ELSE
    -- Calculate mean
    SELECT AVG(val) INTO v_mean FROM unnest(v_sleep_hours_array) val;

    -- Calculate variance and standard deviation
    SELECT AVG((val - v_mean) ^ 2) INTO v_variance FROM unnest(v_sleep_hours_array) val;
    v_std_dev := SQRT(v_variance);

    -- Score based on standard deviation
    -- 0-0.5 hrs variation = Perfect (100)
    -- 0.5-1 hrs = Excellent (85-100)
    -- 1-1.5 hrs = Good (70-85)
    -- 1.5-2 hrs = Fair (50-70)
    -- >2 hrs = Poor (<50)

    IF v_std_dev <= 0.5 THEN
      v_consistency_score := 100;
    ELSIF v_std_dev <= 1.0 THEN
      v_consistency_score := ROUND(85 + ((1.0 - v_std_dev) / 0.5) * 15);
    ELSIF v_std_dev <= 1.5 THEN
      v_consistency_score := ROUND(70 + ((1.5 - v_std_dev) / 0.5) * 15);
    ELSIF v_std_dev <= 2.0 THEN
      v_consistency_score := ROUND(50 + ((2.0 - v_std_dev) / 0.5) * 20);
    ELSE
      v_consistency_score := GREATEST(0, ROUND(50 - ((v_std_dev - 2.0) * 10)));
    END IF;
  END IF;

  -- ==================================================================
  -- TOTAL SCORE CALCULATION
  -- ==================================================================
  -- Weighted average: Duration (35%) + Quality (40%) + Consistency (25%)

  v_total_score := ROUND(
    (v_duration_score * 0.35) +
    (v_quality_score * 0.40) +
    (v_consistency_score * 0.25)
  );

  -- Ensure score is in valid range
  v_total_score := GREATEST(0, LEAST(100, v_total_score));

  -- ==================================================================
  -- GRADE ASSIGNMENT
  -- ==================================================================

  IF v_total_score >= 90 THEN
    v_grade := 'S'; -- Exceptional
  ELSIF v_total_score >= 80 THEN
    v_grade := 'A'; -- Excellent
  ELSIF v_total_score >= 70 THEN
    v_grade := 'B'; -- Good
  ELSIF v_total_score >= 60 THEN
    v_grade := 'C'; -- Fair
  ELSIF v_total_score >= 50 THEN
    v_grade := 'D'; -- Poor
  ELSE
    v_grade := 'F'; -- Critical
  END IF;

  -- ==================================================================
  -- ADDITIONAL METRICS
  -- ==================================================================

  -- Sleep deficit (difference from optimal 8 hours)
  v_deficit := 8.0 - p_sleep_hours;

  -- Is in optimal range (7-9 hours)
  v_is_optimal := (p_sleep_hours >= 7 AND p_sleep_hours <= 9);

  -- ==================================================================
  -- RETURN RESULTS
  -- ==================================================================

  RETURN QUERY SELECT
    v_total_score::SMALLINT,
    v_duration_score::SMALLINT,
    v_quality_score::SMALLINT,
    v_consistency_score::SMALLINT,
    v_grade::VARCHAR(1),
    v_deficit::FLOAT,
    v_is_optimal::BOOLEAN,
    v_std_dev::FLOAT;
END;
$$;

-- =====================================================
-- 3. AUTO-CALCULATE SLEEP SCORE TRIGGER
-- =====================================================
-- Automatically calculates sleep score when sleep_logs row is inserted or updated

CREATE OR REPLACE FUNCTION public.trigger_calculate_sleep_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score_result RECORD;
BEGIN
  -- Only calculate if required fields are present
  IF NEW.sleep_hours IS NOT NULL AND NEW.sleep_quality IS NOT NULL THEN
    -- Call the calculation function
    SELECT * INTO v_score_result
    FROM public.calculate_sleep_score(
      NEW.user_id,
      NEW.sleep_date,
      NEW.sleep_hours,
      NEW.sleep_quality,
      NEW.restfulness,
      NEW.ease_of_falling_asleep,
      NEW.interruptions_count,
      NEW.sleep_environment_quality
    );

    -- Update the NEW record with calculated values
    NEW.sleep_score := v_score_result.total_score;
    NEW.duration_score := v_score_result.duration_score;
    NEW.quality_score := v_score_result.quality_score;
    NEW.consistency_score := v_score_result.consistency_score;
    NEW.grade := v_score_result.grade;
    NEW.sleep_deficit_hours := v_score_result.deficit_hours;
    NEW.is_optimal_range := v_score_result.is_optimal;
    NEW.consistency_std_dev := v_score_result.std_dev;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_sleep_logs_calculate_score ON public.sleep_logs;
CREATE TRIGGER trg_sleep_logs_calculate_score
  BEFORE INSERT OR UPDATE ON public.sleep_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_sleep_score();

-- =====================================================
-- 4. AUTO-UPDATE UPDATED_AT TRIGGER
-- =====================================================

-- Reuse existing update_updated_at_column function if it exists, otherwise create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sleep_logs_updated_at ON public.sleep_logs;
CREATE TRIGGER trg_sleep_logs_updated_at
  BEFORE UPDATE ON public.sleep_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. AUTO-LINK DREAMS TO SLEEP_LOGS
-- =====================================================
-- When a dream is created, automatically link it to the sleep_log for that date

CREATE OR REPLACE FUNCTION public.link_dream_to_sleep_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sleep_log_id UUID;
  v_sleep_date DATE;
BEGIN
  -- Determine sleep date from dream's created_at timestamp
  -- Assume dream is about the previous night if logged before noon, same night if after noon
  IF EXTRACT(HOUR FROM NEW.created_at) < 12 THEN
    v_sleep_date := DATE(NEW.created_at) - INTERVAL '1 day';
  ELSE
    v_sleep_date := DATE(NEW.created_at);
  END IF;

  -- Find matching sleep log
  SELECT id INTO v_sleep_log_id
  FROM public.sleep_logs
  WHERE user_id = NEW.user_id
    AND sleep_date = v_sleep_date
  LIMIT 1;

  -- Update dream with sleep_log_id
  IF v_sleep_log_id IS NOT NULL THEN
    NEW.sleep_log_id := v_sleep_log_id;

    -- Also increment dream_count on the sleep_log
    UPDATE public.sleep_logs
    SET dream_count = dream_count + 1
    WHERE id = v_sleep_log_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (will be created after adding sleep_log_id column to dreams)

-- =====================================================
-- 6. AUTO-INCREMENT DREAM_COUNT ON SLEEP_LOG
-- =====================================================
-- When a dream is linked to a sleep_log, increment the dream_count

CREATE OR REPLACE FUNCTION public.increment_sleep_log_dream_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If sleep_log_id changed from NULL to a value, or changed to different sleep_log
  IF (OLD.sleep_log_id IS NULL AND NEW.sleep_log_id IS NOT NULL) OR
     (OLD.sleep_log_id IS NOT NULL AND NEW.sleep_log_id IS NOT NULL AND OLD.sleep_log_id != NEW.sleep_log_id) THEN

    -- Decrement old sleep_log if it existed
    IF OLD.sleep_log_id IS NOT NULL THEN
      UPDATE public.sleep_logs
      SET dream_count = GREATEST(0, dream_count - 1)
      WHERE id = OLD.sleep_log_id;
    END IF;

    -- Increment new sleep_log
    UPDATE public.sleep_logs
    SET dream_count = dream_count + 1
    WHERE id = NEW.sleep_log_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger will be created after adding sleep_log_id column to dreams

-- =====================================================
-- 7. SCHEMA EXTENSIONS - Add sleep_log_id to dreams table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dreams'
      AND column_name = 'sleep_log_id'
  ) THEN
    ALTER TABLE public.dreams ADD COLUMN sleep_log_id UUID REFERENCES public.sleep_logs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS dreams_sleep_log_id_idx ON public.dreams(sleep_log_id);
  END IF;
END $$;

-- Now create the dream linking triggers
DROP TRIGGER IF EXISTS trg_link_dream_to_sleep_log ON public.dreams;
CREATE TRIGGER trg_link_dream_to_sleep_log
  BEFORE INSERT ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.link_dream_to_sleep_log();

DROP TRIGGER IF EXISTS trg_increment_sleep_log_dream_count ON public.dreams;
CREATE TRIGGER trg_increment_sleep_log_dream_count
  AFTER UPDATE OF sleep_log_id ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_sleep_log_dream_count();

-- =====================================================
-- 8. SCHEMA EXTENSIONS - Add sleep columns to daily_activity_stats
-- =====================================================

DO $$
BEGIN
  -- Add sleep-related columns to daily_activity_stats if they don't exist

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_activity_stats'
      AND column_name = 'sleep_logged'
  ) THEN
    ALTER TABLE public.daily_activity_stats ADD COLUMN sleep_logged BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_activity_stats'
      AND column_name = 'sleep_hours'
  ) THEN
    ALTER TABLE public.daily_activity_stats ADD COLUMN sleep_hours FLOAT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_activity_stats'
      AND column_name = 'sleep_score'
  ) THEN
    ALTER TABLE public.daily_activity_stats ADD COLUMN sleep_score SMALLINT CHECK (sleep_score BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_activity_stats'
      AND column_name = 'sleep_quality'
  ) THEN
    ALTER TABLE public.daily_activity_stats ADD COLUMN sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 5);
  END IF;
END $$;

-- =====================================================
-- 9. SCHEMA EXTENSIONS - Add sleep streak columns to user_streaks
-- =====================================================

DO $$
BEGIN
  -- Add sleep streak columns to user_streaks if they don't exist

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_streaks'
      AND column_name = 'current_sleep_streak'
  ) THEN
    ALTER TABLE public.user_streaks ADD COLUMN current_sleep_streak INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_streaks'
      AND column_name = 'longest_sleep_streak'
  ) THEN
    ALTER TABLE public.user_streaks ADD COLUMN longest_sleep_streak INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_streaks'
      AND column_name = 'last_sleep_date'
  ) THEN
    ALTER TABLE public.user_streaks ADD COLUMN last_sleep_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_streaks'
      AND column_name = 'current_good_sleep_streak'
  ) THEN
    ALTER TABLE public.user_streaks ADD COLUMN current_good_sleep_streak INTEGER DEFAULT 0 COMMENT 'Streak of A-grade or better sleep';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_streaks'
      AND column_name = 'longest_good_sleep_streak'
  ) THEN
    ALTER TABLE public.user_streaks ADD COLUMN longest_good_sleep_streak INTEGER DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 10. ANALYTICS VIEW - Daily Wellness (sleep + mood + dreams)
-- =====================================================

CREATE OR REPLACE VIEW public.v_daily_wellness AS
SELECT
  sl.user_id,
  sl.sleep_date AS date,

  -- Sleep metrics
  sl.sleep_hours,
  sl.sleep_score,
  sl.sleep_quality,
  sl.grade AS sleep_grade,
  sl.dream_count,

  -- Mood metrics (if available)
  ml.mood,
  ml.stress,
  ml.energy,

  -- Combined wellness indicator
  CASE
    WHEN sl.sleep_score >= 80 AND ml.mood >= 4 AND ml.energy >= 4 THEN 'excellent'
    WHEN sl.sleep_score >= 70 AND ml.mood >= 3 AND ml.energy >= 3 THEN 'good'
    WHEN sl.sleep_score >= 60 OR ml.mood >= 3 THEN 'fair'
    ELSE 'poor'
  END AS wellness_status,

  -- Metadata
  sl.created_at AS sleep_logged_at,
  ml.created_at AS mood_logged_at
FROM public.sleep_logs sl
LEFT JOIN public.mood_logs ml ON ml.user_id = sl.user_id AND ml.log_date = sl.sleep_date;

-- =====================================================
-- 11. ANALYTICS VIEW - Sleep Trends (7-day and 30-day rolling averages)
-- =====================================================

CREATE OR REPLACE VIEW public.v_sleep_trends AS
SELECT
  user_id,
  sleep_date,
  sleep_score,
  sleep_hours,
  grade,

  -- 7-day rolling averages
  AVG(sleep_score) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS avg_score_7d,

  AVG(sleep_hours) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS avg_hours_7d,

  STDDEV(sleep_hours) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS std_dev_7d,

  -- 30-day rolling averages
  AVG(sleep_score) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS avg_score_30d,

  AVG(sleep_hours) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS avg_hours_30d,

  STDDEV(sleep_hours) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS std_dev_30d,

  -- Sleep debt accumulation
  SUM(sleep_deficit_hours) OVER (
    PARTITION BY user_id
    ORDER BY sleep_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS cumulative_debt_30d
FROM public.sleep_logs
WHERE sleep_score IS NOT NULL;

-- =====================================================
-- 12. CORRELATION FUNCTION - Sleep & Mood Correlation
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_sleep_mood_correlation(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  correlation_type TEXT,
  sleep_metric TEXT,
  mood_metric TEXT,
  avg_sleep_value NUMERIC,
  avg_mood_value NUMERIC,
  sample_size INTEGER,
  insight TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Correlation: High sleep score vs High mood
  RETURN QUERY
  SELECT
    'high_sleep_high_mood'::TEXT,
    'score >= 80'::TEXT,
    'mood >= 4'::TEXT,
    AVG(sl.sleep_score)::NUMERIC(5,2),
    AVG(ml.mood::NUMERIC)::NUMERIC(5,2),
    COUNT(*)::INTEGER,
    CASE
      WHEN AVG(ml.mood) >= 4 THEN 'Good sleep correlates with better mood'
      ELSE 'Correlation unclear'
    END::TEXT
  FROM public.sleep_logs sl
  INNER JOIN public.mood_logs ml ON ml.user_id = sl.user_id AND ml.log_date = sl.sleep_date
  WHERE sl.user_id = p_user_id
    AND sl.sleep_date >= CURRENT_DATE - p_days
    AND sl.sleep_score >= 80

  UNION ALL

  -- Correlation: Poor sleep vs Low energy
  SELECT
    'poor_sleep_low_energy'::TEXT,
    'score < 60'::TEXT,
    'energy <= 2'::TEXT,
    AVG(sl.sleep_score)::NUMERIC(5,2),
    AVG(ml.energy::NUMERIC)::NUMERIC(5,2),
    COUNT(*)::INTEGER,
    CASE
      WHEN COUNT(*) >= 3 THEN 'Poor sleep often leads to low energy'
      ELSE 'Not enough data for correlation'
    END::TEXT
  FROM public.sleep_logs sl
  INNER JOIN public.mood_logs ml ON ml.user_id = sl.user_id AND ml.log_date = sl.sleep_date
  WHERE sl.user_id = p_user_id
    AND sl.sleep_date >= CURRENT_DATE - p_days
    AND sl.sleep_score < 60

  UNION ALL

  -- Correlation: Consistent sleep vs Stress levels
  SELECT
    'consistent_sleep_low_stress'::TEXT,
    'consistency >= 80'::TEXT,
    'stress'::TEXT,
    AVG(sl.consistency_score)::NUMERIC(5,2),
    AVG(ml.stress::NUMERIC)::NUMERIC(5,2),
    COUNT(*)::INTEGER,
    CASE
      WHEN AVG(ml.stress) <= 2.5 THEN 'Consistent sleep associated with lower stress'
      ELSE 'Stress levels vary despite consistent sleep'
    END::TEXT
  FROM public.sleep_logs sl
  INNER JOIN public.mood_logs ml ON ml.user_id = sl.user_id AND ml.log_date = sl.sleep_date
  WHERE sl.user_id = p_user_id
    AND sl.sleep_date >= CURRENT_DATE - p_days
    AND sl.consistency_score >= 80;
END;
$$;

-- =====================================================
-- 13. CORRELATION FUNCTION - Sleep & Dream Correlation
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_sleep_dream_correlation(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  correlation_type TEXT,
  sleep_condition TEXT,
  dream_count INTEGER,
  avg_sleep_hours NUMERIC,
  avg_sleep_score NUMERIC,
  insight TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Correlation: Sleep duration and dream recall
  RETURN QUERY
  SELECT
    'duration_dream_recall'::TEXT,
    CASE
      WHEN sl.sleep_hours < 6 THEN 'short (<6h)'
      WHEN sl.sleep_hours >= 6 AND sl.sleep_hours < 8 THEN 'moderate (6-8h)'
      ELSE 'long (8+h)'
    END::TEXT,
    SUM(sl.dream_count)::INTEGER,
    AVG(sl.sleep_hours)::NUMERIC(5,2),
    AVG(sl.sleep_score)::NUMERIC(5,2),
    CASE
      WHEN SUM(sl.dream_count) > COUNT(*) * 0.7 THEN 'High dream recall in this range'
      WHEN SUM(sl.dream_count) > COUNT(*) * 0.3 THEN 'Moderate dream recall'
      ELSE 'Low dream recall in this range'
    END::TEXT
  FROM public.sleep_logs sl
  WHERE sl.user_id = p_user_id
    AND sl.sleep_date >= CURRENT_DATE - p_days
  GROUP BY
    CASE
      WHEN sl.sleep_hours < 6 THEN 'short (<6h)'
      WHEN sl.sleep_hours >= 6 AND sl.sleep_hours < 8 THEN 'moderate (6-8h)'
      ELSE 'long (8+h)'
    END

  UNION ALL

  -- Correlation: Sleep quality and dream recall
  SELECT
    'quality_dream_recall'::TEXT,
    CASE
      WHEN sl.grade IN ('S', 'A') THEN 'excellent (S/A grade)'
      WHEN sl.grade = 'B' THEN 'good (B grade)'
      ELSE 'poor (C-F grade)'
    END::TEXT,
    SUM(sl.dream_count)::INTEGER,
    AVG(sl.sleep_hours)::NUMERIC(5,2),
    AVG(sl.sleep_score)::NUMERIC(5,2),
    CASE
      WHEN AVG(sl.dream_count::NUMERIC) >= 1.0 THEN 'Better sleep quality linked to dream recall'
      ELSE 'Dream recall varies regardless of quality'
    END::TEXT
  FROM public.sleep_logs sl
  WHERE sl.user_id = p_user_id
    AND sl.sleep_date >= CURRENT_DATE - p_days
    AND sl.grade IS NOT NULL
  GROUP BY
    CASE
      WHEN sl.grade IN ('S', 'A') THEN 'excellent (S/A grade)'
      WHEN sl.grade = 'B' THEN 'good (B grade)'
      ELSE 'poor (C-F grade)'
    END;
END;
$$;

-- =====================================================
-- 14. SLEEP ACHIEVEMENTS
-- =====================================================
-- Insert sleep-related achievements into the achievements table

INSERT INTO public.achievements (code, name, description, icon, category, tier, xp_reward, criteria, sort_order, is_hidden)
VALUES
  -- Beginner achievements
  ('first_sleep_log', 'First Night Tracked', 'Log your first night of sleep', '🌙', 'beginner', 'bronze', 10, '{"type": "sleep_count", "threshold": 1}', 100, false),

  -- Consistency achievements
  ('sleep_streak_3', 'Three Nights Strong', 'Track sleep for 3 consecutive nights', '🔥', 'consistency', 'bronze', 30, '{"type": "sleep_streak", "threshold": 3}', 110, false),
  ('sleep_streak_7', 'Week of Sleep', 'Track sleep for 7 consecutive nights', '📅', 'consistency', 'silver', 70, '{"type": "sleep_streak", "threshold": 7}', 111, false),
  ('sleep_streak_30', 'Month of Tracking', 'Track sleep for 30 consecutive nights', '🗓️', 'consistency', 'gold', 200, '{"type": "sleep_streak", "threshold": 30}', 112, false),
  ('good_sleep_streak_7', 'Week of Good Sleep', 'Achieve A-grade or better for 7 consecutive nights', '⭐', 'consistency', 'gold', 150, '{"type": "good_sleep_streak", "threshold": 7}', 113, false),

  -- Quality achievements
  ('sleep_score_80', 'Sleep Champion', 'Achieve a sleep score of 80 or higher', '🏆', 'quality', 'silver', 50, '{"type": "sleep_score", "threshold": 80}', 120, false),
  ('sleep_score_90', 'Sleep Elite', 'Achieve a sleep score of 90 or higher', '💎', 'quality', 'gold', 100, '{"type": "sleep_score", "threshold": 90}', 121, false),
  ('sleep_score_perfect', 'Perfect Sleep', 'Achieve a perfect 100 sleep score', '🌟', 'quality', 'platinum', 200, '{"type": "sleep_score", "threshold": 100}', 122, false),
  ('optimal_range_7', 'Optimal Week', 'Sleep 7-9 hours for 7 consecutive nights', '✨', 'quality', 'gold', 100, '{"type": "optimal_range_streak", "threshold": 7}', 123, false),

  -- Volume achievements
  ('sleep_logs_30', 'Sleep Tracker', 'Log 30 nights of sleep', '📊', 'volume', 'silver', 75, '{"type": "sleep_count", "threshold": 30}', 130, false),
  ('sleep_logs_100', 'Sleep Scientist', 'Log 100 nights of sleep', '🔬', 'volume', 'gold', 200, '{"type": "sleep_count", "threshold": 100}', 131, false),
  ('sleep_logs_365', 'Year of Sleep', 'Log 365 nights of sleep', '🎊', 'volume', 'platinum', 500, '{"type": "sleep_count", "threshold": 365}', 132, false),

  -- Special achievements
  ('sleep_debt_free', 'Debt Free', 'Maintain zero sleep debt for 7 consecutive days', '💪', 'special', 'gold', 125, '{"type": "sleep_debt_free", "threshold": 7}', 140, false),
  ('consistency_master', 'Consistency Master', 'Achieve 90+ consistency score for 14 days', '🎯', 'special', 'platinum', 150, '{"type": "consistency_streak", "threshold": 14, "min_score": 90}', 141, false),
  ('early_riser', 'Early Bird', 'Wake up before 6 AM for 7 consecutive days', '🐦', 'special', 'gold', 100, '{"type": "wake_time", "before": "06:00", "streak": 7}', 142, true),
  ('night_owl', 'Night Owl', 'Go to bed after midnight for 7 consecutive days', '🦉', 'special', 'gold', 100, '{"type": "bedtime", "after": "00:00", "streak": 7}', 143, true)
ON CONFLICT (code) DO NOTHING; -- Don't insert if achievement already exists

-- =====================================================
-- 15. HELPER FUNCTION - Get User's Typical Sleep Hours
-- =====================================================
-- Returns user's average sleep hours over last 30 days (for personalized baselines)

CREATE OR REPLACE FUNCTION public.get_typical_sleep_hours(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  v_typical_hours FLOAT;
BEGIN
  SELECT AVG(sleep_hours)
  INTO v_typical_hours
  FROM public.sleep_logs
  WHERE user_id = p_user_id
    AND sleep_date >= CURRENT_DATE - p_days
    AND sleep_hours IS NOT NULL;

  -- If no data, return default optimal (8 hours)
  RETURN COALESCE(v_typical_hours, 8.0);
END;
$$;

-- =====================================================
-- 16. HELPER FUNCTION - Get Sleep Debt
-- =====================================================
-- Returns total sleep debt over last N days

CREATE OR REPLACE FUNCTION public.get_sleep_debt(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debt FLOAT;
BEGIN
  SELECT SUM(GREATEST(0, sleep_deficit_hours))
  INTO v_total_debt
  FROM public.sleep_logs
  WHERE user_id = p_user_id
    AND sleep_date >= CURRENT_DATE - p_days
    AND sleep_deficit_hours IS NOT NULL;

  RETURN COALESCE(v_total_debt, 0.0);
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the migration was successful:
--
-- 1. Check tables exist:
--    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'sleep%';
--
-- 2. Check functions exist:
--    SELECT proname FROM pg_proc WHERE proname LIKE '%sleep%';
--
-- 3. Check views exist:
--    SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE '%sleep%';
--
-- 4. Check triggers exist:
--    SELECT tgname FROM pg_trigger WHERE tgname LIKE '%sleep%';
--
-- 5. Check achievements were inserted:
--    SELECT code, name, tier FROM achievements WHERE category IN ('quality', 'consistency') AND code LIKE 'sleep%';
--
-- =====================================================
-- USAGE EXAMPLES
-- =====================================================
--
-- 1. Insert a sleep log (score will be calculated automatically):
--    INSERT INTO sleep_logs (user_id, sleep_date, sleep_hours, sleep_quality, restfulness, ease_of_falling_asleep, interruptions_count)
--    VALUES ('user-uuid', '2025-12-14', 8.0, 4, 4, 5, 1);
--
-- 2. Get user's sleep trends:
--    SELECT * FROM v_sleep_trends WHERE user_id = 'user-uuid' ORDER BY sleep_date DESC LIMIT 30;
--
-- 3. Get sleep-mood correlation:
--    SELECT * FROM fn_sleep_mood_correlation('user-uuid', 30);
--
-- 4. Get user's typical sleep hours:
--    SELECT get_typical_sleep_hours('user-uuid', 30);
--
-- 5. Get current sleep debt:
--    SELECT get_sleep_debt('user-uuid', 7);
--
-- =====================================================
