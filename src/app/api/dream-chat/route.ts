import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
})

export async function POST(request: Request) {
  console.log('=== Dream Chat Request Started ===')

  try {
    const { userId, dreamId, dreamContent, interpretation, userMessage, conversationHistory } = await request.json()

    if (!userId || !userMessage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Fetching comprehensive user context...')

    // Fetch user's onboarding data
    const { data: onboarding } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Fetch ALL user's dreams (increased from 50 to 200 for comprehensive analysis)
    const { data: allDreams } = await supabase
      .from('dreams')
      .select('id, content, interpretation, symbols, emotions, themes, sleep_hours, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)

    // Fetch ALL mood logs (last 90 days for better trend analysis)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('mood, stress, energy, notes, log_date')
      .eq('user_id', userId)
      .gte('log_date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })

    // Fetch life events (last 12 months for more context)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const { data: lifeEvents } = await supabase
      .from('life_events')
      .select('title, description, category, event_date, impact_level')
      .eq('user_id', userId)
      .gte('event_date', twelveMonthsAgo.toISOString().split('T')[0])
      .order('event_date', { ascending: false })

    // Fetch journal entries (last 90 days)
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('title, content, entry_date, mood_tag')
      .eq('user_id', userId)
      .gte('entry_date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('entry_date', { ascending: false })
      .limit(50)

    // Calculate pattern statistics
    const allSymbols: string[] = []
    const allEmotions: string[] = []
    const allThemes: string[] = []

    allDreams?.forEach(dream => {
      if (dream.symbols) allSymbols.push(...dream.symbols)
      if (dream.emotions) allEmotions.push(...dream.emotions)
      if (dream.themes) allThemes.push(...dream.themes)
    })

    const symbolCounts = allSymbols.reduce((acc, s) => {
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const emotionCounts = allEmotions.reduce((acc, e) => {
      acc[e] = (acc[e] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const themeCounts = allThemes.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topSymbols = Object.entries(symbolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, count]) => `${symbol} (${count}x)`)

    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([emotion, count]) => `${emotion} (${count}x)`)

    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => `${theme} (${count}x)`)

    // ============ COMPREHENSIVE SLEEP PATTERN ANALYSIS ============
    const dreamsWithSleep = allDreams?.filter(d => d.sleep_hours !== null && d.sleep_hours !== undefined) || []

    let sleepAnalysis = {
      totalRecordings: 0,
      avgSleepHours: 'no data',
      minSleepHours: 'no data',
      maxSleepHours: 'no data',
      sleepVariability: 'no data',
      consistency: 'no data',
      recentTrend: 'no data',
      sleepQualityBrackets: {} as Record<string, number>,
      sleepByDayOfWeek: {} as Record<string, number[]>,
      last30DaysAvg: 'no data',
      last7DaysAvg: 'no data'
    }

    if (dreamsWithSleep.length > 0) {
      const sleepHours = dreamsWithSleep.map(d => d.sleep_hours!)
      const avgSleep = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length
      const minSleep = Math.min(...sleepHours)
      const maxSleep = Math.max(...sleepHours)

      // Calculate variability (standard deviation)
      const variance = sleepHours.reduce((sum, hours) => sum + Math.pow(hours - avgSleep, 2), 0) / sleepHours.length
      const stdDev = Math.sqrt(variance)

      sleepAnalysis.totalRecordings = dreamsWithSleep.length
      sleepAnalysis.avgSleepHours = `${avgSleep.toFixed(1)}h`
      sleepAnalysis.minSleepHours = `${minSleep}h`
      sleepAnalysis.maxSleepHours = `${maxSleep}h`
      sleepAnalysis.sleepVariability = `±${stdDev.toFixed(1)}h`
      sleepAnalysis.consistency = stdDev < 1 ? 'Very Consistent' : stdDev < 1.5 ? 'Consistent' : stdDev < 2 ? 'Moderate' : 'Variable'

      // Sleep quality brackets
      sleepAnalysis.sleepQualityBrackets = {
        'Poor (<6h)': sleepHours.filter(h => h < 6).length,
        'Below Average (6-7h)': sleepHours.filter(h => h >= 6 && h < 7).length,
        'Good (7-8h)': sleepHours.filter(h => h >= 7 && h < 8).length,
        'Optimal (8-9h)': sleepHours.filter(h => h >= 8 && h < 9).length,
        'Extended (9h+)': sleepHours.filter(h => h >= 9).length
      }

      // Recent sleep trends
      const last7Dreams = dreamsWithSleep.slice(0, 7)
      const last30Dreams = dreamsWithSleep.slice(0, 30)

      if (last7Dreams.length > 0) {
        const last7Avg = last7Dreams.reduce((sum, d) => sum + d.sleep_hours!, 0) / last7Dreams.length
        sleepAnalysis.last7DaysAvg = `${last7Avg.toFixed(1)}h`
      }

      if (last30Dreams.length > 0) {
        const last30Avg = last30Dreams.reduce((sum, d) => sum + d.sleep_hours!, 0) / last30Dreams.length
        sleepAnalysis.last30DaysAvg = `${last30Avg.toFixed(1)}h`

        // Compare last 7 days to last 30 days for trend
        if (last7Dreams.length > 0) {
          const last7Avg = parseFloat(sleepAnalysis.last7DaysAvg)
          const diff = last7Avg - last30Avg
          if (diff > 0.5) sleepAnalysis.recentTrend = 'Increasing (sleeping more lately)'
          else if (diff < -0.5) sleepAnalysis.recentTrend = 'Decreasing (sleeping less lately)'
          else sleepAnalysis.recentTrend = 'Stable'
        }
      }

      // Sleep by day of week
      dreamsWithSleep.forEach(dream => {
        const date = new Date(dream.created_at)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
        if (!sleepAnalysis.sleepByDayOfWeek[dayName]) {
          sleepAnalysis.sleepByDayOfWeek[dayName] = []
        }
        sleepAnalysis.sleepByDayOfWeek[dayName].push(dream.sleep_hours!)
      })
    }

    // Sleep-Dream Pattern Correlations
    const sleepEmotionCorrelations: Record<string, string[]> = {}
    const sleepThemeCorrelations: Record<string, string[]> = {}

    if (dreamsWithSleep.length > 0) {
      dreamsWithSleep.forEach(dream => {
        const bracket =
          dream.sleep_hours! < 6 ? 'Poor Sleep (<6h)' :
          dream.sleep_hours! < 7 ? 'Low Sleep (6-7h)' :
          dream.sleep_hours! < 8 ? 'Good Sleep (7-8h)' :
          dream.sleep_hours! < 9 ? 'Optimal Sleep (8-9h)' : 'Extended Sleep (9h+)'

        if (!sleepEmotionCorrelations[bracket]) sleepEmotionCorrelations[bracket] = []
        if (!sleepThemeCorrelations[bracket]) sleepThemeCorrelations[bracket] = []

        if (dream.emotions) sleepEmotionCorrelations[bracket].push(...dream.emotions)
        if (dream.themes) sleepThemeCorrelations[bracket].push(...dream.themes)
      })
    }

    // Build comprehensive context
    const preferredName = onboarding?.preferred_name || 'there'
    const userGoals = onboarding?.primary_goals?.join(', ') || 'not specified'
    const currentLifeContext = onboarding?.current_life_context || 'not specified'
    const stressLevel = onboarding?.stress_level || 'unknown'
    const primaryStressors = onboarding?.primary_stressors?.join(', ') || 'not specified'
    const sleepSchedule = onboarding?.sleep_schedule || 'not specified'
    const typicalSleepHours = onboarding?.typical_sleep_hours || 'not specified'
    const dreamRecallFrequency = onboarding?.dream_recall_frequency || 'not specified'

    // Calculate mood statistics
    const recentMoodAvg = moodLogs && moodLogs.length > 0
      ? (moodLogs.reduce((sum, log) => sum + log.mood, 0) / moodLogs.length).toFixed(1)
      : 'not tracked'

    const recentStressAvg = moodLogs && moodLogs.length > 0
      ? (moodLogs.reduce((sum, log) => sum + log.stress, 0) / moodLogs.length).toFixed(1)
      : 'not tracked'

    const recentEnergyAvg = moodLogs && moodLogs.length > 0
      ? (moodLogs.reduce((sum, log) => sum + log.energy, 0) / moodLogs.length).toFixed(1)
      : 'not tracked'

    // Build system prompt with rich context
    const systemPrompt = `You are a warm, insightful dream analysis assistant chatting with ${preferredName}.

## Current Dream Being Discussed
**Content:** ${dreamContent}
**Interpretation:** ${interpretation}

## User Profile & Sleep Information
- **Goals:** ${userGoals}
- **Life Context:** ${currentLifeContext}
- **Stress Level:** ${stressLevel}
- **Primary Stressors:** ${primaryStressors}
- **Sleep Schedule:** ${sleepSchedule}
- **Typical Sleep Hours (Self-Reported):** ${typicalSleepHours}
- **Dream Recall Frequency:** ${dreamRecallFrequency}

## Comprehensive Sleep Pattern Analysis (Based on ${sleepAnalysis.totalRecordings} Dream Recordings)
### Overall Sleep Statistics:
- **Average Sleep:** ${sleepAnalysis.avgSleepHours}
- **Range:** ${sleepAnalysis.minSleepHours} to ${sleepAnalysis.maxSleepHours}
- **Variability:** ${sleepAnalysis.sleepVariability}
- **Consistency:** ${sleepAnalysis.consistency}
- **Recent Trend (Last 7 vs Last 30 Days):** ${sleepAnalysis.recentTrend}
- **Last 7 Days Average:** ${sleepAnalysis.last7DaysAvg}
- **Last 30 Days Average:** ${sleepAnalysis.last30DaysAvg}

### Sleep Quality Distribution:
${Object.entries(sleepAnalysis.sleepQualityBrackets).map(([bracket, count]) => `- ${bracket}: ${count} occurrences`).join('\n')}

### Sleep Patterns by Day of Week:
${Object.entries(sleepAnalysis.sleepByDayOfWeek).length > 0
  ? Object.entries(sleepAnalysis.sleepByDayOfWeek).map(([day, hours]) => {
      const avg = hours.reduce((a, b) => a + b, 0) / hours.length
      return `- ${day}: ${avg.toFixed(1)}h avg (${hours.length} recordings)`
    }).join('\n')
  : 'Not enough data yet'}

### Sleep-Dream Correlations:
**Emotions by Sleep Quality:**
${Object.entries(sleepEmotionCorrelations).map(([bracket, emotions]) => {
  const emotionFreq: Record<string, number> = {}
  emotions.forEach(e => emotionFreq[e] = (emotionFreq[e] || 0) + 1)
  const top3 = Object.entries(emotionFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion, count]) => `${emotion} (${count}x)`)
  return `- ${bracket}: ${top3.join(', ') || 'none yet'}`
}).join('\n')}

**Themes by Sleep Quality:**
${Object.entries(sleepThemeCorrelations).map(([bracket, themes]) => {
  const themeFreq: Record<string, number> = {}
  themes.forEach(t => themeFreq[t] = (themeFreq[t] || 0) + 1)
  const top3 = Object.entries(themeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme, count]) => `${theme} (${count}x)`)
  return `- ${bracket}: ${top3.join(', ') || 'none yet'}`
}).join('\n')}

## Dream History Patterns (Last ${allDreams?.length || 0} Dreams)
- **Total Dreams Logged:** ${allDreams?.length || 0}
- **Top Recurring Symbols:** ${topSymbols.join(', ') || 'none yet'}
- **Top Emotions:** ${topEmotions.join(', ') || 'none yet'}
- **Top Themes:** ${topThemes.join(', ') || 'none yet'}

## Recent Mood & Energy Context (Last 90 Days)
- **Average Mood:** ${recentMoodAvg}/5
- **Average Stress:** ${recentStressAvg}/5
- **Average Energy:** ${recentEnergyAvg}/5
- **Total Mood Logs:** ${moodLogs?.length || 0}

### Recent Daily Logs (Last 10):
${moodLogs && moodLogs.length > 0
  ? moodLogs.slice(0, 10).map(m => `${m.log_date}: Mood ${m.mood}/5, Stress ${m.stress}/5, Energy ${m.energy}/5${m.notes ? ' - ' + m.notes : ''}`).join('\n')
  : 'No mood logs yet'}

## Recent Journal Entries (Last 90 Days)
${journalEntries && journalEntries.length > 0
  ? journalEntries.slice(0, 5).map(j => `${j.entry_date}: "${j.title}"${j.mood_tag ? ' [' + j.mood_tag + ']' : ''}\n${j.content.substring(0, 150)}${j.content.length > 150 ? '...' : ''}`).join('\n\n')
  : 'No journal entries yet'}

## Recent Life Events (Last 12 Months)
${lifeEvents && lifeEvents.length > 0
  ? lifeEvents.slice(0, 10).map(e => `${e.event_date}: ${e.title} (${e.category}, Impact: ${e.impact_level}/5)`).join('\n')
  : 'No life events logged'}

## Your Role
- Be conversational, warm, and insightful
- **IMPORTANT: You have access to ALL user data. Reference specific patterns, numbers, and dates when answering questions**
- When asked about sleep patterns, cite the exact statistics above
- Connect sleep quality to dream emotions and themes using the correlation data
- Reference mood trends, journal entries, and life events when relevant
- Compare current patterns to historical averages
- Be supportive and non-judgmental
- Use their preferred name (${preferredName})
- Keep responses concise but meaningful (2-4 paragraphs max)
- When asked about correlations, provide specific data points and examples
- Acknowledge uncertainty - interpretations are possibilities, not facts

## Conversation Guidelines
- Start responses warmly and personally
- **When answering questions about sleep, moods, or patterns, ALWAYS cite specific data from above**
- Reference their stated goals and life context when relevant

## Data Visualization Guidelines
When discussing trends or patterns, format your response to enable automatic charts:

**For Sleep Trends:** List sleep hours explicitly (e.g., "You slept 7.5 hours, 8 hours, 6.5 hours, 7 hours, 8.5 hours over the past 5 days")

**For Mood Patterns:** Use X/5 format (e.g., "Your moods were 4/5, 3/5, 5/5, 4/5 this week")

**For Weekly Patterns:** Use day names with values (e.g., "Monday: 7h, Tuesday: 8h, Wednesday: 6.5h...")

**For Distributions:** Use percentages with labels (e.g., "25% positive, 40% neutral, 35% negative dreams")

These formats will automatically generate inline charts for the user to visualize the data.
- Point out patterns you notice across their dreams, sleep, moods, and life events
- Connect dreams to mood trends, sleep quality, or life events when applicable
- Encourage exploration rather than giving definitive answers
- If they ask about meaning, offer multiple perspectives supported by their data
- Be curious and ask clarifying questions
- **Example: If asked "How am I sleeping?", respond with: "Based on ${sleepAnalysis.totalRecordings} recordings, you're averaging ${sleepAnalysis.avgSleepHours} per night, with a ${sleepAnalysis.consistency.toLowerCase()} pattern..."**

Remember: You're having a data-informed conversation with access to their complete history. Be natural, warm, and genuinely curious about their inner world while providing insights grounded in their actual patterns.`

    // Build conversation history for AI
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: userMessage
      }
    ]

    console.log('Calling Groq for chat response...')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.8, // More creative for conversation
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from AI')
    }

    console.log('Chat response generated successfully')

    return NextResponse.json({
      response,
      context: {
        totalDreams: allDreams?.length || 0,
        topSymbols: topSymbols.slice(0, 3),
        recentMoodAverage: recentMoodAvg
      }
    })

  } catch (error: any) {
    console.error('Dream chat error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Failed to process chat message',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
