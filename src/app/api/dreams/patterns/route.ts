import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const { data: dreams, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching dreams for patterns:', error)
      return NextResponse.json(
        { error: 'Failed to analyze dream patterns' },
        { status: 500 }
      )
    }

    if (!dreams || dreams.length === 0) {
      return NextResponse.json({
        totalDreams: 0,
        topSymbols: [],
        topEmotions: [],
        topThemes: [],
        dreamFrequency: { thisWeek: 0, thisMonth: 0 },
        sleepStats: { average: 0, min: 0, max: 0, total: 0 },
        sleepChartData: []
      })
    }

    // Analyze patterns across all dreams
    const allSymbols = dreams.flatMap(d => d.symbols || [])
    const allEmotions = dreams.flatMap(d => d.emotions || [])
    const allThemes = dreams.flatMap(d => d.themes || [])

    // Count frequency of each pattern
    const symbolCounts = allSymbols.reduce((acc: any, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1
      return acc
    }, {})

    const emotionCounts = allEmotions.reduce((acc: any, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1
      return acc
    }, {})

    const themeCounts = allThemes.reduce((acc: any, theme) => {
      acc[theme] = (acc[theme] || 0) + 1
      return acc
    }, {})

    // Sort by frequency
    const topSymbols = Object.entries(symbolCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count: count as number }))

    const topEmotions = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([emotion, count]) => ({ emotion, count: count as number }))

    const topThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count: count as number }))

    // Analyze sleep patterns
    const dreamsWithSleep = dreams.filter(d => d.sleep_hours !== null && d.sleep_hours !== undefined)
    const sleepHours = dreamsWithSleep.map(d => d.sleep_hours as number)
    
    const sleepStats = sleepHours.length > 0 ? {
      average: sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length,
      min: Math.min(...sleepHours),
      max: Math.max(...sleepHours),
      total: sleepHours.length
    } : { average: 0, min: 0, max: 0, total: 0 }

    // Create sleep data for chart (last 30 dreams with sleep data)
    const sleepChartData = dreamsWithSleep
      .slice(0, 30)
      .reverse()
      .map(dream => ({
        date: new Date(dream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: dream.sleep_hours,
        content: dream.content.slice(0, 50) + (dream.content.length > 50 ? '...' : '')
      }))

    const patterns = {
      totalDreams: dreams.length,
      topSymbols,
      topEmotions,
      topThemes,
      dreamFrequency: dreams.length > 0 ? {
        thisWeek: dreams.filter(d => {
          const dreamDate = new Date(d.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return dreamDate >= weekAgo
        }).length,
        thisMonth: dreams.filter(d => {
          const dreamDate = new Date(d.created_at)
          const monthAgo = new Date()
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return dreamDate >= monthAgo
        }).length
      } : { thisWeek: 0, thisMonth: 0 },
      sleepStats,
      sleepChartData
    }

    return NextResponse.json(patterns)

  } catch (error) {
    console.error('Failed to analyze patterns:', error)
    return NextResponse.json(
      { error: 'Failed to analyze dream patterns' },
      { status: 500 }
    )
  }
}