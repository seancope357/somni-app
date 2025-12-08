-- DREAMONEIR Weekly Digest & Timeline Migration
-- Creates tables for weekly AI digests

-- Create weekly_digests table
CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Date range for this digest
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,

  -- AI-generated content
  summary text NOT NULL,
  pattern_trends jsonb, -- Array of trend objects
  mood_insights jsonb,  -- Mood correlation analysis
  goal_progress jsonb,  -- Progress on user's onboarding goals
  reflection_prompts text[], -- Array of reflection questions

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
CREATE POLICY "Users can view own digests."
  ON public.weekly_digests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digests."
  ON public.weekly_digests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digests."
  ON public.weekly_digests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own digests."
  ON public.weekly_digests FOR DELETE
  USING (auth.uid() = user_id);
