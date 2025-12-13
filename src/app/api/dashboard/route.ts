import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStartOfWeek, getDateDaysAgo } from '@/lib/date-utils'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Calculate date ranges using standardized utilities
    const weekAgoDate = getStartOfWeek()
    const thirtyDaysAgoDate = getDateDaysAgo(30)

    // Fetch dreams this week (comparing date portion only for consistency)
    const { data: dreamsThisWeek } = await supabase
      .from('dreams')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', weekAgoDate)

    // Fetch recent dreams (last 3)
    const { data: recentDreams } = await supabase
      .from('dreams')
      .select('id, content, symbols, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    // Fetch all dreams for sleep average
    const { data: allDreams } = await supabase
      .from('dreams')
      .select('sleep_hours')
      .eq('user_id', userId)
      .not('sleep_hours', 'is', null)

    // Calculate average sleep hours
    const avgSleepHours = allDreams && allDreams.length > 0
      ? allDreams.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / allDreams.length
      : 7.5

    // Fetch mood logs for streak and chart
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('mood, stress, energy, log_date')
      .eq('user_id', userId)
      .gte('log_date', thirtyDaysAgoDate)
      .order('log_date', { ascending: false })

    // Calculate mood streak (consecutive days with logs)
    let moodStreak = 0
    if (moodLogs && moodLogs.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      let currentDate = new Date(today)

      for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const hasLog = moodLogs.some(log => log.log_date === dateStr)

        if (hasLog) {
          moodStreak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    // Prepare mood chart data (last 7 days)
    const moodChartData = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const dayLog = moodLogs?.find(log => log.log_date === dateStr)

      moodChartData.push({
        date: dateStr,
        mood: dayLog?.mood || 0,
        stress: dayLog?.stress || 0,
        energy: dayLog?.energy || 0
      })
    }

    // Fetch life events
    const { data: lifeEvents } = await supabase
      .from('life_events')
      .select('id')
      .eq('user_id', userId)

    // Generate AI insights based on data
    const insights = []

    if (dreamsThisWeek && dreamsThisWeek.length >= 5) {
      insights.push(`You're on a roll! ${dreamsThisWeek.length} dreams logged this week.`)
    } else if (dreamsThisWeek && dreamsThisWeek.length === 0) {
      insights.push("Haven't logged any dreams this week. Try keeping a journal by your bed!")
    }

    if (moodStreak >= 7) {
      insights.push(`Impressive ${moodStreak}-day mood tracking streak! Consistency reveals patterns.`)
    } else if (moodStreak >= 3) {
      insights.push(`${moodStreak}-day mood streak. Keep it going to spot trends!`)
    }

    if (avgSleepHours < 6) {
      insights.push("Your average sleep is below 6 hours. Consider prioritizing rest for better dream recall.")
    } else if (avgSleepHours >= 7 && avgSleepHours <= 9) {
      insights.push(`Healthy sleep average of ${avgSleepHours.toFixed(1)} hours. Optimal for dream formation!`)
    }

    // Check if mood is trending up or down
    if (moodLogs && moodLogs.length >= 7) {
      const recentAvg = moodLogs.slice(0, 3).reduce((sum, log) => sum + log.mood, 0) / 3
      const olderAvg = moodLogs.slice(3, 6).reduce((sum, log) => sum + log.mood, 0) / 3

      if (recentAvg > olderAvg + 0.5) {
        insights.push("Your mood has been improving lately! 📈")
      } else if (recentAvg < olderAvg - 0.5) {
        insights.push("Mood seems lower recently. Consider what might help lift your spirits.")
      }
    }

    // Prepare response
    const dashboardData = {
      quickStats: {
        dreamsThisWeek: dreamsThisWeek?.length || 0,
        moodStreak,
        avgSleepHours,
        totalLifeEvents: lifeEvents?.length || 0
      },
      recentDreams: recentDreams || [],
      moodChartData,
      insights
    }

    return NextResponse.json(dashboardData)

  } catch (error: any) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
