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

// Helper to get week date range
function getWeekRange(date: Date = new Date()) {
  const curr = new Date(date)
  const first = curr.getDate() - curr.getDay() // First day is Sunday
  const last = first + 6 // Last day is Saturday

  const weekStart = new Date(curr.setDate(first))
  const weekEnd = new Date(curr.setDate(last))

  weekStart.setHours(0, 0, 0, 0)
  weekEnd.setHours(23, 59, 59, 999)

  return {
    start: weekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0]
  }
}

export async function POST(request: Request) {
  try {
    const { userId, weekOffset = 0 } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Calculate week range (offset allows generating past weeks)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - (weekOffset * 7))
    const { start: weekStart, end: weekEnd } = getWeekRange(targetDate)

    console.log(`Generating digest for ${userId} from ${weekStart} to ${weekEnd}`)

    // Check if digest already exists for this week
    const { data: existingDigest } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart)
      .single()

    if (existingDigest) {
      return NextResponse.json({
        digest: existingDigest,
        cached: true
      })
    }

    // Fetch dreams from this week
    const { data: dreams, error: dreamsError } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd)
      .order('created_at', { ascending: false })

    if (dreamsError) throw dreamsError

    // Fetch mood logs from this week
    const { data: moodLogs, error: moodError } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd)
      .order('log_date', { ascending: false })

    if (moodError) throw moodError

    // Fetch journal entries
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd)

    if (journalError) throw journalError

    // Fetch user's onboarding data for personalization
    const { data: onboarding } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If no activity this week, return empty digest
    if (!dreams?.length && !moodLogs?.length && !journalEntries?.length) {
      return NextResponse.json({
        message: 'No activity this week',
        empty: true
      })
    }

    // Calculate statistics
    const totalDreams = dreams?.length || 0
    const totalJournalEntries = journalEntries?.length || 0

    const allSymbols: string[] = []
    const allEmotions: string[] = []
    const allThemes: string[] = []

    dreams?.forEach(dream => {
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
      .slice(0, 5)
      .map(([symbol]) => symbol)

    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion]) => emotion)

    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme)

    const averageMood = moodLogs && moodLogs.length > 0
      ? moodLogs.reduce((sum, log) => sum + log.mood, 0) / moodLogs.length
      : null

    const averageSleepHours = dreams && dreams.length > 0
      ? dreams
          .filter(d => d.sleep_hours)
          .reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / dreams.filter(d => d.sleep_hours).length
      : null

    // Prepare context for AI analysis
    const dreamsContext = dreams?.map(d => ({
      date: new Date(d.created_at).toLocaleDateString(),
      content: d.content.substring(0, 200) + '...',
      symbols: d.symbols,
      emotions: d.emotions,
      themes: d.themes,
      sleepHours: d.sleep_hours
    })) || []

    const moodsContext = moodLogs?.map(m => ({
      date: m.log_date,
      mood: m.mood,
      stress: m.stress,
      energy: m.energy
    })) || []

    const userGoals = onboarding?.primary_goals || []
    const preferredName = onboarding?.preferred_name || 'there'

    // Generate AI digest
    console.log('Calling Groq for digest generation...')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a thoughtful dream analyst creating a weekly digest for a user named ${preferredName}.

Your task is to analyze their week of dreams, moods, and patterns to create an insightful, personalized summary.

User's Goals: ${userGoals.join(', ')}

Provide your analysis in this JSON format:
{
  "summary": "2-3 paragraph weekly overview with warm, encouraging tone",
  "pattern_trends": [
    {
      "pattern": "Pattern name (e.g., 'Water symbolism')",
      "description": "What this pattern means and its significance",
      "frequency": "How often it appeared",
      "insight": "What this suggests about the user's inner world"
    }
  ],
  "mood_insights": {
    "correlation": "How moods correlated with dream content/quality",
    "notable_patterns": "Any interesting mood-dream connections",
    "recommendation": "Suggestion for the user"
  },
  "goal_progress": {
    "observations": "How their dreams relate to their stated goals",
    "wins": "Any positive developments",
    "next_steps": "Gentle suggestions for continued growth"
  },
  "reflection_prompts": [
    "Thought-provoking question 1",
    "Thought-provoking question 2",
    "Thought-provoking question 3"
  ]
}

Be warm, insightful, and avoid generic advice. Reference specific dreams and patterns from their data.`
        },
        {
          role: 'user',
          content: `Analyze this week's data:

Dreams this week (${totalDreams} total):
${JSON.stringify(dreamsContext, null, 2)}

Moods this week:
${JSON.stringify(moodsContext, null, 2)}

Top symbols: ${topSymbols.join(', ')}
Top emotions: ${topEmotions.join(', ')}
Top themes: ${topThemes.join(', ')}

Generate the weekly digest.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    const digestContent = JSON.parse(aiResponse)

    // Save digest to database
    const { data: savedDigest, error: saveError } = await supabase
      .from('weekly_digests')
      .insert({
        user_id: userId,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        summary: digestContent.summary,
        pattern_trends: digestContent.pattern_trends,
        mood_insights: digestContent.mood_insights,
        goal_progress: digestContent.goal_progress,
        reflection_prompts: digestContent.reflection_prompts,
        total_dreams: totalDreams,
        total_journal_entries: totalJournalEntries,
        average_mood: averageMood,
        average_sleep_hours: averageSleepHours,
        top_symbols: topSymbols,
        top_emotions: topEmotions,
        top_themes: topThemes
      })
      .select()
      .single()

    if (saveError) throw saveError

    console.log('Digest generated and saved successfully')

    return NextResponse.json({
      digest: savedDigest,
      cached: false
    })

  } catch (error: any) {
    console.error('Weekly digest error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate digest' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch existing digests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const { data: digests, error } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ digests })

  } catch (error: any) {
    console.error('Fetch digests error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch digests' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to mark digest as viewed
export async function PATCH(request: Request) {
  try {
    const { digestId } = await request.json()

    if (!digestId) {
      return NextResponse.json({ error: 'Digest ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('weekly_digests')
      .update({
        viewed: true,
        viewed_at: new Date().toISOString()
      })
      .eq('id', digestId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ digest: data })

  } catch (error: any) {
    console.error('Update digest error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update digest' },
      { status: 500 }
    )
  }
}
