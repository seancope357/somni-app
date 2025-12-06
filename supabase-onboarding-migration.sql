-- DREAMONEIR Onboarding Migration
-- This creates the user_onboarding table for storing comprehensive user profiles

-- Create user_onboarding table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Basic info
  preferred_name text,
  communication_style text, -- 'direct', 'gentle', 'balanced'

  -- Goals and motivations
  primary_goals text[],
  primary_goal_other text,

  -- Sleep and dream patterns
  sleep_schedule text, -- 'regular', 'irregular', 'shift-work'
  typical_sleep_hours float,
  sleep_quality text, -- 'excellent', 'good', 'fair', 'poor'
  dream_recall_frequency text, -- 'never', 'rarely', 'sometimes', 'often', 'always'
  dream_types text[], -- 'vivid', 'fragmented', 'recurring', 'lucid', 'nightmares', 'symbolic'
  recurring_themes text[],
  recurring_symbols text[],

  -- Psychological perspective preferences
  preferred_perspectives text[], -- 'jungian', 'freudian', 'cognitive', 'synthesized'
  perspective_interest_level text, -- 'very-interested', 'somewhat-interested', 'not-interested'

  -- Life context (optional)
  current_life_context text, -- free text
  major_life_events text[],
  relationship_status text, -- 'single', 'partnered', 'married', 'complicated', 'prefer-not-to-say'
  work_situation text, -- 'employed', 'student', 'unemployed', 'retired', 'other'

  -- Emotional processing
  emotional_processing_style text[], -- 'journaling', 'talking', 'creative', 'physical', 'meditation', 'other'
  stress_level text, -- 'low', 'moderate', 'high', 'very-high'
  primary_stressors text[],

  -- Safety and boundaries
  topics_to_avoid text[],
  comfort_with_depth text, -- 'surface', 'moderate', 'deep'

  -- Mental health context (optional, sensitive)
  mental_health_context text, -- free text, optional
  therapy_experience boolean,
  meditation_practice boolean,

  -- Notification preferences
  notification_preference text, -- 'immediate', 'daily-summary', 'weekly-report', 'none'
  privacy_level text, -- 'private', 'anonymous-insights', 'community-sharing'

  -- Metadata
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  evaluation_notes text, -- For future AI insights
  flags_for_followup text[],

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS user_onboarding_user_id_idx ON public.user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS user_onboarding_completed_idx ON public.user_onboarding(completed);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own onboarding."
  ON public.user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding."
  ON public.user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding."
  ON public.user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

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
-- This provides quick access without joining to user_onboarding table
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
