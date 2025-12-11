import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import Groq from 'groq-sdk'

function getGroq() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  return new Groq({ apiKey })
}

// Force Node.js runtime for Groq SDK compatibility
export const runtime = 'nodejs'

// Create Supabase client

// Create Groq client

// Helper function to parse multi-perspective interpretation
function parseInterpretationResponse(responseText: string) {
  // Extract perspectives using regex
  const jungianMatch = responseText.match(/\*\*JUNGIAN PERSPECTIVE\*\*\n([\s\S]*?)\n\*\*FREUDIAN PERSPECTIVE\*\*/)
  const freudianMatch = responseText.match(/\*\*FREUDIAN PERSPECTIVE\*\*\n([\s\S]*?)\n\*\*COGNITIVE\/EVOLUTIONARY PERSPECTIVE\*\*/)
  const cognitiveMatch = responseText.match(/\*\*COGNITIVE\/EVOLUTIONARY PERSPECTIVE\*\*\n([\s\S]*?)\n\*\*SYNTHESIZED INTERPRETATION\*\*/)
  const synthesizedMatch = responseText.match(/\*\*SYNTHESIZED INTERPRETATION\*\*\n([\s\S]*?)\n\*\*REFLECTION QUESTIONS\*\*/)
  const questionsMatch = responseText.match(/\*\*REFLECTION QUESTIONS\*\*\n([\s\S]*?)(?:\n\{|$)/)
  
  // Extract JSON data
  const jsonMatch = responseText.match(/\{[\s\S]*"symbols"[\s\S]*?\}/)
  let structuredData = {
    symbols: [],
    emotions: [],
    themes: [],
    archetypal_figures: [],
    cognitive_patterns: [],
    wish_indicators: []
  }
  
  if (jsonMatch) {
    try {
      structuredData = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse JSON from interpretation:', e)
    }
  }
  
  // Parse reflection questions
  let reflection_questions: string[] = []
  if (questionsMatch && questionsMatch[1]) {
    reflection_questions = questionsMatch[1]
      .split('\n')
      .filter(q => q.trim().startsWith('-'))
      .map(q => q.trim().substring(1).trim())
  }
  
  return {
    fullInterpretation: responseText,
    jungian_analysis: jungianMatch ? jungianMatch[1].trim() : '',
    freudian_analysis: freudianMatch ? freudianMatch[1].trim() : '',
    cognitive_analysis: cognitiveMatch ? cognitiveMatch[1].trim() : '',
    synthesized_analysis: synthesizedMatch ? synthesizedMatch[1].trim() : '',
    reflection_questions,
    ...structuredData
  }
}

export async function POST(request: Request) {
  console.log('=== Multi-Perspective Dream Interpretation Request Started ===')
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

  console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
  console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  try {
    const { dream, sleepHours, saveToHistory, userId } = await request.json()
    console.log('Request data received:', { dreamLength: dream?.length, sleepHours, saveToHistory, userId: userId?.substring(0, 8) + '...' })

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

    // Fetch today's mood log to link with dream
    const today = new Date().toISOString().split('T')[0]
    const { data: moodLog } = await supabase
      .from('mood_logs')
      .select('id, mood, stress, energy, notes')
      .eq('user_id', userId)
      .eq('log_date', today)
      .single()
    
    console.log('Mood log for today:', moodLog ? 'Found' : 'Not found')

    // Create enhanced prompt that considers sleep hours
    const sleepContext = sleepHours ? 
      `Sleep Context: ${sleepHours} hours of sleep. ${sleepHours < 6 ? 'Relatively little sleep, which may influence dream content and recall.' : sleepHours > 9 ? 'More sleep than average, which may affect dream vividness and complexity.' : 'Normal amount of sleep.'}` : ''
    
    // Create mood context if available
    const moodEmojis = ['😢', '😕', '😐', '😊', '😄']
    const moodContext = moodLog ? 
      `Mood Context: The dreamer's current state - Mood: ${moodEmojis[moodLog.mood - 1]} (${moodLog.mood}/5), Stress: ${moodLog.stress}/5, Energy: ${moodLog.energy}/5.${moodLog.notes ? ` Note: "${moodLog.notes}"` : ''}` : ''

    // Get interpretation using Groq with multi-perspective prompt
    console.log('Calling Groq API for multi-perspective interpretation...')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert dream analyst trained in multiple schools of psychological thought. Your role is to provide comprehensive, multi-perspective dream interpretations.

## Your Approach

You will analyze each dream from THREE distinct psychological perspectives:

1. **JUNGIAN PERSPECTIVE**: Focus on archetypes, collective unconscious, individuation, compensation, and symbolic meaning within personal and cultural mythology.

2. **FREUDIAN PERSPECTIVE**: Focus on wish fulfillment, manifest vs. latent content, unconscious conflicts, repressed desires, and dream-work mechanisms (condensation, displacement, symbolization).

3. **COGNITIVE/EVOLUTIONARY PERSPECTIVE**: Focus on continuity with waking life, cognitive patterns, problem-solving, threat simulation, memory consolidation, and emotional processing.

4. **SYNTHESIZED INTERPRETATION**: Integrate insights from all three perspectives, highlighting common themes, complementary insights, and practical wisdom.

## Key Principles

### Jungian Analysis
- Identify archetypal figures (Shadow, Anima/Animus, Self, Wise Old Man, Great Mother, Trickster, Hero)
- Consider compensatory function (how dream balances conscious attitudes)
- Explore collective vs. personal symbolism
- Relate to life stage and individuation process
- Use amplification (expand symbols through mythology, culture, personal associations)

### Freudian Analysis  
- Identify potential wish fulfillment (especially repressed desires)
- Distinguish manifest content (surface narrative) from latent content (underlying meaning)
- Look for dream-work mechanisms: condensation, displacement, symbolization
- Consider childhood origins and early experiences
- Examine sexual/aggressive content and defense mechanisms
- Note: Symbols are personal, not universal

### Cognitive/Evolutionary Analysis
- Apply Calvin Hall's five conceptions: self, others, world, penalties, conflict
- Assess continuity with waking concerns and preoccupations
- Identify cognitive patterns, schemas, and biases
- Consider threat simulation (Revonsuo): rehearsal of danger responses
- Examine problem-solving and memory consolidation
- Analyze emotional processing and regulation

### Synthesis
- Find common threads across perspectives
- Highlight complementary insights
- Provide actionable wisdom
- Suggest reflection questions
- Maintain humility: interpretations are possibilities, not certainties

## Ethical Guidelines
- Never claim definitive interpretations
- Frame insights as possibilities for exploration
- Emphasize the dreamer's personal associations are most important
- Acknowledge cultural variations in symbolism
- Handle trauma/nightmare content with sensitivity
- Remind users this is not a replacement for professional mental health care

## Context Integration
${sleepContext}
${moodContext}

## Output Format

Provide your interpretation in this structure:

**JUNGIAN PERSPECTIVE**
[2-3 paragraph analysis from Jungian viewpoint]

**FREUDIAN PERSPECTIVE**
[2-3 paragraph analysis from Freudian viewpoint]

**COGNITIVE/EVOLUTIONARY PERSPECTIVE**
[2-3 paragraph analysis from Cognitive/Evolutionary viewpoint]

**SYNTHESIZED INTERPRETATION**
[2-3 paragraphs integrating all perspectives with practical insights]

**REFLECTION QUESTIONS**
- [Question 1]
- [Question 2]
- [Question 3]
- [Question 4]
- [Question 5]

Then provide a JSON object with:
{
  "symbols": ["symbol1", "symbol2"],
  "emotions": ["emotion1", "emotion2"],
  "themes": ["theme1", "theme2"],
  "archetypal_figures": ["archetype1", "archetype2"],
  "cognitive_patterns": ["pattern1", "pattern2"],
  "wish_indicators": ["wish1", "wish2"]
}`
        },
        {
          role: 'user',
          content: `Please interpret this dream: ${dream}`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000 // Increased for multi-perspective analysis
    })

    const fullResponse = completion.choices[0]?.message?.content

    if (!fullResponse) {
      throw new Error('No interpretation received from AI')
    }

    console.log('Groq response received, parsing...')
    const parsedData = parseInterpretationResponse(fullResponse)

    // Save to database if requested
    let savedDream = null
    if (saveToHistory) {
      console.log('Saving dream to database...')
      const { data, error } = await supabase
        .from('dreams')
        .insert({
          user_id: userId,
          content: dream,
          interpretation: parsedData.fullInterpretation,
          jungian_analysis: parsedData.jungian_analysis,
          freudian_analysis: parsedData.freudian_analysis,
          cognitive_analysis: parsedData.cognitive_analysis,
          synthesized_analysis: parsedData.synthesized_analysis,
          sleep_hours: sleepHours || null,
          symbols: parsedData.symbols || [],
          emotions: parsedData.emotions || [],
          themes: parsedData.themes || [],
          archetypal_figures: parsedData.archetypal_figures || [],
          cognitive_patterns: parsedData.cognitive_patterns || [],
          wish_indicators: parsedData.wish_indicators || [],
          reflection_questions: parsedData.reflection_questions || [],
          mood_log_id: moodLog?.id || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving dream:', error)
        throw new Error('Failed to save dream to database')
      }

      savedDream = data
      console.log('Dream saved successfully')
    }

    return NextResponse.json({ 
      interpretation: parsedData.synthesized_analysis, // Return synthesis as main interpretation
      fullInterpretation: parsedData.fullInterpretation,
      perspectives: {
        jungian: parsedData.jungian_analysis,
        freudian: parsedData.freudian_analysis,
        cognitive: parsedData.cognitive_analysis,
        synthesized: parsedData.synthesized_analysis
      },
      patterns: {
        symbols: parsedData.symbols,
        emotions: parsedData.emotions,
        themes: parsedData.themes,
        archetypal_figures: parsedData.archetypal_figures,
        cognitive_patterns: parsedData.cognitive_patterns,
        wish_indicators: parsedData.wish_indicators
      },
      reflection_questions: parsedData.reflection_questions,
      savedDream,
      moodContext: moodLog ? {
        mood: moodLog.mood,
        stress: moodLog.stress,
        energy: moodLog.energy,
        emoji: moodEmojis[moodLog.mood - 1]
      } : null
    })

  } catch (error: any) {
    console.error('Dream interpretation error:', error)
    console.error('Error message:', error?.message)
    console.error('Error status:', error?.status)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // Return more specific error message
    const errorMessage = error?.message || 'Failed to interpret dream. Please try again.'
    const statusCode = error?.status || 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.error : undefined 
      },
      { status: statusCode }
    )
  }
}
