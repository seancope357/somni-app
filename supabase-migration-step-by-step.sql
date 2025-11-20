-- ONEIR App: Mood Tracking & Life Events Migration (Step-by-Step)
-- Run each section separately to identify any issues

-- =====================================================
-- STEP 1: Extensions (run this first)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector; -- for dream themes/embeddings

-- =====================================================
-- STEP 2: Enums (run after step 1)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE life_event_category AS ENUM (
    'work','relationship','health','travel','loss','achievement','social','finance','move','study','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- STEP 3: Create user_settings table
-- =====================================================
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

-- =====================================================
-- STEP 4: Create mood_logs table
-- =====================================================
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

-- =====================================================
-- STEP 5: Create life_events table
-- =====================================================
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

-- =====================================================
-- STEP 6: Add mood_log_id to dreams table (if not exists)
-- Check your dreams table first!
-- =====================================================
-- First, let's check if dreams table has the id column:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dreams';

-- Only run this if mood_log_id doesn't exist yet:
ALTER TABLE public.dreams
  ADD COLUMN IF NOT EXISTS mood_log_id UUID REFERENCES public.mood_logs(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 7: Create dream_life_events link table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dream_life_events (
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  life_event_id UUID NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dream_id, life_event_id)
);

-- =====================================================
-- STEP 8: Create dream_embeddings table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dream_embeddings (
  dream_id UUID PRIMARY KEY REFERENCES public.dreams(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- STEP 9: Create indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS life_events_user_date_idx ON public.life_events (user_id, date_start, COALESCE(date_end, date_start));
CREATE INDEX IF NOT EXISTS mood_logs_user_date_idx ON public.mood_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS dreams_user_date_idx ON public.dreams(user_id, created_at);
CREATE INDEX IF NOT EXISTS dreams_mood_log_idx ON public.dreams(mood_log_id);

-- Vector index (may take time on large tables)
CREATE INDEX IF NOT EXISTS dream_embeddings_vec_idx ON public.dream_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- STEP 10: Create/update timestamp functions
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- =====================================================
-- STEP 11: Create triggers
-- =====================================================
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
-- STEP 12: Enable RLS
-- =====================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_embeddings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 13: Create RLS Policies - user_settings
-- =====================================================
DROP POLICY IF EXISTS user_settings_select ON public.user_settings;
CREATE POLICY user_settings_select ON public.user_settings
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_insert ON public.user_settings;
CREATE POLICY user_settings_insert ON public.user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_update ON public.user_settings;
CREATE POLICY user_settings_update ON public.user_settings
FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 14: Create RLS Policies - mood_logs
-- =====================================================
DROP POLICY IF EXISTS mood_logs_rw ON public.mood_logs;
CREATE POLICY mood_logs_rw ON public.mood_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STEP 15: Create RLS Policies - life_events
-- =====================================================
DROP POLICY IF EXISTS life_events_rw ON public.life_events;
CREATE POLICY life_events_rw ON public.life_events
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STEP 16: Create RLS Policies - dream_life_events
-- =====================================================
DROP POLICY IF EXISTS dream_life_events_rw ON public.dream_life_events;
CREATE POLICY dream_life_events_rw ON public.dream_life_events
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.life_events le WHERE le.id = life_event_id AND le.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.life_events le WHERE le.id = life_event_id AND le.user_id = auth.uid())
);

-- =====================================================
-- STEP 17: Create RLS Policies - dream_embeddings
-- =====================================================
DROP POLICY IF EXISTS dream_embeddings_rw ON public.dream_embeddings;
CREATE POLICY dream_embeddings_rw ON public.dream_embeddings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
);

-- =====================================================
-- STEP 18: Create correlation views
-- =====================================================

-- Daily dreams view
CREATE OR REPLACE VIEW public.v_user_daily_dreams AS
SELECT
  d.user_id,
  DATE(timezone(COALESCE(us.timezone, 'UTC'), d.created_at)) AS local_date,
  COUNT(*) AS dream_count
FROM public.dreams d
LEFT JOIN public.user_settings us ON us.user_id = d.user_id
GROUP BY d.user_id, DATE(timezone(COALESCE(us.timezone, 'UTC'), d.created_at));

-- Daily mood with dreams
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

-- Expanded event days
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
-- STEP 19: Create correlation functions
-- =====================================================

-- Mood-dream correlation function
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

-- Event-dream correlation function
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
-- DONE! Verify everything worked:
-- =====================================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_settings', 'mood_logs', 'life_events', 'dream_life_events', 'dream_embeddings');
-- SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_%';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'fn_%';
