import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ZAI from 'z-ai-web-dev-sdk'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { dream, sleepHours, saveToHistory, userId } = await request.json()

    if (!dream || typeof dream !== 'string' || dream.trim().length === 0) {
      return NextResponse.json(
        { error: 'Dream text is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    const zai = await ZAI.create()

    // Create enhanced prompt that considers sleep hours
    const sleepContext = sleepHours ? 
      `The dreamer had ${sleepHours} hours of sleep before this dream. ${sleepHours < 6 ? 'This is relatively little sleep, which may influence dream content and recall. ' : sleepHours > 9 ? 'This is more sleep than average, which may affect dream vividness and complexity. ' : 'This is a normal amount of sleep. '}` : ''

    // Get interpretation
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a professional dream interpreter with deep knowledge of psychology, symbolism, and various cultural perspectives on dreams. 
          
${sleepContext}Your task is to provide thoughtful, insightful interpretations of dreams while being:

- Respectful and supportive
- Culturally sensitive 
- Psychologically informed
- Focused on personal growth and self-reflection
- Careful not to make definitive predictions about future
- Considerate of how sleep duration may affect dream content and recall

Structure your interpretation with:
1. A brief summary of dream's main themes
2. Analysis of key symbols and their potential meanings
3. Emotional and psychological insights
4. How sleep duration might influence the dream
5. Practical guidance for self-reflection
6. Positive, empowering takeaways

Always maintain that dream interpretation is subjective and the dreamer's own intuition is most important.

Additionally, after your interpretation, provide a JSON object with detected patterns:
{
  "symbols": ["symbol1", "symbol2"],
  "emotions": ["emotion1", "emotion2"], 
  "themes": ["theme1", "theme2"]
}`
        },
        {
          role: 'user',
          content: `Please interpret this dream: ${dream}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const fullResponse = completion.choices[0]?.message?.content

    if (!fullResponse) {
      throw new Error('No interpretation received from AI')
    }

    // Extract interpretation and patterns
    const interpretationMatch = fullResponse.match(/\{[\s\S]*\}$/)
    const interpretation = interpretationMatch 
      ? fullResponse.slice(0, interpretationMatch.index).trim()
      : fullResponse

    let patterns = { symbols: [], emotions: [], themes: [] }
    
    if (interpretationMatch) {
      try {
        patterns = JSON.parse(interpretationMatch[0])
      } catch (e) {
        console.warn('Failed to parse patterns JSON')
      }
    }

    // Save to database if requested
    let savedDream = null
    if (saveToHistory) {
      const { data, error } = await supabase
        .from('dreams')
        .insert({
          user_id: userId,
          content: dream,
          interpretation: interpretation,
          sleep_hours: sleepHours || null,
          symbols: patterns.symbols || [],
          emotions: patterns.emotions || [],
          themes: patterns.themes || []
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving dream:', error)
        throw new Error('Failed to save dream to database')
      }

      savedDream = data
    }

    return NextResponse.json({ 
      interpretation,
      patterns,
      savedDream
    })

  } catch (error) {
    console.error('Dream interpretation error:', error)
    
    return NextResponse.json(
      { error: 'Failed to interpret dream. Please try again.' },
      { status: 500 }
    )
  }
}