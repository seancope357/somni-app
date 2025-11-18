-- SOMNI App: Mood Tracking, Life Events, Reminders & Themes Migration
-- Run this in your Supabase SQL Editor

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector; -- for dream themes/embeddings

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE life_event_category AS ENUM (
    'work','relationship','health','travel','loss','achievement','social','finance','move','study','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time_local TIME NOT NULL DEFAULT '21:00',
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'weekdays' | 'custom'
  days_of_week SMALLINT[] DEFAULT NULL, -- 0-6 (Sun-Sat) if custom
  channels JSONB NOT NULL DEFAULT '{"email": true, "push": false}',
  remind_for TEXT[] NOT NULL DEFAULT '{journal,mood}',
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 4) mood_logs table
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

-- 5) life_events table
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

-- 6) Update dreams table with mood link
ALTER TABLE public.dreams
  ADD COLUMN IF NOT EXISTS mood_log_id UUID REFERENCES public.mood_logs(id) ON DELETE SET NULL;

-- 7) dream_life_events link table (many-to-many)
CREATE TABLE IF NOT EXISTS public.dream_life_events (
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  life_event_id UUID NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dream_id, life_event_id)
);

-- 8) dream_embeddings table for semantic search
CREATE TABLE IF NOT EXISTS public.dream_embeddings (
  dream_id UUID PRIMARY KEY REFERENCES public.dreams(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- text-embedding-3-small dimension
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9) Indexes for performance
CREATE INDEX IF NOT EXISTS life_events_user_date_idx ON public.life_events (user_id, date_start, COALESCE(date_end, date_start));
CREATE INDEX IF NOT EXISTS mood_logs_user_date_idx ON public.mood_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS dreams_user_date_idx ON public.dreams(user_id, created_at);
CREATE INDEX IF NOT EXISTS dreams_mood_log_idx ON public.dreams(mood_log_id);
CREATE INDEX IF NOT EXISTS dream_embeddings_vec_idx ON public.dream_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 10) Timestamps auto-update function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- 11) Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mood_logs_updated_at ON public.mood_logs;
CREATE TRIGGER trg_mood_logs_updated_at BEFORE UPDATE ON public.mood_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_life_events_updated_at ON public.life_events;
CREATE TRIGGER trg_life_events_updated_at BEFORE UPDATE ON public.life_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12) Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_embeddings ENABLE ROW LEVEL SECURITY;

-- 13) RLS Policies for user_settings
CREATE POLICY user_settings_select ON public.user_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert ON public.user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_settings_update ON public.user_settings
FOR UPDATE USING (auth.uid() = user_id);

-- 14) RLS Policies for mood_logs
CREATE POLICY mood_logs_rw ON public.mood_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 15) RLS Policies for life_events
CREATE POLICY life_events_rw ON public.life_events
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 16) RLS Policies for dream_life_events (must own both sides)
CREATE POLICY dream_life_events_rw ON public.dream_life_events
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.life_events le WHERE le.id = life_event_id AND le.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.life_events le WHERE le.id = life_event_id AND le.user_id = auth.uid())
);

-- 17) RLS Policies for dream_embeddings (must own dream)
CREATE POLICY dream_embeddings_rw ON public.dream_embeddings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.dreams d WHERE d.id = dream_id AND d.user_id = auth.uid())
);

-- 18) Correlation views and helper functions
-- Note: Views cannot have indexes, but we can add indexes to base tables later

-- Daily dreams view (aligns to user timezone)
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

-- Expanded event days (for date range events)
CREATE OR REPLACE VIEW public.v_event_days AS
SELECT
  le.user_id,
  g::DATE AS event_date,
  le.id AS event_id,
  le.category,
  le.intensity
FROM public.life_events le,
     generate_series(le.date_start, COALESCE(le.date_end, le.date_start), interval '1 day') g;

-- 19) Mood-dream correlation function
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

-- 20) Event-dream correlation function (with window)
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

-- Migration complete!
-- Next steps:
-- 1. Add RESEND_API_KEY, OPENAI_API_KEY, REMINDERS_CRON_SECRET to your environment
-- 2. Generate TypeScript types: npx supabase gen types typescript --schema public > src/lib/supabase-types.ts
-- 3. Implement the API routes and frontend components
