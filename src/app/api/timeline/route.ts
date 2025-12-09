import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const view = searchParams.get('view') || 'month' // day, week, month, year

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Calculate date range based on view if not provided
    let start = startDate
    let end = endDate

    if (!start || !end) {
      const now = new Date()

      switch (view) {
        case 'day':
          start = now.toISOString().split('T')[0]
          end = start
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          start = weekStart.toISOString().split('T')[0]
          end = weekEnd.toISOString().split('T')[0]
          break
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
          break
        case 'year':
          start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
          end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
          break
        default:
          // Default to current month
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      }
    }

    console.log(`Fetching timeline data for ${userId} from ${start} to ${end}`)

    // Fetch dreams
    const { data: dreams, error: dreamsError } = await supabase
      .from('dreams')
      .select('id, content, symbols, emotions, themes, sleep_hours, created_at')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59')
      .order('created_at', { ascending: true })

    if (dreamsError) throw dreamsError

    // Fetch mood logs
    const { data: moodLogs, error: moodError } = await supabase
      .from('mood_logs')
      .select('id, mood, stress, energy, notes, log_date')
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: true })

    if (moodError) throw moodError

    // Fetch life events
    const { data: lifeEvents, error: eventsError } = await supabase
      .from('life_events')
      .select('id, title, description, category, event_date, impact_level')
      .eq('user_id', userId)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date', { ascending: true })

    if (eventsError) throw eventsError

    // Organize data by date
    const timelineMap: Record<string, {
      date: string
      dreams: any[]
      moodLog: any | null
      lifeEvents: any[]
      dreamCount: number
      avgMood: number | null
      hasHighStress: boolean
    }> = {}

    // Initialize all dates in range
    const current = new Date(start)
    const endDateObj = new Date(end)

    while (current <= endDateObj) {
      const dateKey = current.toISOString().split('T')[0]
      timelineMap[dateKey] = {
        date: dateKey,
        dreams: [],
        moodLog: null,
        lifeEvents: [],
        dreamCount: 0,
        avgMood: null,
        hasHighStress: false
      }
      current.setDate(current.getDate() + 1)
    }

    // Populate dreams
    dreams?.forEach(dream => {
      const dateKey = dream.created_at.split('T')[0]
      if (timelineMap[dateKey]) {
        timelineMap[dateKey].dreams.push(dream)
        timelineMap[dateKey].dreamCount++
      }
    })

    // Populate mood logs
    moodLogs?.forEach(mood => {
      const dateKey = mood.log_date
      if (timelineMap[dateKey]) {
        timelineMap[dateKey].moodLog = mood
        timelineMap[dateKey].avgMood = mood.mood
        timelineMap[dateKey].hasHighStress = mood.stress >= 4
      }
    })

    // Populate life events
    lifeEvents?.forEach(event => {
      const dateKey = event.event_date
      if (timelineMap[dateKey]) {
        timelineMap[dateKey].lifeEvents.push(event)
      }
    })

    // Convert to array and calculate summary stats
    const timelineData = Object.values(timelineMap)

    const daysWithDreams = timelineData.filter(d => d.dreamCount > 0).length
    const totalDays = timelineData.length

    const stats = {
      totalDreams: dreams?.length || 0,
      totalMoodLogs: moodLogs?.length || 0,
      totalLifeEvents: lifeEvents?.length || 0,
      averageMood: moodLogs && moodLogs.length > 0
        ? Math.round((moodLogs.reduce((sum, m) => sum + m.mood, 0) / moodLogs.length) * 10) / 10
        : null,
      averageStress: moodLogs && moodLogs.length > 0
        ? Math.round((moodLogs.reduce((sum, m) => sum + m.stress, 0) / moodLogs.length) * 10) / 10
        : null,
      dreamFrequency: {
        daysWithDreams,
        totalDays,
        percentage: totalDays > 0 ? Math.round((daysWithDreams / totalDays) * 100 * 10) / 10 : 0
      }
    }

    return NextResponse.json({
      timeline: timelineData,
      stats,
      dateRange: { start, end }
    })

  } catch (error: any) {
    console.error('Timeline error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch timeline data' },
      { status: 500 }
    )
  }
}
