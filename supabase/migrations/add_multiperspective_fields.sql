-- Migration: Add multi-perspective dream analysis fields
-- Created: 2025-11-25
-- Description: Adds support for Jungian, Freudian, and Cognitive/Evolutionary perspectives

-- Add new columns to dreams table for multi-perspective analysis
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
