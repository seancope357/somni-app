'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Send, Skip, ArrowLeft, Brain, Moon, Heart, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { OnboardingData, OnboardingStep, ConversationMessage } from '@/types/onboarding'
import { cn } from '@/lib/utils'

interface OnboardingFlowProps {
  userId: string
  onComplete: (data: OnboardingData) => void
  onSkip?: () => void
}

export default function OnboardingFlow({ userId, onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({ user_id: userId })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hello, and welcome to DREAMONEIR. I'm Dr. Aria Chen, your digital onboarding specialist.\n\nI want to thank you for trusting us with something as personal as your dreams. What we're about to do together will take about 8-12 minutes, and I promise every question serves a purpose: to create a deeply personalized experience that honors your unique inner world.\n\nEverything you share is encrypted and completely private. This information will only be used to enhance your dream interpretation experience and help you gain meaningful insights.\n\nYou can pause at any time, skip questions you're not comfortable with, or come back to this later. There's no pressure here—just curiosity and care.\n\nShall we begin?",
      step: 'welcome',
      timestamp: Date.now()
    }])
  }, [])

  const getStepProgress = (): number => {
    const steps: OnboardingStep[] = [
      'welcome', 'name-goals', 'sleep-patterns', 'dream-recall',
      'perspectives', 'life-context', 'emotional-processing', 'boundaries', 'preferences'
    ]
    const currentIndex = steps.indexOf(currentStep)
    return ((currentIndex + 1) / steps.length) * 100
  }

  const addMessage = (role: 'assistant' | 'user', content: string, step?: OnboardingStep) => {
    setMessages(prev => [...prev, { role, content, step, timestamp: Date.now() }])
  }

  const handleUserResponse = async (response: string) => {
    if (!response.trim()) return

    // Add user message
    addMessage('user', response)
    setUserInput('')
    setIsThinking(true)

    // Simulate thinking delay for natural conversation feel
    await new Promise(resolve => setTimeout(resolve, 800))

    // Process response based on current step
    processStep(currentStep, response)
    setIsThinking(false)
  }

  const processStep = (step: OnboardingStep, response: string) => {
    switch (step) {
      case 'welcome':
        setCurrentStep('name-goals')
        addMessage('assistant', "Wonderful. Let's start with the basics.\n\nWhat would you like me to call you? And please, share your preferred name—not necessarily your legal name, but the name that feels most like you.", 'name-goals')
        break

      case 'name-goals':
        if (!onboardingData.preferred_name) {
          // First question: name
          setOnboardingData(prev => ({ ...prev, preferred_name: response }))
          addMessage('assistant', `${response}, what a lovely name. Thank you for sharing that with me.\n\nNow, I'm curious—what brought you to DREAMONEIR today? What are you hoping to discover or understand about your dreams?\n\nTake your time. There are no wrong answers here.`, 'name-goals')
        } else {
          // Second question: goals
          const goals = extractGoals(response)
          setOnboardingData(prev => ({ ...prev, primary_goals: goals }))
          setCurrentStep('sleep-patterns')
          addMessage('assistant', `That's really insightful. ${acknowledgeGoals(goals)}\n\nLet's talk about your sleep patterns for a moment. This helps us understand the context in which your dreams emerge.\n\nWould you describe your sleep schedule as regular (similar bedtime/wake time), irregular (varies significantly), or do you work shifts?`, 'sleep-patterns')
        }
        break

      case 'sleep-patterns':
        if (!onboardingData.sleep_schedule) {
          // Sleep schedule
          const schedule = extractSleepSchedule(response)
          setOnboardingData(prev => ({ ...prev, sleep_schedule: schedule }))
          addMessage('assistant', `I see. ${acknowledgeSleepSchedule(schedule)}\n\nHow many hours of sleep do you typically get on an average night? And how would you rate the quality of that sleep—excellent, good, fair, or poor?`, 'sleep-patterns')
        } else {
          // Sleep hours and quality
          const { hours, quality } = extractSleepQuality(response)
          setOnboardingData(prev => ({ ...prev, typical_sleep_hours: hours, sleep_quality: quality }))
          setCurrentStep('dream-recall')
          addMessage('assistant', `Thank you for sharing that. ${acknowledgeSleepQuality(quality, hours)}\n\nNow, let's explore your relationship with your dreams.\n\nHow often do you remember your dreams when you wake up? Would you say never, rarely, sometimes, often, or always?`, 'dream-recall')
        }
        break

      case 'dream-recall':
        if (!onboardingData.dream_recall_frequency) {
          // Dream recall frequency
          const frequency = extractFrequency(response)
          setOnboardingData(prev => ({ ...prev, dream_recall_frequency: frequency }))
          addMessage('assistant', `${acknowledgeDreamRecall(frequency)}\n\nWhen you do dream—or when you remember dreaming—what are they typically like?\n\nFor example, are they vivid and colorful? Fragmented and unclear? Do you have recurring dreams or nightmares? Have you ever experienced lucid dreams (where you know you're dreaming)?\n\nShare whatever comes to mind.`, 'dream-recall')
        } else {
          // Dream types and themes
          const { types, themes } = extractDreamCharacteristics(response)
          setOnboardingData(prev => ({ ...prev, dream_types: types, recurring_themes: themes }))
          setCurrentStep('perspectives')
          addMessage('assistant', `That's fascinating. ${acknowledgeDreamTypes(types)}\n\nDREAMONEIR offers interpretations from three different psychological perspectives: Jungian (focused on archetypes and the collective unconscious), Freudian (exploring unconscious wishes and conflicts), and Cognitive (examining how dreams help with problem-solving and memory).\n\nDo any of these approaches particularly interest you? Or would you prefer a synthesized interpretation that blends all three?`, 'perspectives')
        }
        break

      case 'perspectives':
        const perspectives = extractPerspectives(response)
        setOnboardingData(prev => ({ ...prev, preferred_perspectives: perspectives }))
        setCurrentStep('life-context')
        addMessage('assistant', `Excellent choice. ${acknowledgePerspectives(perspectives)}\n\nNow, this next part is completely optional, but it can help personalize your interpretations significantly.\n\nAre you currently experiencing any major life transitions or significant events? This could be anything—a new job, a relationship change, moving, loss, a health journey, creative projects—whatever feels relevant to you.\n\nIf you'd prefer not to share, just say "skip" and we'll move on.`, 'life-context')
        break

      case 'life-context':
        if (response.toLowerCase().includes('skip')) {
          setCurrentStep('emotional-processing')
          addMessage('assistant', `Of course, I completely understand.\n\nLet's talk about how you typically process emotions and experiences. Do you journal? Talk with friends or a therapist? Express yourself creatively? Exercise? Meditate?\n\nKnowing this helps us tailor the depth and style of interpretations to what resonates with you.`, 'emotional-processing')
        } else {
          const lifeContext = response
          const events = extractLifeEvents(response)
          setOnboardingData(prev => ({ ...prev, current_life_context: lifeContext, major_life_events: events }))
          setCurrentStep('emotional-processing')
          addMessage('assistant', `Thank you for trusting me with that. ${acknowledgeLifeContext()}\n\nThis kind of awareness will help us provide interpretations that feel relevant to where you are right now.\n\nHow do you typically process emotions and experiences? Do you journal? Talk with friends or a therapist? Express yourself creatively? Exercise? Meditate?\n\nThere's no right answer—I'm just curious about what works for you.`, 'emotional-processing')
        }
        break

      case 'emotional-processing':
        if (!onboardingData.emotional_processing_style) {
          // Processing style
          const styles = extractProcessingStyles(response)
          setOnboardingData(prev => ({ ...prev, emotional_processing_style: styles }))
          addMessage('assistant', `${acknowledgeProcessingStyle(styles)}\n\nOn a scale from low to very high, how would you describe your current stress level? And if you're comfortable sharing, what are the primary sources of that stress?`, 'emotional-processing')
        } else {
          // Stress level and stressors
          const { level, stressors } = extractStressInfo(response)
          setOnboardingData(prev => ({ ...prev, stress_level: level, primary_stressors: stressors }))
          setCurrentStep('boundaries')
          addMessage('assistant', `I hear you. ${acknowledgeStress(level)}\n\nAlmost done—just a couple more questions.\n\nAre there any topics, themes, or subjects you'd prefer to avoid in your dream interpretations? Perhaps certain subjects feel too raw or triggering right now.\n\nThis is about creating a safe space for you. You can be as specific or general as you like.`, 'boundaries')
        }
        break

      case 'boundaries':
        const topicsToAvoid = extractTopicsToAvoid(response)
        setOnboardingData(prev => ({ ...prev, topics_to_avoid: topicsToAvoid }))
        setCurrentStep('preferences')
        addMessage('assistant', `Thank you for setting those boundaries. That takes wisdom and self-awareness.\n\nLast question: How would you like to receive insights from DREAMONEIR?\n\nWould you prefer immediate interpretations when you log a dream, daily summaries, weekly reports, or would you rather check in on your own schedule with no notifications?`, 'preferences')
        break

      case 'preferences':
        const notificationPref = extractNotificationPreference(response)
        const updatedData = {
          ...onboardingData,
          notification_preference: notificationPref,
          completed: true,
          completed_at: new Date().toISOString()
        }
        setOnboardingData(updatedData)
        setCurrentStep('complete')
        addMessage('assistant', `Perfect. ${onboardingData.preferred_name}, we're all set.\n\nThank you for taking this journey with me. What you've shared will help us create dream interpretations that truly resonate with who you are and where you are in your life right now.\n\nRemember, you can always update these preferences in your settings if things change.\n\nYou're ready to explore your dreams. Let's begin.`, 'complete')

        // Save to database and complete
        saveOnboarding(updatedData)
        break
    }
  }

  const saveOnboarding = async (data: OnboardingData) => {
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to save onboarding')

      setTimeout(() => {
        onComplete(data)
      }, 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-0 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-purple-500/20 rounded-3xl"></div>
        <div className="absolute inset-[1px] bg-slate-900/40 backdrop-blur-xl rounded-3xl"></div>

        <div className="relative z-10">
          {/* Header */}
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <CardTitle className="text-xl font-light text-white">
                    Welcome to DREAMONEIR
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-1">
                    Your personalized dream journey begins here
                  </p>
                </div>
              </div>
              {onSkip && currentStep !== 'complete' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-slate-400 hover:text-white"
                >
                  <Skip className="w-4 h-4 mr-2" />
                  Skip for now
                </Button>
              )}
            </div>
            <Progress value={getStepProgress()} className="mt-4 h-1" />
          </CardHeader>

          {/* Messages */}
          <CardContent className="p-6">
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      msg.role === 'assistant'
                        ? 'bg-white/5 text-slate-200'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Moon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {currentStep !== 'complete' && (
              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleUserResponse(userInput)
                    }
                  }}
                  placeholder="Type your response here... (Press Enter to send)"
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none border-0 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-slate-400/50 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-purple-500/50"
                  disabled={isThinking}
                />
                <Button
                  onClick={() => handleUserResponse(userInput)}
                  disabled={!userInput.trim() || isThinking}
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl h-auto px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-6">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
                <p className="text-slate-300 text-sm">
                  Preparing your personalized experience...
                </p>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  )
}

// Helper functions for natural language processing
function extractGoals(response: string): string[] {
  const goals: string[] = []
  const lowerResponse = response.toLowerCase()

  if (lowerResponse.includes('understand') || lowerResponse.includes('meaning')) goals.push('understand-dreams')
  if (lowerResponse.includes('pattern') || lowerResponse.includes('recurring')) goals.push('find-patterns')
  if (lowerResponse.includes('self') || lowerResponse.includes('personal') || lowerResponse.includes('growth')) goals.push('self-discovery')
  if (lowerResponse.includes('nightmare') || lowerResponse.includes('anxiety')) goals.push('reduce-nightmares')
  if (lowerResponse.includes('lucid') || lowerResponse.includes('control')) goals.push('lucid-dreaming')
  if (lowerResponse.includes('creative') || lowerResponse.includes('inspiration')) goals.push('creativity')
  if (lowerResponse.includes('memory') || lowerResponse.includes('remember')) goals.push('improve-recall')

  if (goals.length === 0) goals.push('general-exploration')
  return goals
}

function extractSleepSchedule(response: string): 'regular' | 'irregular' | 'shift-work' {
  const lower = response.toLowerCase()
  if (lower.includes('shift') || lower.includes('night')) return 'shift-work'
  if (lower.includes('irregular') || lower.includes('varies') || lower.includes('different')) return 'irregular'
  return 'regular'
}

function extractSleepQuality(response: string): { hours: number, quality: 'excellent' | 'good' | 'fair' | 'poor' } {
  const hours = parseFloat(response.match(/\d+\.?\d*/)?.[0] || '7')
  const lower = response.toLowerCase()
  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good'

  if (lower.includes('excellent') || lower.includes('great')) quality = 'excellent'
  else if (lower.includes('good')) quality = 'good'
  else if (lower.includes('fair') || lower.includes('okay') || lower.includes('ok')) quality = 'fair'
  else if (lower.includes('poor') || lower.includes('bad') || lower.includes('terrible')) quality = 'poor'

  return { hours, quality }
}

function extractFrequency(response: string): 'never' | 'rarely' | 'sometimes' | 'often' | 'always' {
  const lower = response.toLowerCase()
  if (lower.includes('never')) return 'never'
  if (lower.includes('rarely') || lower.includes('seldom')) return 'rarely'
  if (lower.includes('sometimes') || lower.includes('occasional')) return 'sometimes'
  if (lower.includes('often') || lower.includes('frequent')) return 'often'
  if (lower.includes('always') || lower.includes('every')) return 'always'
  return 'sometimes'
}

function extractDreamCharacteristics(response: string): { types: string[], themes: string[] } {
  const types: string[] = []
  const themes: string[] = []
  const lower = response.toLowerCase()

  if (lower.includes('vivid') || lower.includes('color')) types.push('vivid')
  if (lower.includes('fragment') || lower.includes('unclear')) types.push('fragmented')
  if (lower.includes('recurring') || lower.includes('repeat')) types.push('recurring')
  if (lower.includes('lucid') || lower.includes('aware')) types.push('lucid')
  if (lower.includes('nightmare') || lower.includes('scary')) types.push('nightmares')
  if (lower.includes('symbol')) types.push('symbolic')

  return { types, themes }
}

function extractPerspectives(response: string): string[] {
  const perspectives: string[] = []
  const lower = response.toLowerCase()

  if (lower.includes('jung') || lower.includes('archetype')) perspectives.push('jungian')
  if (lower.includes('freud') || lower.includes('unconscious')) perspectives.push('freudian')
  if (lower.includes('cognitive') || lower.includes('scientific')) perspectives.push('cognitive')
  if (lower.includes('all') || lower.includes('synth') || lower.includes('blend') || perspectives.length === 0) {
    perspectives.push('synthesized')
  }

  return perspectives
}

function extractLifeEvents(response: string): string[] {
  const events: string[] = []
  const lower = response.toLowerCase()

  if (lower.includes('job') || lower.includes('work') || lower.includes('career')) events.push('work')
  if (lower.includes('relationship') || lower.includes('partner') || lower.includes('marriage')) events.push('relationship')
  if (lower.includes('health') || lower.includes('illness')) events.push('health')
  if (lower.includes('move') || lower.includes('moving')) events.push('move')
  if (lower.includes('loss') || lower.includes('grief') || lower.includes('death')) events.push('loss')
  if (lower.includes('school') || lower.includes('study') || lower.includes('education')) events.push('study')

  return events
}

function extractProcessingStyles(response: string): string[] {
  const styles: string[] = []
  const lower = response.toLowerCase()

  if (lower.includes('journal') || lower.includes('writ')) styles.push('journaling')
  if (lower.includes('talk') || lower.includes('friend') || lower.includes('therapy')) styles.push('talking')
  if (lower.includes('creative') || lower.includes('art') || lower.includes('music')) styles.push('creative')
  if (lower.includes('exercise') || lower.includes('physical') || lower.includes('sport')) styles.push('physical')
  if (lower.includes('meditat')) styles.push('meditation')

  if (styles.length === 0) styles.push('other')
  return styles
}

function extractStressInfo(response: string): { level: 'low' | 'moderate' | 'high' | 'very-high', stressors: string[] } {
  const lower = response.toLowerCase()
  let level: 'low' | 'moderate' | 'high' | 'very-high' = 'moderate'

  if (lower.includes('very high') || lower.includes('extreme')) level = 'very-high'
  else if (lower.includes('high')) level = 'high'
  else if (lower.includes('moderate') || lower.includes('medium')) level = 'moderate'
  else if (lower.includes('low')) level = 'low'

  const stressors: string[] = []
  if (lower.includes('work')) stressors.push('work')
  if (lower.includes('relationship') || lower.includes('family')) stressors.push('relationships')
  if (lower.includes('health')) stressors.push('health')
  if (lower.includes('financ') || lower.includes('money')) stressors.push('finance')
  if (lower.includes('social')) stressors.push('social')

  return { level, stressors }
}

function extractTopicsToAvoid(response: string): string[] {
  if (response.toLowerCase().includes('no') || response.toLowerCase().includes('none')) {
    return []
  }
  return [response] // Store raw response for specific topics
}

function extractNotificationPreference(response: string): 'immediate' | 'daily-summary' | 'weekly-report' | 'none' {
  const lower = response.toLowerCase()
  if (lower.includes('immediate') || lower.includes('right away')) return 'immediate'
  if (lower.includes('daily')) return 'daily-summary'
  if (lower.includes('week')) return 'weekly-report'
  if (lower.includes('none') || lower.includes('no notification')) return 'none'
  return 'daily-summary'
}

// Acknowledgment functions for natural conversation
function acknowledgeGoals(goals: string[]): string {
  if (goals.includes('self-discovery')) return "The path to self-understanding is profound. I'm honored to support this journey."
  if (goals.includes('reduce-nightmares')) return "Nightmares can be distressing, but they often carry important messages. We'll approach this gently."
  if (goals.includes('lucid-dreaming')) return "Lucid dreaming is a fascinating practice. We'll help you explore that deeper awareness."
  return "These are meaningful intentions. I'll keep them in mind as we personalize your experience."
}

function acknowledgeSleepSchedule(schedule: string): string {
  if (schedule === 'shift-work') return "Shift work can really impact sleep architecture. That's important context."
  if (schedule === 'irregular') return "Irregular sleep can influence dream patterns in interesting ways."
  return "A regular schedule often supports richer dream recall."
}

function acknowledgeSleepQuality(quality: string, hours: number): string {
  if (quality === 'poor') return `${hours} hours of poor-quality sleep can definitely affect both dreaming and daily wellbeing. That's worth noting.`
  if (hours < 6) return `${hours} hours is on the shorter side. Sleep duration can influence dream stages and recall.`
  return "Thank you for that context about your sleep."
}

function acknowledgeDreamRecall(frequency: string): string {
  if (frequency === 'always' || frequency === 'often') {
    return "High dream recall is wonderful. You have rich material to work with."
  }
  if (frequency === 'never' || frequency === 'rarely') {
    return "Limited recall is more common than you might think. Sometimes the interpretative work itself can help improve recall over time."
  }
  return "That's helpful to know."
}

function acknowledgeDreamTypes(types: string[]): string {
  if (types.includes('lucid')) return "Lucid dreams suggest a strong metacognitive awareness during sleep."
  if (types.includes('nightmares')) return "Nightmares, while unsettling, often contain the psyche's most urgent messages."
  if (types.includes('vivid')) return "Vivid dreams tend to be particularly rich in symbolic content."
  return "Each type of dream offers its own insights."
}

function acknowledgePerspectives(perspectives: string[]): string {
  if (perspectives.includes('synthesized')) {
    return "A blended approach gives you the most comprehensive view. You'll get insights from all three schools of thought."
  }
  if (perspectives.includes('jungian')) {
    return "Jung's approach to the collective unconscious and archetypes can reveal profound patterns."
  }
  if (perspectives.includes('freudian')) {
    return "Freud's focus on the unconscious mind and hidden wishes offers unique insights."
  }
  return "That perspective will shape how we approach your dream interpretations."
}

function acknowledgeLifeContext(): string {
  return "Life transitions often show up in our dreamscapes in symbolic ways. This will add valuable context."
}

function acknowledgeProcessingStyle(styles: string[]): string {
  if (styles.includes('journaling')) return "Journaling and dream work are natural companions. This will enhance both practices."
  if (styles.includes('therapy')) return "Working with a therapist provides important emotional scaffolding. Our interpretations can complement that work."
  return "Understanding how you process will help us match the depth and tone to what serves you best."
}

function acknowledgeStress(level: string): string {
  if (level === 'very-high' || level === 'high') {
    return "High stress levels can intensify dream activity. Please be gentle with yourself as we explore these experiences."
  }
  return "Stress levels definitely influence our dream content and emotional tone."
}
