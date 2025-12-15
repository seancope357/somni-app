# Sleep Score Feature Specification
## DREAMONEIR Sleep Health Tracking System

**Version:** 1.0
**Date:** 2025-12-14
**Status:** Design Specification

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Research Foundation](#research-foundation)
3. [Score Calculation Methodology](#score-calculation-methodology)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Business Logic Functions](#business-logic-functions)
7. [UI/UX Design](#uiux-design)
8. [Integration Points](#integration-points)
9. [Implementation Phases](#implementation-phases)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

The Sleep Score feature adds comprehensive sleep health tracking to DREAMONEIR by calculating daily and weekly sleep quality scores (0-100) based on industry-standard sleep science. The system leverages existing data (sleep hours from dream entries, mood/energy levels from mood logs) to provide actionable insights without requiring additional user input.

**Key Features:**
- Daily sleep score (0-100) calculated from duration, consistency, and quality indicators
- Weekly trends and patterns analysis
- Sleep debt tracking
- Personalized recommendations
- Integration with gamification system (XP rewards for healthy sleep)
- Historical analysis and insights

**Data Sources:**
- `dreams.sleep_hours` - Sleep duration per night
- `mood_logs.energy` - Quality indicator (restoration level)
- `mood_logs.stress` - Quality modifier
- Temporal consistency patterns from date sequences

---

## Research Foundation

### Industry Standards

Based on research from leading sleep health organizations:

#### National Sleep Foundation Sleep Health Index (SHI)
- **Methodology**: 3-domain model (quality, duration, disordered sleep)
- **Scale**: 0-100 (higher = better sleep health)
- **Key Finding**: Validated instrument linking sleep quality, duration, and sleep disorders
- **Source**: [Sleep Health Journal](https://www.sleephealthjournal.org/article/S2352-7218(17)30102X/fulltext)

#### Pittsburgh Sleep Quality Index (PSQI)
- **Components**: 7 factors including subjective quality, latency, duration, efficiency, disturbances, medication use, daytime dysfunction
- **Clinical Threshold**: Score >5 indicates significant sleep problems
- **Application**: Widely used clinical assessment tool
- **Source**: [Sleep.pitt.edu](https://www.sleep.pitt.edu/psqi)

#### Wearable Device Algorithms

**Fitbit Sleep Score:**
- **Components**: Time asleep (duration), Deep/REM sleep, Restoration (heart rate recovery)
- **Scale**: 0-100, average user score 72-83
- **Methodology**: Heart rate variability, movement patterns, sleep stages
- **Source**: [Fitbit Help Center](https://support.google.com/fitbit/answer/14236513)

**Oura Ring Sleep Tracking:**
- **Accuracy**: 79% agreement with polysomnography (gold standard)
- **Technology**: Machine learning on large sleep dataset
- **Validation**: Outperforms other consumer devices in clinical studies
- **Source**: [Oura Ring Validation Study](https://ouraring.com/blog/2024-sensors-oura-ring-validation-study/)

#### Key Research Findings

From npj Science of Learning (Nature):
- **Three Critical Factors**: Duration, Consistency, Quality
- **Impact**: These 3 factors account for 24.44% variance in performance/well-being
- **Consistency**: Regular sleep/wake times as important as duration
- **Source**: [Nature Article](https://www.nature.com/articles/s41539-019-0055-z)

### Optimal Sleep Ranges

**National Sleep Foundation Recommendations:**
- Adults (18-64): 7-9 hours
- Young Adults (18-25): 7-9 hours
- Older Adults (65+): 7-8 hours

**Sleep Debt Research:**
- Cumulative sleep debt impacts performance even when individual nights meet minimum
- Recovery requires sustained adequate sleep, not just "catch-up"

---

## Score Calculation Methodology

### Overall Sleep Score Formula

```
Daily Sleep Score = (Duration Score × 0.40) +
                    (Consistency Score × 0.30) +
                    (Quality Score × 0.30)
```

**Rationale for Weights:**
- **Duration (40%)**: Most fundamental factor; basis for other measurements
- **Consistency (30%)**: Research shows regularity equally impacts outcomes
- **Quality (30%)**: Subjective and objective indicators of restoration

All component scores are normalized to 0-100 scale, then weighted.

---

### Component 1: Duration Score (40% weight)

**Calculation Method:**

```typescript
function calculateDurationScore(sleepHours: number): number {
  const OPTIMAL_MIN = 7
  const OPTIMAL_MAX = 9
  const CRITICAL_MIN = 4
  const CRITICAL_MAX = 12

  // Perfect range: 7-9 hours = 100 points
  if (sleepHours >= OPTIMAL_MIN && sleepHours <= OPTIMAL_MAX) {
    return 100
  }

  // Below optimal (4-7 hours): linear decline
  if (sleepHours < OPTIMAL_MIN) {
    if (sleepHours < CRITICAL_MIN) return 0
    const deficit = OPTIMAL_MIN - sleepHours
    return Math.max(0, 100 - (deficit / (OPTIMAL_MIN - CRITICAL_MIN)) * 100)
  }

  // Above optimal (9-12 hours): gentler decline
  if (sleepHours > OPTIMAL_MAX) {
    if (sleepHours > CRITICAL_MAX) return 25
    const excess = sleepHours - OPTIMAL_MAX
    return Math.max(25, 100 - (excess / (CRITICAL_MAX - OPTIMAL_MAX)) * 50)
  }

  return 100
}
```

**Scoring Table:**

| Sleep Hours | Score | Category |
|-------------|-------|----------|
| <4 hours | 0 | Critical |
| 4-5 hours | 33 | Poor |
| 5-6 hours | 67 | Fair |
| 6-7 hours | 90 | Good |
| 7-9 hours | 100 | Optimal |
| 9-10 hours | 75 | Good |
| 10-11 hours | 50 | Fair |
| >11 hours | 25-50 | Poor |

**Data Source:** `dreams.sleep_hours` (float)

---

### Component 2: Consistency Score (30% weight)

**Calculation Method:**

Based on standard deviation of sleep duration over rolling 7-day window:

```typescript
function calculateConsistencyScore(sleepHoursArray: number[]): number {
  // Need at least 3 nights of data
  if (sleepHoursArray.length < 3) {
    return 50 // Neutral score for insufficient data
  }

  const mean = sleepHoursArray.reduce((a, b) => a + b) / sleepHoursArray.length
  const variance = sleepHoursArray.reduce((sum, val) =>
    sum + Math.pow(val - mean, 2), 0) / sleepHoursArray.length
  const stdDev = Math.sqrt(variance)

  // Scoring based on standard deviation
  // 0-0.5 hrs variation = Perfect (100)
  // 0.5-1 hrs = Excellent (85-100)
  // 1-1.5 hrs = Good (70-85)
  // 1.5-2 hrs = Fair (50-70)
  // >2 hrs = Poor (<50)

  if (stdDev <= 0.5) return 100
  if (stdDev <= 1.0) return Math.round(85 + ((1.0 - stdDev) / 0.5) * 15)
  if (stdDev <= 1.5) return Math.round(70 + ((1.5 - stdDev) / 0.5) * 15)
  if (stdDev <= 2.0) return Math.round(50 + ((2.0 - stdDev) / 0.5) * 20)

  return Math.max(0, Math.round(50 - ((stdDev - 2.0) * 10)))
}
```

**Additional Consistency Metrics:**

1. **Bedtime Regularity:** Calculate variance in dream log timestamps
2. **Weekly Pattern Score:** Bonus for maintaining consistent sleep on weekends
3. **Gap Penalty:** Deduction for missing nights of data

**Data Source:** `dreams.created_at` + `dreams.sleep_hours` (7-day rolling window)

---

### Component 3: Quality Score (30% weight)

**Calculation Method:**

Quality is inferred from mood log energy and stress levels:

```typescript
function calculateQualityScore(
  energyLevel: number,      // 1-5 from mood_logs
  stressLevel: number,      // 1-5 from mood_logs
  sleepDuration: number     // hours
): number {
  // Base quality from energy (primary indicator)
  // Energy 5 = 100, Energy 1 = 20 (linear scale)
  const energyScore = 20 + ((energyLevel - 1) / 4) * 80

  // Stress modifier (inverted: high stress = poor quality)
  // Stress 1 = no penalty, Stress 5 = -20 points
  const stressPenalty = ((stressLevel - 1) / 4) * 20

  // Restoration efficiency (energy relative to sleep duration)
  let efficiencyBonus = 0
  if (sleepDuration >= 7 && sleepDuration <= 9 && energyLevel >= 4) {
    efficiencyBonus = 10 // Bonus for optimal sleep yielding high energy
  }

  const rawScore = energyScore - stressPenalty + efficiencyBonus
  return Math.max(0, Math.min(100, Math.round(rawScore)))
}
```

**Fallback for Missing Mood Data:**

If no mood log exists for the day:
- Use 7-day average quality score if available
- Otherwise, use neutral 70 (assume "good" quality for duration in optimal range)

**Data Source:** `mood_logs.energy`, `mood_logs.stress` (linked via `dreams.mood_log_id` or date matching)

---

### Daily Sleep Score Aggregation

**Complete Daily Score:**

```typescript
interface DailySleepScore {
  user_id: string
  score_date: string         // YYYY-MM-DD
  total_score: number        // 0-100 (weighted average)
  duration_score: number     // 0-100
  consistency_score: number  // 0-100
  quality_score: number      // 0-100
  sleep_hours: number        // actual hours
  grade: string              // S, A, B, C, D, F
  insights: string[]         // Array of insight messages
}
```

**Grade Mapping:**

| Score Range | Grade | Description |
|-------------|-------|-------------|
| 90-100 | S | Exceptional |
| 80-89 | A | Excellent |
| 70-79 | B | Good |
| 60-69 | C | Fair |
| 50-59 | D | Poor |
| <50 | F | Critical |

---

### Weekly Sleep Score

**Aggregation Formula:**

```typescript
function calculateWeeklyScore(dailyScores: DailySleepScore[]): WeeklySleepScore {
  const avgTotal = dailyScores.reduce((sum, d) => sum + d.total_score, 0) / dailyScores.length
  const avgDuration = dailyScores.reduce((sum, d) => sum + d.sleep_hours, 0) / dailyScores.length

  // Calculate sleep debt (cumulative deviation from optimal)
  const sleepDebt = dailyScores.reduce((debt, day) => {
    const optimalMid = 8 // midpoint of 7-9 range
    return debt + Math.max(0, optimalMid - day.sleep_hours)
  }, 0)

  // Trend analysis
  const trend = analyzeTrend(dailyScores)

  return {
    week_start_date: dailyScores[0].score_date,
    week_end_date: dailyScores[dailyScores.length - 1].score_date,
    avg_score: Math.round(avgTotal),
    avg_duration: parseFloat(avgDuration.toFixed(1)),
    sleep_debt_hours: parseFloat(sleepDebt.toFixed(1)),
    trend: trend, // 'improving' | 'stable' | 'declining'
    nights_tracked: dailyScores.length,
    grade: getGrade(avgTotal)
  }
}
```

---

### Sleep Debt Calculation

**Cumulative Debt Tracking:**

```typescript
interface SleepDebtMetrics {
  total_debt_hours: number      // Cumulative deficit from optimal
  debt_per_night: number         // Average nightly deficit
  recovery_nights_needed: number // Estimated nights to recover
  severity: 'none' | 'mild' | 'moderate' | 'severe'
}

function calculateSleepDebt(last30Days: DailySleepScore[]): SleepDebtMetrics {
  const OPTIMAL = 8 // hours
  const RECOVERY_RATE = 0.25 // recover 0.25 hrs debt per optimal night

  let totalDebt = 0
  let surplusNights = 0

  for (const day of last30Days) {
    const deviation = OPTIMAL - day.sleep_hours
    if (deviation > 0) {
      totalDebt += deviation
    } else {
      surplusNights++
    }
  }

  const avgDebt = totalDebt / last30Days.length
  const recoveryNights = Math.ceil(totalDebt / RECOVERY_RATE)

  let severity: 'none' | 'mild' | 'moderate' | 'severe'
  if (totalDebt < 5) severity = 'none'
  else if (totalDebt < 10) severity = 'mild'
  else if (totalDebt < 20) severity = 'moderate'
  else severity = 'severe'

  return {
    total_debt_hours: parseFloat(totalDebt.toFixed(1)),
    debt_per_night: parseFloat(avgDebt.toFixed(2)),
    recovery_nights_needed: recoveryNights,
    severity
  }
}
```

---

## Database Schema

### New Tables

#### 1. `sleep_scores` Table

Primary storage for calculated daily sleep scores:

```sql
CREATE TABLE public.sleep_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,

  -- Overall score
  total_score SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  grade VARCHAR(1) NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D', 'F')),

  -- Component scores
  duration_score SMALLINT NOT NULL CHECK (duration_score BETWEEN 0 AND 100),
  consistency_score SMALLINT NOT NULL CHECK (consistency_score BETWEEN 0 AND 100),
  quality_score SMALLINT NOT NULL CHECK (quality_score BETWEEN 0 AND 100),

  -- Raw metrics
  sleep_hours FLOAT NOT NULL,
  consistency_std_dev FLOAT,
  energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 5),
  stress_level SMALLINT CHECK (stress_level BETWEEN 1 AND 5),

  -- Calculated insights
  sleep_deficit_hours FLOAT, -- Difference from optimal 8hrs
  is_optimal_range BOOLEAN, -- True if 7-9 hours

  -- Metadata
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  mood_log_id UUID REFERENCES public.mood_logs(id) ON DELETE SET NULL,
  calculation_version VARCHAR(10) NOT NULL DEFAULT '1.0',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, score_date)
);

-- Indexes
CREATE INDEX sleep_scores_user_date_idx ON public.sleep_scores(user_id, score_date DESC);
CREATE INDEX sleep_scores_total_score_idx ON public.sleep_scores(user_id, total_score);
CREATE INDEX sleep_scores_grade_idx ON public.sleep_scores(user_id, grade);

-- RLS Policies
ALTER TABLE public.sleep_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY sleep_scores_rw ON public.sleep_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER trg_sleep_scores_updated_at
  BEFORE UPDATE ON public.sleep_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

#### 2. `weekly_sleep_summaries` Table

Aggregated weekly statistics:

```sql
CREATE TABLE public.weekly_sleep_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Aggregate scores
  avg_total_score SMALLINT NOT NULL,
  avg_duration_hours FLOAT NOT NULL,
  avg_quality_score SMALLINT NOT NULL,
  grade VARCHAR(1) NOT NULL,

  -- Sleep debt
  total_sleep_debt FLOAT NOT NULL DEFAULT 0,
  debt_severity VARCHAR(10) CHECK (debt_severity IN ('none', 'mild', 'moderate', 'severe')),

  -- Patterns
  most_consistent_metric VARCHAR(20), -- 'duration' | 'quality' | 'timing'
  worst_night_date DATE,
  best_night_date DATE,
  nights_tracked SMALLINT NOT NULL,

  -- Trend analysis
  trend VARCHAR(10) CHECK (trend IN ('improving', 'stable', 'declining')),
  trend_direction SMALLINT, -- +1, 0, -1

  -- AI-generated insights
  ai_summary TEXT,
  recommendations TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, week_start_date)
);

-- Indexes
CREATE INDEX weekly_sleep_summaries_user_week_idx
  ON public.weekly_sleep_summaries(user_id, week_start_date DESC);

-- RLS
ALTER TABLE public.weekly_sleep_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_sleep_summaries_rw ON public.weekly_sleep_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

#### 3. `sleep_insights` Table

Personalized insights and recommendations:

```sql
CREATE TABLE public.sleep_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Insight metadata
  insight_type VARCHAR(30) NOT NULL, -- 'pattern', 'recommendation', 'achievement', 'warning'
  category VARCHAR(20) NOT NULL,     -- 'duration', 'consistency', 'quality', 'debt'
  priority SMALLINT NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_items TEXT[],

  -- Display control
  is_viewed BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sleep_insights_user_date_idx ON public.sleep_insights(user_id, insight_date DESC);
CREATE INDEX sleep_insights_unviewed_idx
  ON public.sleep_insights(user_id, is_viewed) WHERE NOT is_viewed;

ALTER TABLE public.sleep_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY sleep_insights_rw ON public.sleep_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Schema Migration SQL

Complete migration file: `/supabase-migrations/sleep-score-migration.sql`

```sql
-- =====================================================
-- SLEEP SCORE FEATURE MIGRATION
-- Version: 1.0
-- Date: 2025-12-14
-- =====================================================

-- Prerequisites: Requires existing dreams, mood_logs tables

BEGIN;

-- Create sleep_scores table
-- [Full SQL from above]

-- Create weekly_sleep_summaries table
-- [Full SQL from above]

-- Create sleep_insights table
-- [Full SQL from above]

-- Create views for common queries
CREATE OR REPLACE VIEW public.v_user_sleep_overview AS
SELECT
  u.id AS user_id,
  COUNT(ss.id) AS total_nights_tracked,
  AVG(ss.total_score) AS avg_score,
  AVG(ss.sleep_hours) AS avg_sleep_hours,
  MAX(ss.score_date) AS last_tracked_date,
  (SELECT grade FROM public.sleep_scores
   WHERE user_id = u.id
   ORDER BY score_date DESC LIMIT 1) AS current_grade
FROM auth.users u
LEFT JOIN public.sleep_scores ss ON ss.user_id = u.id
GROUP BY u.id;

-- Function: Auto-calculate sleep score when dream is logged
CREATE OR REPLACE FUNCTION public.calculate_sleep_score_on_dream()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger sleep score calculation
  -- (Actual calculation done in application layer via API call)
  PERFORM pg_notify('sleep_score_needed',
    json_build_object('user_id', NEW.user_id, 'dream_id', NEW.id)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dream_sleep_score
  AFTER INSERT OR UPDATE OF sleep_hours ON public.dreams
  FOR EACH ROW
  WHEN (NEW.sleep_hours IS NOT NULL)
  EXECUTE FUNCTION public.calculate_sleep_score_on_dream();

COMMIT;
```

---

## API Endpoints

### 1. Calculate Daily Sleep Score

**Endpoint:** `POST /api/sleep-score/calculate`

**Purpose:** Calculate and store sleep score for a specific date

**Request Body:**
```typescript
{
  userId: string
  date: string          // YYYY-MM-DD
  dreamId?: string      // Optional: link to specific dream
  forceRecalculate?: boolean // Recalc even if exists
}
```

**Response:**
```typescript
{
  score: DailySleepScore
  insights: string[]
  xp_awarded?: number
  achievement_unlocked?: Achievement
}
```

**Implementation:** `/src/app/api/sleep-score/calculate/route.ts`

```typescript
export async function POST(request: Request) {
  const { userId, date, dreamId, forceRecalculate } = await request.json()

  // 1. Check if score already exists
  const existing = await supabase
    .from('sleep_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('score_date', date)
    .single()

  if (existing.data && !forceRecalculate) {
    return NextResponse.json(existing.data)
  }

  // 2. Get dream data (sleep hours)
  const dream = await getDreamForDate(userId, date, dreamId)
  if (!dream?.sleep_hours) {
    return NextResponse.json({ error: 'No sleep data for date' }, { status: 404 })
  }

  // 3. Calculate component scores
  const durationScore = calculateDurationScore(dream.sleep_hours)

  const last7Days = await getLast7DaysSleepHours(userId, date)
  const consistencyScore = calculateConsistencyScore(last7Days)

  const moodLog = await getMoodLogForDate(userId, date)
  const qualityScore = calculateQualityScore(
    moodLog?.energy || null,
    moodLog?.stress || null,
    dream.sleep_hours
  )

  // 4. Calculate total score
  const totalScore = Math.round(
    durationScore * 0.40 +
    consistencyScore * 0.30 +
    qualityScore * 0.30
  )

  const grade = getGrade(totalScore)

  // 5. Save to database
  const { data: score } = await supabase
    .from('sleep_scores')
    .upsert({
      user_id: userId,
      score_date: date,
      total_score: totalScore,
      duration_score: durationScore,
      consistency_score: consistencyScore,
      quality_score: qualityScore,
      sleep_hours: dream.sleep_hours,
      grade,
      dream_id: dream.id,
      mood_log_id: moodLog?.id || null,
      sleep_deficit_hours: 8 - dream.sleep_hours,
      is_optimal_range: dream.sleep_hours >= 7 && dream.sleep_hours <= 9
    })
    .select()
    .single()

  // 6. Generate insights
  const insights = generateInsights(score, last7Days)

  // 7. Gamification integration
  let xpAwarded = 0
  if (totalScore >= 80) {
    xpAwarded = 15
    await awardXP(userId, xpAwarded, 'Excellent sleep score')
  }

  await updateDailyStats(userId, { sleep_scores_calculated: 1 })
  const achievementCheck = await checkAchievements(userId, 'sleep_score')

  return NextResponse.json({
    score,
    insights,
    xp_awarded: xpAwarded,
    achievement_unlocked: achievementCheck.newly_unlocked[0]
  })
}
```

---

### 2. Get Sleep Score History

**Endpoint:** `GET /api/sleep-score/history`

**Query Parameters:**
- `userId` (required)
- `from` (YYYY-MM-DD)
- `to` (YYYY-MM-DD)
- `limit` (default: 30)

**Response:**
```typescript
{
  scores: DailySleepScore[]
  summary: {
    avg_score: number
    avg_duration: number
    nights_tracked: number
    current_streak: number
    best_night: DailySleepScore
    worst_night: DailySleepScore
  }
}
```

**Implementation:** `/src/app/api/sleep-score/history/route.ts`

---

### 3. Calculate Weekly Summary

**Endpoint:** `POST /api/sleep-score/weekly-summary`

**Request Body:**
```typescript
{
  userId: string
  weekStartDate: string // Monday of the week
}
```

**Response:**
```typescript
{
  summary: WeeklySleepScore
  daily_breakdown: DailySleepScore[]
  sleep_debt: SleepDebtMetrics
  recommendations: string[]
}
```

**Implementation:** `/src/app/api/sleep-score/weekly-summary/route.ts`

---

### 4. Get Insights

**Endpoint:** `GET /api/sleep-score/insights`

**Query Parameters:**
- `userId` (required)
- `unviewedOnly` (boolean)
- `category` (optional filter)

**Response:**
```typescript
{
  insights: SleepInsight[]
  unviewed_count: number
}
```

**Implementation:** `/src/app/api/sleep-score/insights/route.ts`

---

### 5. Sleep Trends Analysis

**Endpoint:** `GET /api/sleep-score/trends`

**Purpose:** Advanced analytics for sleep patterns

**Query Parameters:**
- `userId` (required)
- `period` ('week' | 'month' | 'quarter' | 'year')

**Response:**
```typescript
{
  period: string
  score_trend: { date: string, score: number }[]
  duration_trend: { date: string, hours: number }[]
  consistency_trend: { date: string, std_dev: number }[]
  quality_trend: { date: string, score: number }[]
  sleep_debt_trend: { date: string, debt: number }[]
  pattern_insights: {
    best_day_of_week: string
    worst_day_of_week: string
    weekend_vs_weekday: { weekend: number, weekday: number }
    monthly_variance: number
  }
}
```

**Implementation:** `/src/app/api/sleep-score/trends/route.ts`

---

## Business Logic Functions

### Core Calculation Functions

Create: `/src/lib/sleep-score.ts`

```typescript
// Sleep Score Calculation Library
// Core business logic for sleep health tracking

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// COMPONENT SCORE CALCULATIONS
// ============================================================================

/**
 * Calculate duration score (0-100) based on sleep hours
 */
export function calculateDurationScore(sleepHours: number): number {
  const OPTIMAL_MIN = 7
  const OPTIMAL_MAX = 9
  const CRITICAL_MIN = 4
  const CRITICAL_MAX = 12

  if (sleepHours >= OPTIMAL_MIN && sleepHours <= OPTIMAL_MAX) {
    return 100
  }

  if (sleepHours < OPTIMAL_MIN) {
    if (sleepHours < CRITICAL_MIN) return 0
    const deficit = OPTIMAL_MIN - sleepHours
    return Math.max(0, Math.round(100 - (deficit / (OPTIMAL_MIN - CRITICAL_MIN)) * 100))
  }

  if (sleepHours > OPTIMAL_MAX) {
    if (sleepHours > CRITICAL_MAX) return 25
    const excess = sleepHours - OPTIMAL_MAX
    return Math.max(25, Math.round(100 - (excess / (CRITICAL_MAX - OPTIMAL_MAX)) * 50))
  }

  return 100
}

/**
 * Calculate consistency score based on sleep hour variability
 */
export function calculateConsistencyScore(sleepHoursArray: number[]): number {
  if (sleepHoursArray.length < 3) {
    return 50 // Neutral score for insufficient data
  }

  const mean = sleepHoursArray.reduce((a, b) => a + b) / sleepHoursArray.length
  const variance = sleepHoursArray.reduce((sum, val) =>
    sum + Math.pow(val - mean, 2), 0) / sleepHoursArray.length
  const stdDev = Math.sqrt(variance)

  if (stdDev <= 0.5) return 100
  if (stdDev <= 1.0) return Math.round(85 + ((1.0 - stdDev) / 0.5) * 15)
  if (stdDev <= 1.5) return Math.round(70 + ((1.5 - stdDev) / 0.5) * 15)
  if (stdDev <= 2.0) return Math.round(50 + ((2.0 - stdDev) / 0.5) * 20)

  return Math.max(0, Math.round(50 - ((stdDev - 2.0) * 10)))
}

/**
 * Calculate quality score from mood/energy data
 */
export function calculateQualityScore(
  energyLevel: number | null,
  stressLevel: number | null,
  sleepDuration: number
): number {
  // If no mood data, estimate from duration
  if (energyLevel === null) {
    if (sleepDuration >= 7 && sleepDuration <= 9) return 70
    if (sleepDuration >= 6 && sleepDuration <= 10) return 60
    return 50
  }

  const energyScore = 20 + ((energyLevel - 1) / 4) * 80
  const stressPenalty = stressLevel ? ((stressLevel - 1) / 4) * 20 : 0

  let efficiencyBonus = 0
  if (sleepDuration >= 7 && sleepDuration <= 9 && energyLevel >= 4) {
    efficiencyBonus = 10
  }

  const rawScore = energyScore - stressPenalty + efficiencyBonus
  return Math.max(0, Math.min(100, Math.round(rawScore)))
}

/**
 * Get letter grade for score
 */
export function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

// ============================================================================
// DATA RETRIEVAL HELPERS
// ============================================================================

/**
 * Get sleep hours for last N days
 */
export async function getLast7DaysSleepHours(
  userId: string,
  endDate: string
): Promise<number[]> {
  const end = new Date(endDate)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)

  const { data: dreams } = await supabase
    .from('dreams')
    .select('sleep_hours, created_at')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .not('sleep_hours', 'is', null)
    .order('created_at', { ascending: true })

  return dreams?.map(d => d.sleep_hours) || []
}

/**
 * Get dream for specific date
 */
export async function getDreamForDate(
  userId: string,
  date: string,
  dreamId?: string
): Promise<any> {
  if (dreamId) {
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single()
    return data
  }

  const { data } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59`)
    .not('sleep_hours', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

/**
 * Get mood log for date
 */
export async function getMoodLogForDate(
  userId: string,
  date: string
): Promise<any> {
  const { data } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .single()

  return data
}

// ============================================================================
// SLEEP DEBT CALCULATIONS
// ============================================================================

export interface SleepDebtMetrics {
  total_debt_hours: number
  debt_per_night: number
  recovery_nights_needed: number
  severity: 'none' | 'mild' | 'moderate' | 'severe'
}

export async function calculateSleepDebt(
  userId: string,
  days: number = 30
): Promise<SleepDebtMetrics> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const { data: scores } = await supabase
    .from('sleep_scores')
    .select('sleep_hours, sleep_deficit_hours')
    .eq('user_id', userId)
    .gte('score_date', start.toISOString().split('T')[0])
    .order('score_date', { ascending: false })

  if (!scores || scores.length === 0) {
    return {
      total_debt_hours: 0,
      debt_per_night: 0,
      recovery_nights_needed: 0,
      severity: 'none'
    }
  }

  const totalDebt = scores.reduce((sum, s) =>
    sum + Math.max(0, s.sleep_deficit_hours || 0), 0)
  const avgDebt = totalDebt / scores.length
  const recoveryNights = Math.ceil(totalDebt / 0.25)

  let severity: 'none' | 'mild' | 'moderate' | 'severe'
  if (totalDebt < 5) severity = 'none'
  else if (totalDebt < 10) severity = 'mild'
  else if (totalDebt < 20) severity = 'moderate'
  else severity = 'severe'

  return {
    total_debt_hours: parseFloat(totalDebt.toFixed(1)),
    debt_per_night: parseFloat(avgDebt.toFixed(2)),
    recovery_nights_needed: recoveryNights,
    severity
  }
}

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

export function generateInsights(
  score: any,
  last7Days: number[]
): string[] {
  const insights: string[] = []

  // Duration insights
  if (score.sleep_hours < 7) {
    const deficit = 7 - score.sleep_hours
    insights.push(`You're ${deficit.toFixed(1)} hours below the recommended minimum. Try going to bed earlier tonight.`)
  } else if (score.sleep_hours > 9) {
    insights.push(`You slept longer than the optimal range. Oversleeping can leave you feeling groggy.`)
  } else {
    insights.push(`Great! You're in the optimal sleep duration range (7-9 hours).`)
  }

  // Consistency insights
  if (last7Days.length >= 3) {
    const stdDev = Math.sqrt(
      last7Days.reduce((sum, h) =>
        sum + Math.pow(h - (last7Days.reduce((a,b) => a+b) / last7Days.length), 2),
      0) / last7Days.length
    )

    if (stdDev > 1.5) {
      insights.push(`Your sleep schedule varies by ${stdDev.toFixed(1)} hours. Try maintaining consistent sleep times.`)
    } else if (stdDev < 0.5) {
      insights.push(`Excellent consistency! Your sleep schedule is very regular.`)
    }
  }

  // Quality insights
  if (score.energy_level && score.energy_level < 3) {
    insights.push(`Low energy despite ${score.sleep_hours.toFixed(1)} hours of sleep. Consider sleep quality factors like environment and stress.`)
  }

  // Grade-based motivation
  if (score.grade === 'S' || score.grade === 'A') {
    insights.push(`Amazing sleep score! Keep up these healthy habits.`)
  } else if (score.grade === 'D' || score.grade === 'F') {
    insights.push(`Your sleep score needs attention. Small changes can make a big difference.`)
  }

  return insights
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

export function analyzeTrend(
  dailyScores: any[]
): 'improving' | 'stable' | 'declining' {
  if (dailyScores.length < 3) return 'stable'

  // Simple linear regression on total_score
  const n = dailyScores.length
  const sumX = dailyScores.reduce((sum, _, i) => sum + i, 0)
  const sumY = dailyScores.reduce((sum, d) => sum + d.total_score, 0)
  const sumXY = dailyScores.reduce((sum, d, i) => sum + i * d.total_score, 0)
  const sumX2 = dailyScores.reduce((sum, _, i) => sum + i * i, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  if (slope > 2) return 'improving'
  if (slope < -2) return 'declining'
  return 'stable'
}

// ============================================================================
// WEEKLY AGGREGATION
// ============================================================================

export async function calculateWeeklySummary(
  userId: string,
  weekStartDate: string
): Promise<any> {
  const start = new Date(weekStartDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const { data: dailyScores } = await supabase
    .from('sleep_scores')
    .select('*')
    .eq('user_id', userId)
    .gte('score_date', start.toISOString().split('T')[0])
    .lte('score_date', end.toISOString().split('T')[0])
    .order('score_date', { ascending: true })

  if (!dailyScores || dailyScores.length === 0) {
    return null
  }

  const avgScore = Math.round(
    dailyScores.reduce((sum, d) => sum + d.total_score, 0) / dailyScores.length
  )
  const avgDuration = parseFloat(
    (dailyScores.reduce((sum, d) => sum + d.sleep_hours, 0) / dailyScores.length).toFixed(1)
  )
  const avgQuality = Math.round(
    dailyScores.reduce((sum, d) => sum + d.quality_score, 0) / dailyScores.length
  )

  const sleepDebt = dailyScores.reduce((debt, d) =>
    debt + Math.max(0, d.sleep_deficit_hours || 0), 0
  )

  let debtSeverity: 'none' | 'mild' | 'moderate' | 'severe'
  if (sleepDebt < 3) debtSeverity = 'none'
  else if (sleepDebt < 7) debtSeverity = 'mild'
  else if (sleepDebt < 14) debtSeverity = 'moderate'
  else debtSeverity = 'severe'

  const sortedScores = [...dailyScores].sort((a, b) => a.total_score - b.total_score)
  const worstNight = sortedScores[0]
  const bestNight = sortedScores[sortedScores.length - 1]

  const trend = analyzeTrend(dailyScores)

  return {
    week_start_date: weekStartDate,
    week_end_date: end.toISOString().split('T')[0],
    avg_total_score: avgScore,
    avg_duration_hours: avgDuration,
    avg_quality_score: avgQuality,
    grade: getGrade(avgScore),
    total_sleep_debt: parseFloat(sleepDebt.toFixed(1)),
    debt_severity: debtSeverity,
    worst_night_date: worstNight.score_date,
    best_night_date: bestNight.score_date,
    nights_tracked: dailyScores.length,
    trend,
    trend_direction: trend === 'improving' ? 1 : (trend === 'declining' ? -1 : 0)
  }
}
```

---

## UI/UX Design

### Component Architecture

Create new components in `/src/components/sleep-score/`:

1. **SleepScoreCard.tsx** - Daily score display widget
2. **SleepScoreDashboard.tsx** - Full sleep analytics view
3. **SleepTrendChart.tsx** - Historical trend visualization
4. **SleepInsightCard.tsx** - Insight/recommendation display
5. **SleepDebtTracker.tsx** - Sleep debt visualization
6. **WeeklySleepSummary.tsx** - Weekly recap component

### 1. Sleep Score Card Component

**Location:** `/src/components/sleep-score/SleepScoreCard.tsx`

**Design:**
```tsx
interface SleepScoreCardProps {
  score: DailySleepScore
  size?: 'compact' | 'full'
  showDetails?: boolean
}

export function SleepScoreCard({ score, size = 'compact', showDetails = false }: SleepScoreCardProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 border border-white/10">
      {/* Circular score display */}
      <div className="flex items-center justify-between">
        <div className="relative w-24 h-24">
          <CircularProgress value={score.total_score} grade={score.grade} />
        </div>

        <div className="flex-1 ml-6">
          <h3 className="text-2xl font-bold">{score.total_score}</h3>
          <p className="text-sm text-gray-400">Sleep Score</p>
          <div className="mt-2">
            <Badge grade={score.grade} />
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <MetricPill
            label="Duration"
            value={score.duration_score}
            detail={`${score.sleep_hours}h`}
          />
          <MetricPill
            label="Consistency"
            value={score.consistency_score}
          />
          <MetricPill
            label="Quality"
            value={score.quality_score}
          />
        </div>
      )}
    </div>
  )
}
```

### 2. Sleep Trend Chart

**Technology:** Chart.js or Recharts

**Features:**
- Line chart showing 30-day score history
- Color-coded zones (Excellent: green, Good: yellow, Poor: red)
- Hover tooltips with detailed breakdown
- Toggle between score/duration/quality views

### 3. Sleep Dashboard View

**Integration:** Add to main app navigation

```tsx
// In src/app/page.tsx, add new view option:

type ViewType =
  | 'interpret'
  | 'history'
  | 'patterns'
  | 'journal'
  | 'events'
  | 'insights'
  | 'sleep-score'  // NEW
  | 'settings'

{currentView === 'sleep-score' && (
  <SleepScoreDashboard
    userId={user.id}
    onNavigateToDream={(dreamId) => {
      // Navigate to specific dream
    }}
  />
)}
```

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────┐
│  Sleep Score Dashboard                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌──────────────────────────────┐ │
│  │ Today's │  │  30-Day Trend Chart          │ │
│  │  Score  │  │                              │ │
│  │   85    │  │  [Line chart visualization]  │ │
│  │  Grade  │  │                              │ │
│  │    A    │  │                              │ │
│  └─────────┘  └──────────────────────────────┘ │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Weekly Summary                          │  │
│  │  Avg Score: 82 | Sleep Debt: 2.5 hrs    │  │
│  │  Trend: ↑ Improving                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Insights & Recommendations              │  │
│  │  • You're sleeping consistently!         │  │
│  │  • Try to get 30 more minutes tonight    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Recent Sleep History                    │  │
│  │  [List of last 7 nights with scores]    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 4. Sleep Insights Display

**Design Pattern:** Similar to existing SmartPrompts component

- Display unviewed insights with badge count
- Dismissible insight cards
- Priority-based ordering (critical warnings first)
- Action items as clickable buttons

### 5. Navigation Integration

**Add to main navigation bar:**

```tsx
<button
  onClick={() => setCurrentView('sleep-score')}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
    currentView === 'sleep-score'
      ? 'bg-indigo-600 text-white'
      : 'text-gray-300 hover:bg-white/5'
  }`}
>
  <Moon className="w-5 h-5" />
  <span>Sleep Score</span>
  {unviewedInsightsCount > 0 && (
    <Badge variant="notification">{unviewedInsightsCount}</Badge>
  )}
</button>
```

### 6. Mobile Responsiveness

- Stack components vertically on mobile
- Swipeable cards for history
- Collapsible detail sections
- Bottom sheet for detailed insights

---

## Integration Points

### 1. Dream Entry Flow Integration

**Trigger:** When user logs a dream with sleep hours

**Action:** Automatically calculate sleep score

```typescript
// In /src/app/api/interpret-dream-supabase/route.ts
// After saving dream:

if (saveToHistory && sleepHours) {
  const scoreDate = new Date().toISOString().split('T')[0]

  // Calculate sleep score asynchronously (non-blocking)
  fetch('/api/sleep-score/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      date: scoreDate,
      dreamId: savedDream.id
    })
  }).catch(err => console.error('Sleep score calculation failed:', err))
}
```

### 2. Mood Log Integration

**Enhancement:** Update sleep score quality component when mood is logged

```typescript
// In /src/app/api/mood-logs/route.ts
// After saving mood log:

// Check if sleep score exists for today
const { data: todayScore } = await supabase
  .from('sleep_scores')
  .select('*')
  .eq('user_id', userId)
  .eq('score_date', log_date)
  .single()

if (todayScore) {
  // Recalculate quality score with new mood data
  await fetch('/api/sleep-score/calculate', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      date: log_date,
      forceRecalculate: true
    })
  })
}
```

### 3. Gamification Integration

**New Achievements:**

Add to gamification database seed:

```sql
-- Sleep Score Achievements
INSERT INTO achievements (code, name, description, icon, category, tier, xp_reward, criteria) VALUES
('SLEEP_PERFECT_WEEK', 'Well Rested', 'Achieve an A grade or higher for 7 consecutive nights', '🌙', 'consistency', 'gold', 100,
  '{"type": "streak", "threshold": 7, "category": "sleep_a_grade"}'),

('SLEEP_100_NIGHTS', 'Sleep Tracker', 'Track sleep for 100 nights', '📊', 'volume', 'silver', 75,
  '{"type": "sleep_count", "threshold": 100}'),

('SLEEP_PERFECT_SCORE', 'Sleep Master', 'Achieve a perfect 100 sleep score', '⭐', 'quality', 'platinum', 150,
  '{"type": "sleep_score", "threshold": 100}'),

('SLEEP_DEBT_FREE', 'Debt Free', 'Maintain zero sleep debt for 30 days', '💪', 'consistency', 'gold', 125,
  '{"type": "sleep_debt_free", "threshold": 30}');
```

**XP Rewards:**

```typescript
// In sleep score calculation:
const xpRewards = {
  SCORE_S: 20,
  SCORE_A: 15,
  SCORE_B: 10,
  SCORE_C: 5,
  OPTIMAL_RANGE: 10,
  CONSISTENCY_BONUS: 15
}

if (totalScore >= 90) {
  await awardXP(userId, xpRewards.SCORE_S, 'Exceptional sleep score (S)')
} else if (totalScore >= 80) {
  await awardXP(userId, xpRewards.SCORE_A, 'Excellent sleep score (A)')
}

if (consistencyScore >= 90) {
  await awardXP(userId, xpRewards.CONSISTENCY_BONUS, 'Consistent sleep schedule')
}
```

**Daily Stats Update:**

```typescript
await updateDailyStats(userId, {
  sleep_scores_calculated: 1,
  avg_sleep_score: totalScore
})
```

### 4. Insights View Integration

**Add sleep insights to main insights feed:**

```typescript
// In /src/components/InsightsView.tsx

const allInsights = [
  ...dreamInsights,
  ...moodInsights,
  ...sleepInsights  // NEW
].sort((a, b) => b.priority - a.priority)
```

### 5. Settings Integration

**Add sleep preferences:**

```typescript
interface UserSleepPreferences {
  target_sleep_hours: number    // Default: 8
  bedtime_reminder: boolean      // Default: false
  reminder_time: string          // HH:MM format
  show_sleep_score_on_home: boolean  // Default: true
  score_notifications: boolean   // Default: true
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Deliverables:**
- [ ] Database schema migration
- [ ] Core calculation functions in `/src/lib/sleep-score.ts`
- [ ] Basic API endpoint: `POST /api/sleep-score/calculate`
- [ ] Unit tests for calculation logic

**Success Criteria:**
- Can calculate accurate sleep scores from existing dream data
- Scores persist correctly in database

### Phase 2: API & Business Logic (Week 2)
**Deliverables:**
- [ ] All API endpoints implemented
- [ ] Integration with dream entry flow
- [ ] Integration with mood log flow
- [ ] Sleep debt calculations
- [ ] Insight generation logic

**Success Criteria:**
- Scores auto-calculate when dreams are logged
- Quality scores update when moods are logged
- Insights generate accurately

### Phase 3: UI Components (Week 3)
**Deliverables:**
- [ ] `SleepScoreCard` component
- [ ] `SleepTrendChart` component
- [ ] `SleepScoreDashboard` view
- [ ] Navigation integration
- [ ] Mobile responsiveness

**Success Criteria:**
- Users can view sleep scores in app
- Charts render correctly
- Dashboard provides actionable insights

### Phase 4: Gamification & Polish (Week 4)
**Deliverables:**
- [ ] Sleep-related achievements
- [ ] XP rewards integration
- [ ] Weekly summary generation
- [ ] Advanced trend analysis
- [ ] Settings integration
- [ ] Onboarding tutorial

**Success Criteria:**
- Gamification features work seamlessly
- Users receive meaningful insights
- Feature feels polished and complete

### Phase 5: Testing & Launch (Week 5)
**Deliverables:**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Migration guide for existing users
- [ ] Launch announcement

**Success Criteria:**
- Feature works reliably in production
- Existing user data migrates correctly
- No performance degradation

---

## Success Metrics

### User Engagement Metrics
- **Adoption Rate:** % of users who view sleep score dashboard (Target: 60% in first month)
- **Retention:** % of users who return to sleep score view (Target: 40% weekly)
- **Sleep Data Entry:** % increase in dreams logged with sleep hours (Target: +30%)

### Health Impact Metrics
- **Average Sleep Score:** Track population average (Target: 75+)
- **Optimal Range Adherence:** % of nights in 7-9 hour range (Target: 60%)
- **Consistency Improvement:** % of users improving consistency score over time (Target: 40%)

### Feature Usage Metrics
- **Weekly Summary Views:** % of users viewing weekly summaries (Target: 50%)
- **Insight Engagement:** % of insights viewed/acted upon (Target: 70%)
- **Trend Analysis:** % of users exploring historical trends (Target: 30%)

### Technical Metrics
- **Calculation Performance:** Sleep score calculation time (Target: <500ms)
- **API Response Time:** Dashboard load time (Target: <2s)
- **Error Rate:** Failed score calculations (Target: <1%)

---

## Data Privacy & Security

### Privacy Considerations
- All sleep data tied to user account with RLS
- No third-party data sharing
- User can export/delete all sleep data
- Aggregate statistics anonymized

### Data Retention
- Sleep scores: Indefinite (user-controlled deletion)
- Weekly summaries: Indefinite
- Insights: 90 days (auto-expire)

---

## Future Enhancements (v2.0+)

### Advanced Features
1. **Chronotype Detection:** Identify if user is morning/evening person
2. **Sleep Stage Estimation:** Infer light/deep sleep from dream recall patterns
3. **Environmental Factors:** Track weather, moon phase correlations
4. **Social Comparison:** Anonymous benchmarking against similar users
5. **Smart Bedtime Recommendations:** ML-based optimal bedtime prediction
6. **Integration with Wearables:** Import data from Fitbit, Oura, Apple Watch
7. **Sleep Meditation Integration:** Guided sleep improvement programs
8. **Circadian Rhythm Tracking:** Advanced chronobiology analysis

### AI-Powered Insights
- GPT-based personalized sleep coaching
- Correlation analysis between dreams and sleep quality
- Predictive alerts for sleep debt accumulation
- Custom sleep improvement plans

---

## Appendix A: Research Sources

### Academic & Clinical Sources
1. **National Sleep Foundation Sleep Health Index**
   [Sleep Health Journal](https://www.sleephealthjournal.org/article/S2352-7218(17)30102X/fulltext)
   Validated 0-100 scale measuring sleep quality, duration, and disorders

2. **Pittsburgh Sleep Quality Index (PSQI)**
   [University of Pittsburgh](https://www.sleep.pitt.edu/psqi)
   Clinical gold standard for sleep quality assessment

3. **Sleep Quality, Duration, and Consistency Research**
   [Nature - npj Science of Learning](https://www.nature.com/articles/s41539-019-0055-z)
   24.44% variance in performance explained by sleep factors

4. **National Sleep Foundation Duration Recommendations**
   [Sleep Health Journal](https://www.sleephealthjournal.org/article/S2352-7218(15)00015-7/fulltext)
   Evidence-based sleep duration guidelines by age group

### Consumer Device Research
5. **Oura Ring Validation Study**
   [Oura Blog](https://ouraring.com/blog/2024-sensors-oura-ring-validation-study/)
   79% agreement with polysomnography

6. **Fitbit Sleep Score Methodology**
   [Fitbit Help Center](https://support.google.com/fitbit/answer/14236513)
   Consumer sleep score calculation breakdown

7. **Apple Watch Sleep Score Analysis**
   [The5KRunner](https://the5krunner.com/2025/09/19/apple-watch-sleep-score-calculation-all-you-need-to-know-improve-sleep-health/)
   Recent implementation of sleep scoring

8. **Wearable Accuracy Comparison Study**
   [MDPI Sensors Journal](https://www.mdpi.com/1424-8220/24/20/6532)
   Comparative analysis of consumer sleep trackers

### Sleep Science Foundations
9. **Withings Sleep Score Algorithm**
   [Withings Blog](https://www.withings.com/us/en/blog/sleep/sleep-score-how-is-it-computed)
   Industry methodology for sleep scoring

10. **Sleep Quality Mathematical Models**
    [MathCalculate](https://mathcalculate.com/tools/sleep-quality-score)
    Quantitative approaches to sleep assessment

---

## Appendix B: Example Calculations

### Example 1: Optimal Sleep Night

**Input Data:**
- Sleep hours: 8.0
- Last 7 days: [7.5, 8.0, 7.8, 8.2, 7.9, 8.0, 8.0]
- Energy level: 4 (from mood log)
- Stress level: 2

**Calculations:**

1. **Duration Score:**
   - 8.0 hours is in optimal range [7-9]
   - Score: 100

2. **Consistency Score:**
   - Mean: 7.91 hours
   - Std Dev: 0.22 hours
   - Std Dev < 0.5 → Score: 100

3. **Quality Score:**
   - Energy score: 20 + ((4-1)/4 * 80) = 80
   - Stress penalty: ((2-1)/4 * 20) = 5
   - Efficiency bonus: 10 (optimal duration + high energy)
   - Score: 80 - 5 + 10 = 85

**Total Score:**
- (100 × 0.40) + (100 × 0.30) + (85 × 0.30) = 95.5 → **96**
- Grade: **S**

### Example 2: Poor Sleep Night

**Input Data:**
- Sleep hours: 5.5
- Last 7 days: [7.0, 5.5, 8.5, 6.0, 9.0, 5.5, 5.5]
- Energy level: 2
- Stress level: 4

**Calculations:**

1. **Duration Score:**
   - 5.5 hours (deficit of 1.5 from optimal 7)
   - Score: 100 - ((1.5 / 3) × 100) = 50

2. **Consistency Score:**
   - Mean: 6.71 hours
   - Std Dev: 1.48 hours
   - 1.0 < Std Dev ≤ 1.5 → Score: 70 + ((1.5-1.48)/0.5 × 15) = 70.6 → **71**

3. **Quality Score:**
   - Energy score: 20 + ((2-1)/4 × 80) = 40
   - Stress penalty: ((4-1)/4 × 20) = 15
   - Efficiency bonus: 0
   - Score: 40 - 15 = 25

**Total Score:**
- (50 × 0.40) + (71 × 0.30) + (25 × 0.30) = 48.8 → **49**
- Grade: **F**

---

## Appendix C: Database Queries

### Common Query Patterns

**Get User's Current Sleep Score:**
```sql
SELECT * FROM sleep_scores
WHERE user_id = 'user-uuid'
ORDER BY score_date DESC
LIMIT 1;
```

**Calculate 30-Day Average:**
```sql
SELECT
  AVG(total_score) as avg_score,
  AVG(sleep_hours) as avg_hours,
  COUNT(*) as nights_tracked
FROM sleep_scores
WHERE user_id = 'user-uuid'
  AND score_date >= CURRENT_DATE - INTERVAL '30 days';
```

**Find Best/Worst Nights:**
```sql
SELECT * FROM sleep_scores
WHERE user_id = 'user-uuid'
  AND score_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY total_score DESC
LIMIT 1;  -- Best night

-- Worst night: ORDER BY total_score ASC
```

**Sleep Debt Accumulation:**
```sql
SELECT
  score_date,
  sleep_hours,
  sleep_deficit_hours,
  SUM(sleep_deficit_hours) OVER (
    ORDER BY score_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as cumulative_debt
FROM sleep_scores
WHERE user_id = 'user-uuid'
ORDER BY score_date DESC
LIMIT 30;
```

**Weekly Trend Analysis:**
```sql
SELECT
  DATE_TRUNC('week', score_date) as week_start,
  AVG(total_score) as avg_score,
  AVG(sleep_hours) as avg_hours,
  COUNT(*) as nights_tracked
FROM sleep_scores
WHERE user_id = 'user-uuid'
GROUP BY DATE_TRUNC('week', score_date)
ORDER BY week_start DESC
LIMIT 12;  -- Last 12 weeks
```

---

## Conclusion

This Sleep Score feature specification provides a comprehensive, research-based approach to sleep health tracking that:

1. **Leverages existing data** - No additional user input required
2. **Uses validated methodologies** - Based on NSF, PSQI, and consumer device research
3. **Integrates seamlessly** - Works with current gamification and data architecture
4. **Provides actionable insights** - Helps users improve sleep health
5. **Scales efficiently** - Designed for performance with large datasets

The phased implementation approach ensures steady progress while maintaining code quality and user experience.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-14
**Next Review:** Post-Phase 1 completion
