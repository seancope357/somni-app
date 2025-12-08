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

    // Fetch all user's dreams (last 50 for context)
    const { data: allDreams } = await supabase
      .from('dreams')
      .select('id, content, interpretation, symbols, emotions, themes, sleep_hours, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Fetch recent mood logs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('mood, stress, energy, notes, log_date')
      .eq('user_id', userId)
      .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })

    // Fetch life events (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const { data: lifeEvents } = await supabase
      .from('life_events')
      .select('title, description, category, event_date, impact_level')
      .eq('user_id', userId)
      .gte('event_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('event_date', { ascending: false })

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

    // Build comprehensive context
    const preferredName = onboarding?.preferred_name || 'there'
    const userGoals = onboarding?.primary_goals?.join(', ') || 'not specified'
    const currentLifeContext = onboarding?.current_life_context || 'not specified'
    const stressLevel = onboarding?.stress_level || 'unknown'
    const primaryStressors = onboarding?.primary_stressors?.join(', ') || 'not specified'

    // Calculate recent mood average
    const recentMoodAvg = moodLogs && moodLogs.length > 0
      ? (moodLogs.reduce((sum, log) => sum + log.mood, 0) / moodLogs.length).toFixed(1)
      : 'not tracked'

    // Build system prompt with rich context
    const systemPrompt = `You are a warm, insightful dream analysis assistant chatting with ${preferredName}.

## Current Dream Being Discussed
**Content:** ${dreamContent}
**Interpretation:** ${interpretation}

## User Profile
- **Goals:** ${userGoals}
- **Life Context:** ${currentLifeContext}
- **Stress Level:** ${stressLevel}
- **Primary Stressors:** ${primaryStressors}
- **Recent Average Mood:** ${recentMoodAvg}/5

## Dream History Patterns (Last 50 Dreams)
- **Total Dreams Logged:** ${allDreams?.length || 0}
- **Top Recurring Symbols:** ${topSymbols.join(', ') || 'none yet'}
- **Top Emotions:** ${topEmotions.join(', ') || 'none yet'}
- **Top Themes:** ${topThemes.join(', ') || 'none yet'}

## Recent Mood Context (Last 30 Days)
${moodLogs && moodLogs.length > 0
  ? moodLogs.slice(0, 5).map(m => `${m.log_date}: Mood ${m.mood}/5, Stress ${m.stress}/5${m.notes ? ' - ' + m.notes : ''}`).join('\n')
  : 'No mood logs yet'}

## Recent Life Events (Last 6 Months)
${lifeEvents && lifeEvents.length > 0
  ? lifeEvents.slice(0, 5).map(e => `${e.event_date}: ${e.title} (${e.category})`).join('\n')
  : 'No life events logged'}

## Your Role
- Be conversational, warm, and insightful
- Reference specific patterns from their history when relevant
- Connect the current dream to their broader patterns and life context
- Ask thoughtful follow-up questions
- Be supportive and non-judgmental
- Use their preferred name (${preferredName})
- Keep responses concise but meaningful (2-4 paragraphs max)
- When asked about correlations, cite specific dreams or patterns
- Acknowledge uncertainty - interpretations are possibilities, not facts

## Conversation Guidelines
- Start responses warmly and personally
- Reference their stated goals and life context when relevant
- Point out patterns you notice across their dreams
- Connect dreams to mood trends or life events when applicable
- Encourage exploration rather than giving definitive answers
- If they ask about meaning, offer multiple perspectives
- Be curious and ask clarifying questions

Remember: You're having a conversation, not giving a lecture. Be natural, warm, and genuinely curious about their inner world.`

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
