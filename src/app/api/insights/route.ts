import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'


interface MoodDreamCorrelation {
  mood_level: number
  dream_count: number
  avg_sleep_hours: number
  common_emotions: string[]
  common_symbols: string[]
}

interface LifeEventDreamCorrelation {
  event_category: string
  dream_count: number
  common_themes: string[]
  common_emotions: string[]
  avg_intensity: number
}

interface SleepQualityInsight {
  sleep_range: string
  dream_count: number
  avg_mood: number
  common_themes: string[]
}

interface TimeSeriesData {
  date: string
  dream_count: number
  avg_mood: number
  avg_stress: number
  avg_energy: number
  avg_sleep: number
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const timeRange = searchParams.get('timeRange') || '30' // days

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const daysAgo = parseInt(timeRange)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Fetch all user data
    const [dreamsResult, moodLogsResult, lifeEventsResult] = await Promise.all([
      supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      
      supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', startDate.toISOString().split('T')[0])
        .order('log_date', { ascending: false }),
      
      supabase
        .from('life_events')
        .select('*, dream_life_events(dream_id)')
        .eq('user_id', userId)
        .gte('date_start', startDate.toISOString().split('T')[0])
        .order('date_start', { ascending: false })
    ])

    if (dreamsResult.error) throw dreamsResult.error
    if (moodLogsResult.error) throw moodLogsResult.error
    if (lifeEventsResult.error) throw lifeEventsResult.error

    const dreams = dreamsResult.data || []
    const moodLogs = moodLogsResult.data || []
    const lifeEvents = lifeEventsResult.data || []

    // 1. Mood-Dream Correlations
    const moodDreamCorrelations: MoodDreamCorrelation[] = []
    for (let mood = 1; mood <= 5; mood++) {
      const relevantMoodLogs = moodLogs.filter(m => m.mood === mood)
      const moodDates = relevantMoodLogs.map(m => m.log_date)
      
      const dreamsOnMoodDays = dreams.filter(d => {
        const dreamDate = new Date(d.created_at).toISOString().split('T')[0]
        return moodDates.includes(dreamDate)
      })

      if (dreamsOnMoodDays.length > 0) {
        const allEmotions = dreamsOnMoodDays.flatMap(d => d.emotions || [])
        const allSymbols = dreamsOnMoodDays.flatMap(d => d.symbols || [])
        const emotionCounts = countOccurrences(allEmotions)
        const symbolCounts = countOccurrences(allSymbols)

        moodDreamCorrelations.push({
          mood_level: mood,
          dream_count: dreamsOnMoodDays.length,
          avg_sleep_hours: average(dreamsOnMoodDays.map(d => d.sleep_hours).filter(Boolean)),
          common_emotions: getTop(emotionCounts, 3),
          common_symbols: getTop(symbolCounts, 3)
        })
      }
    }

    // 2. Life Event Correlations
    const eventCorrelations: LifeEventDreamCorrelation[] = []
    const eventsByCategory = groupBy(lifeEvents, 'category')

    for (const [category, events] of Object.entries(eventsByCategory)) {
      const linkedDreamIds = new Set(
        events.flatMap((e: any) => (e.dream_life_events || []).map((dle: any) => dle.dream_id))
      )
      const linkedDreams = dreams.filter(d => linkedDreamIds.has(d.id))

      if (linkedDreams.length > 0) {
        const allThemes = linkedDreams.flatMap(d => d.themes || [])
        const allEmotions = linkedDreams.flatMap(d => d.emotions || [])
        const themeCounts = countOccurrences(allThemes)
        const emotionCounts = countOccurrences(allEmotions)

        eventCorrelations.push({
          event_category: category,
          dream_count: linkedDreams.length,
          common_themes: getTop(themeCounts, 3),
          common_emotions: getTop(emotionCounts, 3),
          avg_intensity: average(events.map((e: any) => e.intensity).filter(Boolean))
        })
      }
    }

    // 3. Sleep Quality Insights
    const sleepRanges = [
      { range: 'Poor (< 6h)', min: 0, max: 6 },
      { range: 'Adequate (6-7h)', min: 6, max: 7 },
      { range: 'Good (7-9h)', min: 7, max: 9 },
      { range: 'Excessive (> 9h)', min: 9, max: 24 }
    ]

    const sleepQualityInsights: SleepQualityInsight[] = sleepRanges.map(({ range, min, max }) => {
      const dreamsInRange = dreams.filter(d => 
        d.sleep_hours && d.sleep_hours >= min && d.sleep_hours < max
      )

      const dreamDates = dreamsInRange.map(d => new Date(d.created_at).toISOString().split('T')[0])
      const moodsOnDreamDays = moodLogs.filter(m => dreamDates.includes(m.log_date))

      const allThemes = dreamsInRange.flatMap(d => d.themes || [])
      const themeCounts = countOccurrences(allThemes)

      return {
        sleep_range: range,
        dream_count: dreamsInRange.length,
        avg_mood: average(moodsOnDreamDays.map(m => m.mood)),
        common_themes: getTop(themeCounts, 3)
      }
    }).filter(insight => insight.dream_count > 0)

    // 4. Time Series Data (last 30 days or specified range)
    const timeSeriesData: TimeSeriesData[] = []
    for (let i = 0; i < daysAgo; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayDreams = dreams.filter(d => 
        new Date(d.created_at).toISOString().split('T')[0] === dateStr
      )
      const dayMood = moodLogs.find(m => m.log_date === dateStr)

      if (dayDreams.length > 0 || dayMood) {
        timeSeriesData.push({
          date: dateStr,
          dream_count: dayDreams.length,
          avg_mood: dayMood?.mood || 0,
          avg_stress: dayMood?.stress || 0,
          avg_energy: dayMood?.energy || 0,
          avg_sleep: average(dayDreams.map(d => d.sleep_hours).filter(Boolean))
        })
      }
    }

    // 5. Overall Statistics
    const totalDreams = dreams.length
    const totalMoodLogs = moodLogs.length
    const totalLifeEvents = lifeEvents.length

    const avgMood = average(moodLogs.map(m => m.mood))
    const avgStress = average(moodLogs.map(m => m.stress))
    const avgEnergy = average(moodLogs.map(m => m.energy))
    const avgSleep = average(dreams.map(d => d.sleep_hours).filter(Boolean))

    // 6. Key Insights (personalized text insights)
    const insights: string[] = []

    // Mood insight
    if (moodDreamCorrelations.length > 0) {
      const bestMood = moodDreamCorrelations.reduce((max, curr) => 
        curr.mood_level > max.mood_level ? curr : max
      )
      if (bestMood.dream_count > 0) {
        insights.push(
          `You dream most frequently when your mood is ${bestMood.mood_level}/5, ` +
          `with an average of ${bestMood.avg_sleep_hours.toFixed(1)} hours of sleep.`
        )
      }
    }

    // Sleep insight
    if (avgSleep > 0) {
      if (avgSleep < 6) {
        insights.push(
          `Your average sleep of ${avgSleep.toFixed(1)} hours is below recommended levels. ` +
          `Consider prioritizing rest for better dream recall.`
        )
      } else if (avgSleep >= 7 && avgSleep <= 9) {
        insights.push(
          `Your sleep quality is optimal at ${avgSleep.toFixed(1)} hours per night, ` +
          `which supports healthy dream patterns.`
        )
      }
    }

    // Life event insight
    if (eventCorrelations.length > 0) {
      const mostImpactfulEvent = eventCorrelations.reduce((max, curr) => 
        curr.dream_count > max.dream_count ? curr : max
      )
      insights.push(
        `${capitalize(mostImpactfulEvent.event_category)} events appear in ${mostImpactfulEvent.dream_count} of your dreams, ` +
        `often featuring themes of ${mostImpactfulEvent.common_themes.slice(0, 2).join(' and ')}.`
      )
    }

    // Stress insight
    if (avgStress >= 4) {
      insights.push(
        `Your stress levels have been elevated (${avgStress.toFixed(1)}/5). ` +
        `This may be reflected in your dream content and emotional tone.`
      )
    }

    return NextResponse.json({
      summary: {
        total_dreams: totalDreams,
        total_mood_logs: totalMoodLogs,
        total_life_events: totalLifeEvents,
        avg_mood: avgMood,
        avg_stress: avgStress,
        avg_energy: avgEnergy,
        avg_sleep: avgSleep,
        time_range_days: daysAgo
      },
      mood_dream_correlations: moodDreamCorrelations,
      life_event_correlations: eventCorrelations,
      sleep_quality_insights: sleepQualityInsights,
      time_series: timeSeriesData.reverse(),
      key_insights: insights
    })

  } catch (error) {
    console.error('Failed to generate insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

// Helper functions
function countOccurrences(arr: string[]): Record<string, number> {
  return arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function getTop(counts: Record<string, number>, n: number): string[] {
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key]) => key)
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const groupKey = String(item[key])
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
