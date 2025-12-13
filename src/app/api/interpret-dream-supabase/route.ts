import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { awardXP, updateStreak, checkAchievements, updateDailyStats, updateGoalProgress } from '@/lib/gamification'
import type { CelebrationEvent } from '@/types/gamification'

// Force Node.js runtime for Groq SDK compatibility
export const runtime = 'nodejs'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
})

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

    // Fetch user's onboarding data for personalization
    const { data: onboardingData } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('Onboarding data:', onboardingData ? 'Found' : 'Not found')

    // Fetch today's mood log to link with dream
    const today = new Date().toISOString().split('T')[0]
    const { data: moodLog } = await supabase
      .from('mood_logs')
      .select('id, mood, stress, energy, notes')
      .eq('user_id', userId)
      .eq('log_date', today)
      .single()

    console.log('Mood log for today:', moodLog ? 'Found' : 'Not found')

    // Fetch recent dreams for pattern context (last 30 dreams)
    const { data: recentDreams } = await supabase
      .from('dreams')
      .select('content, created_at, symbols, themes, emotions')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    console.log('Recent dreams fetched:', recentDreams?.length || 0)

    // Fetch active life events (events within last 30 days or ongoing)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: lifeEvents } = await supabase
      .from('life_events')
      .select('title, category, intensity, date_start, description')
      .eq('user_id', userId)
      .gte('date_start', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date_start', { ascending: false })
      .limit(10)

    console.log('Active life events fetched:', lifeEvents?.length || 0)

    // Fetch mood trends (last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const { data: moodTrends } = await supabase
      .from('mood_logs')
      .select('log_date, mood, stress, energy')
      .eq('user_id', userId)
      .gte('log_date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })

    console.log('Mood trends fetched:', moodTrends?.length || 0)

    // Fetch recent journal entries for additional context (last 10)
    const { data: recentJournals } = await supabase
      .from('journal_entries')
      .select('content, created_at, tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Recent journals fetched:', recentJournals?.length || 0)

    // Create enhanced prompt that considers sleep hours
    const sleepContext = sleepHours ? 
      `Sleep Context: ${sleepHours} hours of sleep. ${sleepHours < 6 ? 'Relatively little sleep, which may influence dream content and recall.' : sleepHours > 9 ? 'More sleep than average, which may affect dream vividness and complexity.' : 'Normal amount of sleep.'}` : ''
    
    // Create mood context if available
    const moodEmojis = ['😢', '😕', '😐', '😊', '😄']
    const moodContext = moodLog ?
      `Mood Context: The dreamer's current state - Mood: ${moodEmojis[moodLog.mood - 1]} (${moodLog.mood}/5), Stress: ${moodLog.stress}/5, Energy: ${moodLog.energy}/5.${moodLog.notes ? ` Note: "${moodLog.notes}"` : ''}` : ''

    // Create personalization context from onboarding data
    let personalizationContext = ''
    if (onboardingData) {
      const parts: string[] = []

      if (onboardingData.preferred_name) {
        parts.push(`The dreamer prefers to be called ${onboardingData.preferred_name}.`)
      }

      if (onboardingData.communication_style) {
        const styleMap = {
          'direct': 'direct and straightforward',
          'gentle': 'gentle and empathetic',
          'balanced': 'balanced between direct and gentle'
        }
        parts.push(`Communication preference: ${styleMap[onboardingData.communication_style] || 'balanced'}.`)
      }

      if (onboardingData.primary_goals && onboardingData.primary_goals.length > 0) {
        parts.push(`Primary goals: ${onboardingData.primary_goals.join(', ')}.`)
      }

      if (onboardingData.dream_recall_frequency) {
        parts.push(`Dream recall frequency: ${onboardingData.dream_recall_frequency}.`)
      }

      if (onboardingData.recurring_themes && onboardingData.recurring_themes.length > 0) {
        parts.push(`Common recurring themes in their dreams: ${onboardingData.recurring_themes.join(', ')}.`)
      }

      if (onboardingData.current_life_context) {
        parts.push(`Current life context: ${onboardingData.current_life_context}`)
      }

      if (onboardingData.major_life_events && onboardingData.major_life_events.length > 0) {
        parts.push(`Recent significant life events: ${onboardingData.major_life_events.join(', ')}.`)
      }

      if (onboardingData.stress_level) {
        parts.push(`Current stress level: ${onboardingData.stress_level}.`)
      }

      if (onboardingData.primary_stressors && onboardingData.primary_stressors.length > 0) {
        parts.push(`Primary stressors: ${onboardingData.primary_stressors.join(', ')}.`)
      }

      if (onboardingData.topics_to_avoid && onboardingData.topics_to_avoid.length > 0) {
        parts.push(`IMPORTANT - Topics to avoid or handle sensitively: ${onboardingData.topics_to_avoid.join(', ')}.`)
      }

      if (onboardingData.comfort_with_depth) {
        const depthMap = {
          'surface': 'Keep interpretations relatively light and surface-level.',
          'moderate': 'Provide moderately deep analysis with some psychological exploration.',
          'deep': 'Provide deep, thorough psychological analysis.'
        }
        parts.push(depthMap[onboardingData.comfort_with_depth] || '')
      }

      if (onboardingData.therapy_experience) {
        parts.push('The dreamer has therapy experience and may be familiar with psychological concepts.')
      }

      if (onboardingData.meditation_practice) {
        parts.push('The dreamer practices meditation.')
      }

      if (parts.length > 0) {
        personalizationContext = 'Personal Context: ' + parts.join(' ')
      }
    }

    // Build recent dreams pattern context
    let dreamPatternsContext = ''
    if (recentDreams && recentDreams.length > 0) {
      const allSymbols = recentDreams.flatMap(d => d.symbols || [])
      const allThemes = recentDreams.flatMap(d => d.themes || [])
      const allEmotions = recentDreams.flatMap(d => d.emotions || [])

      const topSymbols = [...new Set(allSymbols)].slice(0, 5)
      const topThemes = [...new Set(allThemes)].slice(0, 5)
      const topEmotions = [...new Set(allEmotions)].slice(0, 5)

      const parts: string[] = []
      if (topSymbols.length > 0) parts.push(`Recurring symbols: ${topSymbols.join(', ')}`)
      if (topThemes.length > 0) parts.push(`Common themes: ${topThemes.join(', ')}`)
      if (topEmotions.length > 0) parts.push(`Frequent emotions: ${topEmotions.join(', ')}`)

      if (parts.length > 0) {
        dreamPatternsContext = `Dream History (last ${recentDreams.length} dreams): ` + parts.join('. ') + '.'
      }
    }

    // Build life events context
    let lifeEventsContext = ''
    if (lifeEvents && lifeEvents.length > 0) {
      const eventSummaries = lifeEvents.map(e => {
        const intensity = e.intensity ? ` (intensity: ${e.intensity}/5)` : ''
        return `${e.category}: ${e.title}${intensity}`
      })
      lifeEventsContext = `Recent Life Events: ${eventSummaries.join('; ')}.`
    }

    // Build mood trends context
    let moodTrendsContext = ''
    if (moodTrends && moodTrends.length > 0) {
      const avgMood = (moodTrends.reduce((sum, m) => sum + m.mood, 0) / moodTrends.length).toFixed(1)
      const avgStress = (moodTrends.reduce((sum, m) => sum + m.stress, 0) / moodTrends.length).toFixed(1)
      const avgEnergy = (moodTrends.reduce((sum, m) => sum + m.energy, 0) / moodTrends.length).toFixed(1)

      moodTrendsContext = `Mood Trends (last ${moodTrends.length} days): Average mood: ${avgMood}/5, stress: ${avgStress}/5, energy: ${avgEnergy}/5.`
    }

    // Build journal context
    let journalContext = ''
    if (recentJournals && recentJournals.length > 0) {
      const allTags = recentJournals.flatMap(j => j.tags || [])
      const topTags = [...new Set(allTags)].slice(0, 5)

      if (topTags.length > 0) {
        journalContext = `Recent Journal Themes: ${topTags.join(', ')}.`
      }
    }

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
          content: `Please interpret this dream:

${dream}

${sleepContext}
${moodContext}
${personalizationContext}
${dreamPatternsContext}
${lifeEventsContext}
${moodTrendsContext}
${journalContext}

Use the personal context provided to tailor your interpretation to this specific individual's life situation, communication preferences, and psychological needs. Consider their dream history patterns, current life events, mood trends, and journal themes when providing your analysis. Be sensitive to their boundaries and goals.`
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
    let gamificationData: {
      xp_awarded?: number
      level_up?: boolean
      new_level?: number
      streak_count?: number
      streak_milestone?: boolean
      celebrations?: CelebrationEvent[]
      newly_unlocked_achievements?: any[]
    } = {}

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

      // GAMIFICATION INTEGRATION
      try {
        const today = new Date().toISOString().split('T')[0]
        const celebrations: CelebrationEvent[] = []

        // 1. Award XP for logging dream
        console.log('Awarding XP for dream...')
        const dreamXP = dream.length > 500 ? 20 : 10 // Bonus XP for detailed dreams
        const xpResult = await awardXP(userId, dreamXP, dream.length > 500 ? 'Detailed dream logged' : 'Dream logged')
        gamificationData.xp_awarded = dreamXP

        if (xpResult.level_up && xpResult.celebration) {
          gamificationData.level_up = true
          gamificationData.new_level = xpResult.new_level
          celebrations.push(xpResult.celebration)
        }

        // 2. Update dream streak
        console.log('Updating dream streak...')
        const streakResult = await updateStreak(userId, 'dream', today)
        gamificationData.streak_count = streakResult.streak
        gamificationData.streak_milestone = streakResult.milestone

        if (streakResult.milestone) {
          celebrations.push({
            type: 'streak_milestone',
            title: `${streakResult.streak}-Day Streak!`,
            description: `You're on fire! ${streakResult.streak} days of consistent dream logging.`,
            icon: '🔥',
            animation: 'fireworks',
            xp_reward: streakResult.xp_awarded || 0
          })
        }

        // 3. Check for achievements
        console.log('Checking achievements...')
        const achievementCheck = await checkAchievements(userId, 'dream_logged')

        if (achievementCheck.newly_unlocked.length > 0) {
          gamificationData.newly_unlocked_achievements = achievementCheck.newly_unlocked

          // Add celebration for each achievement
          for (const achievement of achievementCheck.newly_unlocked) {
            celebrations.push({
              type: 'achievement',
              title: 'Achievement Unlocked!',
              description: achievement.name,
              icon: achievement.icon,
              animation: 'confetti',
              xp_reward: achievement.xp_reward
            })
          }
        }

        // 4. Update daily stats
        console.log('Updating daily stats...')
        await updateDailyStats(userId, {
          dreams_logged: 1
        })

        // 5. Update goal progress
        console.log('Updating goal progress...')
        const completedGoals = await updateGoalProgress(userId, 'dream_count', 1)

        if (completedGoals.length > 0) {
          // Add celebration for each completed goal
          for (const goalId of completedGoals) {
            celebrations.push({
              type: 'goal_completed',
              title: 'Goal Completed!',
              description: 'You've reached your dream logging goal!',
              icon: '🎯',
              animation: 'fireworks',
              xp_reward: 50
            })
          }
        }

        gamificationData.celebrations = celebrations
        console.log(`Gamification complete: ${dreamXP} XP, ${celebrations.length} celebrations`)

      } catch (gamificationError) {
        console.error('Gamification error (non-critical):', gamificationError)
        // Don't throw - gamification failure shouldn't break dream saving
      }
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
      } : null,
      gamification: gamificationData
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
