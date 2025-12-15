import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Type definitions
interface SleepLog {
  id: string
  user_id: string
  sleep_date: string
  sleep_hours: number
  sleep_score: number
  duration_score: number
  quality_score: number
  consistency_score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  sleep_deficit_hours: number | null
  is_optimal_range: boolean
  consistency_std_dev: number | null
  created_at: string
}

interface SleepMoodCorrelation {
  correlation_type: string
  sleep_metric: string
  mood_metric: string
  avg_sleep_value: number
  avg_mood_value: number
  sample_size: number
  insight: string
}

interface SleepDreamCorrelation {
  correlation_type: string
  sleep_condition: string
  dream_count: number
  avg_sleep_hours: number
  avg_sleep_score: number
  insight: string
}

type ConsistencyRating = 'excellent' | 'good' | 'fair' | 'poor'
type Period = '7d' | '30d' | '90d' | 'all'

/**
 * Calculate consistency rating based on standard deviation
 */
function calculateConsistencyRating(stdDev: number | null): ConsistencyRating {
  if (stdDev === null) return 'fair'

  if (stdDev <= 0.5) return 'excellent'
  if (stdDev <= 1.0) return 'good'
  if (stdDev <= 1.5) return 'fair'
  return 'poor'
}

/**
 * Generate AI-based recommendations from sleep patterns
 */
function generateRecommendations(
  avgScore: number,
  avgDuration: number,
  consistencyRating: ConsistencyRating,
  baselineAdherence: number,
  correlations: {
    sleep_mood: SleepMoodCorrelation[]
    sleep_dream: SleepDreamCorrelation[]
  }
): string[] {
  const recommendations: string[] = []

  // Score-based recommendations
  if (avgScore < 70) {
    recommendations.push('Focus on improving sleep quality through better sleep hygiene and consistent bedtime routines.')
  } else if (avgScore >= 90) {
    recommendations.push('Excellent sleep health! Maintain your current habits.')
  }

  // Duration-based recommendations
  if (avgDuration < 7) {
    recommendations.push('You\'re averaging less than 7 hours of sleep. Aim for 7-9 hours per night for optimal health.')
  } else if (avgDuration > 9) {
    recommendations.push('You\'re sleeping more than 9 hours on average. Consider if this is due to sleep debt or other factors.')
  } else {
    recommendations.push('Your sleep duration is in the optimal range (7-9 hours). Keep it up!')
  }

  // Consistency-based recommendations
  if (consistencyRating === 'poor') {
    recommendations.push('Your sleep schedule is inconsistent. Try going to bed and waking up at the same time each day, even on weekends.')
  } else if (consistencyRating === 'excellent') {
    recommendations.push('Great sleep consistency! Your body appreciates the regular schedule.')
  }

  // Baseline adherence recommendations
  if (baselineAdherence < 50) {
    recommendations.push('Your sleep timing varies significantly. Establishing a consistent sleep routine could improve your sleep quality.')
  }

  // Mood correlation insights
  const poorSleepLowEnergy = correlations.sleep_mood.find(c => c.correlation_type === 'poor_sleep_low_energy')
  if (poorSleepLowEnergy && poorSleepLowEnergy.sample_size >= 3) {
    recommendations.push('Poor sleep appears to affect your energy levels. Prioritizing sleep may boost your daytime energy.')
  }

  const highSleepHighMood = correlations.sleep_mood.find(c => c.correlation_type === 'high_sleep_high_mood')
  if (highSleepHighMood && highSleepHighMood.avg_mood_value >= 4) {
    recommendations.push('Your data shows a strong link between good sleep and positive mood. Continue prioritizing sleep for emotional well-being.')
  }

  // Dream correlation insights
  const durationDreamRecall = correlations.sleep_dream.find(c => c.correlation_type === 'duration_dream_recall')
  if (durationDreamRecall && durationDreamRecall.dream_count > 0) {
    if (durationDreamRecall.sleep_condition.includes('long')) {
      recommendations.push('Longer sleep duration correlates with better dream recall. This suggests you\'re reaching deeper REM cycles.')
    }
  }

  // Default recommendation if no specific insights
  if (recommendations.length === 0) {
    recommendations.push('Keep tracking your sleep to identify patterns and optimize your sleep health.')
  }

  return recommendations
}

/**
 * GET /api/sleep-analytics
 * Returns comprehensive sleep analytics including summary, trends, correlations, and recommendations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = (searchParams.get('period') || '30d') as Period

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Calculate date range based on period
    const now = new Date()
    let dateFrom: Date | null = null

    switch (period) {
      case '7d':
        dateFrom = new Date(now)
        dateFrom.setDate(dateFrom.getDate() - 7)
        break
      case '30d':
        dateFrom = new Date(now)
        dateFrom.setDate(dateFrom.getDate() - 30)
        break
      case '90d':
        dateFrom = new Date(now)
        dateFrom.setDate(dateFrom.getDate() - 90)
        break
      case 'all':
        dateFrom = null // No date filter
        break
    }

    // Build query for sleep logs
    let query = supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sleep_date', { ascending: false })

    if (dateFrom) {
      const dateFromStr = dateFrom.toISOString().split('T')[0]
      query = query.gte('sleep_date', dateFromStr)
    }

    const { data: sleepLogs, error: logsError } = await query

    if (logsError) {
      console.error('Error fetching sleep logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch sleep analytics' },
        { status: 500 }
      )
    }

    // Handle no data case
    if (!sleepLogs || sleepLogs.length === 0) {
      return NextResponse.json({
        summary: {
          avg_sleep_score: 0,
          avg_duration: 0,
          total_logs: 0,
          best_score: null,
          worst_score: null,
          consistency_rating: 'fair' as ConsistencyRating,
          baseline_adherence: 0
        },
        trends: {
          daily: [],
          weekly_avg: []
        },
        correlations: {
          sleep_mood: [],
          sleep_dream: []
        },
        recommendations: ['Start tracking your sleep to get personalized insights and recommendations.']
      })
    }

    const logs = sleepLogs as SleepLog[]

    // ============================================================================
    // 1. SUMMARY STATISTICS
    // ============================================================================

    const totalLogs = logs.length
    const avgScore = logs.reduce((sum, log) => sum + log.sleep_score, 0) / totalLogs
    const avgDuration = logs.reduce((sum, log) => sum + log.sleep_hours, 0) / totalLogs

    // Best and worst scores
    const sortedByScore = [...logs].sort((a, b) => b.sleep_score - a.sleep_score)
    const bestScore = sortedByScore[0]
    const worstScore = sortedByScore[sortedByScore.length - 1]

    // Calculate overall consistency (average of all std_dev values)
    const logsWithStdDev = logs.filter(log => log.consistency_std_dev !== null)
    const avgStdDev = logsWithStdDev.length > 0
      ? logsWithStdDev.reduce((sum, log) => sum + (log.consistency_std_dev || 0), 0) / logsWithStdDev.length
      : null

    const consistencyRating = calculateConsistencyRating(avgStdDev)

    // Calculate baseline adherence
    // Get user's typical sleep hours (last 30 days average)
    const { data: typicalSleepData } = await supabase.rpc('get_typical_sleep_hours', {
      p_user_id: userId,
      p_days: 30
    })
    const typicalSleepHours = typicalSleepData || 8.0

    // Count how many logs are within 30 minutes of typical sleep hours
    const logsWithinBaseline = logs.filter(log =>
      Math.abs(log.sleep_hours - typicalSleepHours) <= 0.5
    ).length
    const baselineAdherence = (logsWithinBaseline / totalLogs) * 100

    // ============================================================================
    // 2. TRENDS
    // ============================================================================

    // Daily trends (reverse to chronological order)
    const daily = [...logs]
      .reverse()
      .map(log => ({
        date: log.sleep_date,
        score: log.sleep_score,
        duration: log.sleep_hours,
        grade: log.grade
      }))

    // Weekly averages
    const weeklyMap = new Map<string, { scores: number[], durations: number[] }>()

    logs.forEach(log => {
      const logDate = new Date(log.sleep_date)
      // Get Monday of the week
      const dayOfWeek = logDate.getDay()
      const diff = logDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(logDate.setDate(diff))
      const weekStart = monday.toISOString().split('T')[0]

      if (!weeklyMap.has(weekStart)) {
        weeklyMap.set(weekStart, { scores: [], durations: [] })
      }

      const weekData = weeklyMap.get(weekStart)!
      weekData.scores.push(log.sleep_score)
      weekData.durations.push(log.sleep_hours)
    })

    const weekly_avg = Array.from(weeklyMap.entries())
      .map(([week_start, data]) => ({
        week_start,
        avg_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        avg_duration: data.durations.reduce((a, b) => a + b, 0) / data.durations.length
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start))

    // ============================================================================
    // 3. CORRELATIONS
    // ============================================================================

    const periodDays = period === 'all' ? 365 : parseInt(period)

    // Sleep-Mood correlation using SQL function
    const { data: sleepMoodData, error: moodCorrError } = await supabase.rpc(
      'fn_sleep_mood_correlation',
      {
        p_user_id: userId,
        p_days: periodDays
      }
    )

    if (moodCorrError) {
      console.error('Error fetching sleep-mood correlation:', moodCorrError)
    }

    // Sleep-Dream correlation using SQL function
    const { data: sleepDreamData, error: dreamCorrError } = await supabase.rpc(
      'fn_sleep_dream_correlation',
      {
        p_user_id: userId,
        p_days: periodDays
      }
    )

    if (dreamCorrError) {
      console.error('Error fetching sleep-dream correlation:', dreamCorrError)
    }

    const correlations = {
      sleep_mood: (sleepMoodData || []) as SleepMoodCorrelation[],
      sleep_dream: (sleepDreamData || []) as SleepDreamCorrelation[]
    }

    // ============================================================================
    // 4. RECOMMENDATIONS
    // ============================================================================

    const recommendations = generateRecommendations(
      avgScore,
      avgDuration,
      consistencyRating,
      baselineAdherence,
      correlations
    )

    // ============================================================================
    // RESPONSE
    // ============================================================================

    return NextResponse.json({
      summary: {
        avg_sleep_score: Math.round(avgScore * 10) / 10,
        avg_duration: Math.round(avgDuration * 10) / 10,
        total_logs: totalLogs,
        best_score: bestScore ? {
          score: bestScore.sleep_score,
          date: bestScore.sleep_date,
          duration: bestScore.sleep_hours,
          grade: bestScore.grade
        } : null,
        worst_score: worstScore ? {
          score: worstScore.sleep_score,
          date: worstScore.sleep_date,
          duration: worstScore.sleep_hours,
          grade: worstScore.grade
        } : null,
        consistency_rating: consistencyRating,
        baseline_adherence: Math.round(baselineAdherence * 10) / 10
      },
      trends: {
        daily,
        weekly_avg
      },
      correlations,
      recommendations
    })

  } catch (error) {
    console.error('Failed to generate sleep analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate sleep analytics' },
      { status: 500 }
    )
  }
}
