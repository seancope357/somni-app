-- ONEIR Complete Migration - Run this entire file at once
-- This recreates the dreams table and adds all mood/events features

-- =====================================================
-- PART 1: Recreate Dreams Table (fixing missing id column)
-- =====================================================

-- Drop broken dreams table
DROP TABLE IF EXISTS public.dreams CASCADE;

-- Recreate dreams table properly
CREATE TABLE public.dreams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  interpretation text,
  sleep_hours float,
  symbols text[],
  emotions text[],
  themes text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX dreams_user_id_idx ON public.dreams(user_id);
CREATE INDEX dreams_created_at_idx ON public.dreams(created_at DESC);

-- Enable RLS
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own dreams."
  ON public.dreams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dreams."
  ON public.dreams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dreams."
  ON public.dreams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dreams."
  ON public.dreams FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PART 2: Extensions and New Features
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for life event categories
DO $$ BEGIN
  CREATE TYPE life_event_category AS ENUM (
    'work','relationship','health','travel','loss','achievement','social','finance','move','study','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- PART 3: New Tables
-- =====================================================

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time_local TIME NOT NULL DEFAULT '21:00',
  frequency TEXT NOT NULL DEFAULT 'daily',
  days_of_week SMALLINT[] DEFAULT NULL,
  channels JSONB NOT NULL DEFAULT '{"email": true, "push": false}',
  remind_for TEXT[] NOT NULL DEFAULT '{journal,mood}',
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Mood logs table
CREATE TABLE IF NOT EXISTS public.mood_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  stress SMALLINT NOT NULL CHECK (stress BETWEEN 1 AND 5),
  energy SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Life events table
CREATE TABLE IF NOT EXISTS public.life_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category life_event_category NOT NULL DEFAULT 'other',
  intensity SMALLINT CHECK (intensity BETWEEN 1 AND 5),
  date_start DATE NOT NULL,
  date_end DATE,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add mood_log_id to dreams table
ALTER TABLE public.dreams
  ADD COLUMN IF NOT EXISTS mood_log_id UUID REFERENCES public.mood_logs(id) ON DELETE SET NULL;

-- Dream-life events link table
CREATE TABLE IF NOT EXISTS public.dream_life_events (
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  life_event_id UUID NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dream_id, life_event_id)
);

-- Dream embeddings table
CREATE TABLE IF NOT EXISTS public.dream_embeddings (
  dream_id UUID PRIMARY KEY REFERENCES public.dreams(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 4: Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS life_events_user_date_idx ON public.life_events (user_id, date_start, COALESCE(date_end, date_start));
CREATE INDEX IF NOT EXISTS mood_logs_user_date_idx ON public.mood_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS dreams_user_date_idx ON public.dreams(user_id, created_at);
CREATE INDEX IF NOT EXISTS dreams_mood_log_idx ON public.dreams(mood_log_id);
CREATE INDEX IF NOT EXISTS dream_embeddings_vec_idx ON public.dream_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- PART 5: Functions and Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mood_logs_updated_at ON public.mood_logs;
CREATE TRIGGER trg_mood_logs_updated_at BEFORE UPDATE ON public.mood_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_life_events_updated_at ON public.life_events;
CREATE TRIGGER trg_life_events_updated_at BEFORE UPDATE ON public.life_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- PART 6: Row Level Security
-- =====================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
DROP POLICY IF EXISTS user_settings_select ON public.user_settings;
CREATE POLICY user_settings_select ON public.user_settings
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_insert ON public.user_settings;
CREATE POLICY user_settings_insert ON public.user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_update ON public.user_settings;
CREATE POLICY user_settings_update ON public.user_settings
FOR UPDATE USING (auth.uid() = user_id);

-- Policies for mood_logs
DROP POLICY IF EXISTS mood_logs_rw ON public.mood_logs;
CREATE POLICY mood_logs_rw ON public.mood_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for life_events
DROP POLICY IF EXISTS life_events_rw ON public.life_events;
CREATE POLICY life_events_rw ON public.life_events
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for dream_life_events
DROP POLICY IF EXISTS dream_life_events_rw ON public.dream_life_events;
CREATE POLICY dream_life_events_rw ON public.dream_life_events
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.life_events le WHERE le.id = life_event_id AND le.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.life_events le WHERE le.id = life_event_id AND le.user_id = auth.uid())
);

-- Policies for dream_embeddings
DROP POLICY IF EXISTS dream_embeddings_rw ON public.dream_embeddings;
CREATE POLICY dream_embeddings_rw ON public.dream_embeddings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
);

-- =====================================================
-- PART 7: Views
-- =====================================================

CREATE OR REPLACE VIEW public.v_user_daily_dreams AS
SELECT
  d.user_id,
  DATE(timezone(COALESCE(us.timezone, 'UTC'), d.created_at)) AS local_date,
  COUNT(*) AS dream_count
FROM public.dreams d
LEFT JOIN public.user_settings us ON us.user_id = d.user_id
GROUP BY d.user_id, DATE(timezone(COALESCE(us.timezone, 'UTC'), d.created_at));

CREATE OR REPLACE VIEW public.v_daily_with_mood AS
SELECT
  m.user_id,
  m.log_date AS local_date,
  m.mood,
  m.stress,
  m.energy,
  COALESCE(d.dream_count, 0) AS dream_count
FROM public.mood_logs m
LEFT JOIN public.v_user_daily_dreams d
  ON d.user_id = m.user_id AND d.local_date = m.log_date;

CREATE OR REPLACE VIEW public.v_event_days AS
SELECT
  le.user_id,
  g::DATE AS event_date,
  le.id AS event_id,
  le.category,
  le.intensity
FROM public.life_events le,
     generate_series(le.date_start, COALESCE(le.date_end, le.date_start), interval '1 day') g;

-- =====================================================
-- PART 8: Correlation Functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_mood_dream_correlations(p_user UUID)
RETURNS TABLE (
  dimension TEXT,
  value INT,
  days_with_dreams INT,
  total_days INT,
  dream_rate NUMERIC
) LANGUAGE sql AS $$
  WITH t AS (
    SELECT
      m.user_id,
      m.log_date AS day,
      m.mood,
      m.stress,
      m.energy,
      COALESCE(d.dream_count, 0) AS dream_count
    FROM public.mood_logs m
    LEFT JOIN public.v_user_daily_dreams d
      ON d.user_id = m.user_id AND d.local_date = m.log_date
    WHERE m.user_id = p_user
  )
  SELECT 'mood' AS dimension, mood AS value,
         SUM((dream_count > 0)::INT) AS days_with_dreams,
         COUNT(*)::INT AS total_days,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((dream_count > 0)::INT)::NUMERIC / COUNT(*) END AS dream_rate
  FROM t GROUP BY mood
  UNION ALL
  SELECT 'stress', stress, SUM((dream_count > 0)::INT), COUNT(*)::INT,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((dream_count > 0)::INT)::NUMERIC / COUNT(*) END
  FROM t GROUP BY stress
  UNION ALL
  SELECT 'energy', energy, SUM((dream_count > 0)::INT), COUNT(*)::INT,
         CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((dream_count > 0)::INT)::NUMERIC / COUNT(*) END
  FROM t GROUP BY energy
  ORDER BY dimension, value;
$$;

CREATE OR REPLACE FUNCTION public.fn_event_dream_correlations(p_user UUID, p_window INT DEFAULT 3)
RETURNS TABLE (
  category life_event_category,
  intensity INT,
  days_with_dreams INT,
  total_days INT,
  dream_rate NUMERIC
) LANGUAGE sql AS $$
  WITH date_range AS (
    SELECT
      COALESCE(MIN(local_date), CURRENT_DATE - INTERVAL '30 days') AS min_date,
      COALESCE(MAX(local_date), CURRENT_DATE) AS max_date
    FROM public.v_user_daily_dreams
    WHERE user_id = p_user
  ),
  days AS (
    SELECT generate_series(dr.min_date, dr.max_date, interval '1 day')::DATE AS day
    FROM date_range dr
  ),
  flags AS (
    SELECT
      d.day,
      COALESCE(vd.dream_count, 0) > 0 AS had_dream,
      ev.category,
      COALESCE(ev.intensity, 0) AS intensity
    FROM days d
    LEFT JOIN public.v_user_daily_dreams vd
      ON vd.user_id = p_user AND vd.local_date = d.day
    LEFT JOIN public.v_event_days ev
      ON ev.user_id = p_user
      AND ev.event_date BETWEEN (d.day - (p_window || ' days')::INTERVAL) AND d.day
    WHERE ev.category IS NOT NULL
  )
  SELECT
    category,
    intensity,
    SUM(had_dream::INT) AS days_with_dreams,
    COUNT(*)::INT AS total_days,
    CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(had_dream::INT)::NUMERIC / COUNT(*) END AS dream_rate
  FROM flags
  GROUP BY category, intensity
  ORDER BY dream_rate DESC NULLS LAST;
$$;

-- =====================================================
-- DONE! Migration Complete
-- =====================================================
-- Verify with: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
