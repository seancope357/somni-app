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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Fetch user's recent dreams (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentDreams, error: dreamsError } = await supabase
      .from('dreams')
      .select('content, symbols, emotions, themes, sleep_hours, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (dreamsError) {
      console.error('Error fetching dreams:', dreamsError)
      return NextResponse.json(
        { error: 'Failed to fetch dreams' },
        { status: 500 }
      )
    }

    // Fetch user's recent mood logs (last 7 days)
    const { data: recentMoods, error: moodsError } = await supabase
      .from('mood_logs')
      .select('mood, stress, energy, log_date')
      .eq('user_id', userId)
      .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })
      .limit(7)

    if (moodsError) {
      console.error('Error fetching moods:', moodsError)
    }

    // Fetch user's recent life events (active in last 30 days)
    const { data: recentEvents, error: eventsError } = await supabase
      .from('life_events')
      .select('title, category, intensity, start_date')
      .eq('user_id', userId)
      .gte('start_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_date', { ascending: false })
      .limit(3)

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
    }

    // Generate prompts using AI
    const contextSummary = buildContextSummary(recentDreams || [], recentMoods || [], recentEvents || [])
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a dream journaling assistant. Based on the user's recent dream patterns, moods, and life events, generate 3-5 thoughtful journaling prompts to help them explore their dreams more deeply. The prompts should be:
- Specific and actionable
- Related to their recent patterns
- Encourage self-reflection
- Help uncover deeper meanings

Return the prompts as a JSON array of strings. Example: ["Prompt 1", "Prompt 2", "Prompt 3"]`
        },
        {
          role: 'user',
          content: contextSummary
        }
      ],
      temperature: 0.8,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Parse the AI response to extract prompts
    let prompts: string[] = []
    try {
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: split by newlines and filter
        prompts = responseText
          .split('\n')
          .filter(line => line.trim().length > 10)
          .map(line => line.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5)
      }
    } catch (parseError) {
      console.error('Error parsing prompts:', parseError)
      // Fallback prompts
      prompts = [
        'What emotions stood out most in your recent dreams?',
        'Are there any recurring symbols or themes you notice?',
        'How might your current life events be reflected in your dreams?',
        'What questions do your dreams seem to be asking you?'
      ]
    }

    return NextResponse.json({
      prompts,
      context: {
        dream_count: recentDreams?.length || 0,
        mood_count: recentMoods?.length || 0,
        event_count: recentEvents?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Failed to generate prompts:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate prompts' },
      { status: 500 }
    )
  }
}

function buildContextSummary(
  dreams: any[],
  moods: any[],
  events: any[]
): string {
  let summary = 'User Context:\n\n'

  // Dreams summary
  if (dreams.length > 0) {
    summary += `Recent Dreams (${dreams.length}):\n`
    dreams.forEach((dream, idx) => {
      const symbols = dream.symbols?.slice(0, 3).join(', ') || 'none'
      const emotions = dream.emotions?.slice(0, 2).join(', ') || 'none'
      summary += `${idx + 1}. Symbols: ${symbols} | Emotions: ${emotions}\n`
    })
    summary += '\n'
  } else {
    summary += 'No recent dreams logged.\n\n'
  }

  // Moods summary
  if (moods.length > 0) {
    const avgMood = (moods.reduce((sum, m) => sum + m.mood, 0) / moods.length).toFixed(1)
    const avgStress = (moods.reduce((sum, m) => sum + m.stress, 0) / moods.length).toFixed(1)
    const avgEnergy = (moods.reduce((sum, m) => sum + m.energy, 0) / moods.length).toFixed(1)
    summary += `Recent Mood (avg over ${moods.length} days): Mood=${avgMood}/5, Stress=${avgStress}/5, Energy=${avgEnergy}/5\n\n`
  }

  // Life events summary
  if (events.length > 0) {
    summary += `Recent Life Events:\n`
    events.forEach((event, idx) => {
      summary += `${idx + 1}. ${event.title} (${event.category}, intensity: ${event.intensity}/5)\n`
    })
    summary += '\n'
  }

  summary += 'Generate 3-5 personalized journaling prompts for this user.'

  return summary
}
