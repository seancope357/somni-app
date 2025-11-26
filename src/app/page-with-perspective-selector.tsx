'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mic, MicOff, Sparkles, Book, BookOpen, History, TrendingUp, Search, X, LogOut, Heart, Brain, Zap, Calendar, Lightbulb, Settings } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import AuthForm from '@/components/auth-form'
import TodayMoodWidget from '@/components/mood/TodayMoodWidget'
import MoodHistoryChart from '@/components/mood/MoodHistoryChart'
import LifeEventsTimeline from '@/components/events/LifeEventsTimeline'
import DreamEventLinker from '@/components/events/DreamEventLinker'
import InsightsView from '@/components/insights/InsightsView'
import SettingsView from '@/components/settings/SettingsView'
import SimilarDreams from '@/components/dreams/SimilarDreams'
import SmartPrompts from '@/components/prompts/SmartPrompts'
import HistoryFilters, { FilterOptions } from '@/components/dreams/HistoryFilters'
import JournalView from '@/components/journal/JournalView'
import DreamDetailsDialog from '@/components/dreams/DreamDetailsDialog'
import { FormattedText } from '@/components/ui/formatted-text'

interface Dream {
  id: string
  content: string
  interpretation: string
  jungian_analysis?: string
  freudian_analysis?: string
  cognitive_analysis?: string
  synthesized_analysis?: string
  sleep_hours: number | null
  symbols: string[]
  emotions: string[]
  themes: string[]
  archetypal_figures?: string[]
  cognitive_patterns?: string[]
  wish_indicators?: string[]
  reflection_questions?: string[]
  created_at: string
}

interface Patterns {
  totalDreams: number
  topSymbols: { symbol: string; count: number }[]
  topEmotions: { emotion: string; count: number }[]
  topThemes: { theme: string; count: number }[]
  dreamFrequency: { thisWeek: number; thisMonth: number }
  sleepStats: { average: number; min: number; max: number; total: number }
  sleepChartData: { date: string; hours: number; content: string }[]
}

type PerspectiveType = 'synthesized' | 'jungian' | 'freudian' | 'cognitive'

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const [dreamText, setDreamText] = useState('')
  const [interpretation, setInterpretation] = useState('')
  const [perspectives, setPerspectives] = useState<any>(null)
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>([])
  const [preferredPerspective, setPreferredPerspective] = useState<PerspectiveType>('synthesized')
  const [moodContext, setMoodContext] = useState<{ mood: number; stress: number; energy: number; emoji: string } | null>(null)
  const [sleepHours, setSleepHours] = useState(7.5)
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentView, setCurrentView] = useState<'interpret' | 'history' | 'patterns' | 'journal' | 'events' | 'insights' | 'settings'>('interpret')
  const [dreams, setDreams] = useState<Dream[]>([])
  const [patterns, setPatterns] = useState<Patterns | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saveToHistory, setSaveToHistory] = useState(true)
  const [historyFilters, setHistoryFilters] = useState<FilterOptions>({
    dateRange: null,
    moodLevel: null,
    hasLinkedEvents: null,
    sortBy: 'date-desc'
  })
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null)
  const [showDreamDialog, setShowDreamDialog] = useState(false)

  // Load preferred perspective from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preferredPerspective')
    if (saved) {
      setPreferredPerspective(saved as PerspectiveType)
    }
  }, [])

  // Save preferred perspective to localStorage
  const updatePreferredPerspective = (perspective: PerspectiveType) => {
    setPreferredPerspective(perspective)
    localStorage.setItem('preferredPerspective', perspective)
    toast({
      title: "Preference saved",
      description: `${getPerspectiveLabel(perspective)} perspective will be shown by default.`,
    })
  }

  const getPerspectiveLabel = (perspective: PerspectiveType) => {
    const labels = {
      synthesized: 'Synthesized',
      jungian: 'Jungian',
      freudian: 'Freudian',
      cognitive: 'Cognitive/Evolutionary'
    }
    return labels[perspective]
  }

  const getPerspectiveDescription = (perspective: PerspectiveType) => {
    const descriptions = {
      synthesized: 'Integrated insights from all perspectives',
      jungian: 'Archetypes, symbols, and individuation',
      freudian: 'Wish fulfillment and unconscious desires',
      cognitive: 'Pattern recognition and threat simulation'
    }
    return descriptions[perspective]
  }

  const getDisplayedInterpretation = () => {
    if (!perspectives) return interpretation

    switch (preferredPerspective) {
      case 'jungian':
        return perspectives.jungian || interpretation
      case 'freudian':
        return perspectives.freudian || interpretation
      case 'cognitive':
        return perspectives.cognitive || interpretation
      case 'synthesized':
      default:
        return perspectives.synthesized || interpretation
    }
  }

  // ... rest of your existing functions (fetchDreams, fetchPatterns, toggleListening, etc.)
  // Keep all existing functions unchanged

  const handleSubmit = async () => {
    if (!dreamText.trim()) {
      toast({
        title: "Please enter your dream",
        description: "Tell us about your dream to get an interpretation.",
        variant: "destructive"
      })
      return
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to interpret dreams.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/interpret-dream-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dream: dreamText, sleepHours, saveToHistory, userId: user.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to interpret dream')
      }

      const data = await response.json()
      
      // Store all perspectives
      setInterpretation(data.interpretation)
      setPerspectives(data.perspectives || null)
      setReflectionQuestions(data.reflection_questions || [])
      setMoodContext(data.moodContext)
      
      if (saveToHistory && data.savedDream) {
        toast({
          title: "Dream saved!",
          description: "Your dream has been added to your history.",
        })
        if (currentView === 'history') {
          fetchDreams()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to interpret your dream. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ... rest of your existing component code

  // In the interpretation display section, replace the existing interpretation card with:
  return (
    // ... existing JSX until interpretation section ...
    
    {/* Interpretation Result */}
    {interpretation && (
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg rounded-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-2xl font-serif text-gray-800">
              {getPerspectiveLabel(preferredPerspective)}
            </CardTitle>
            
            {/* Perspective Selector */}
            <select
              value={preferredPerspective}
              onChange={(e) => updatePreferredPerspective(e.target.value as PerspectiveType)}
              className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="synthesized">🔮 Synthesized</option>
              <option value="jungian">🌙 Jungian</option>
              <option value="freudian">🧠 Freudian</option>
              <option value="cognitive">🔬 Cognitive</option>
            </select>
          </div>
          
          <CardDescription className="text-center text-gray-600 font-light">
            {getPerspectiveDescription(preferredPerspective)}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Mood Context Pill */}
          {moodContext && (
            <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-2xl">{moodContext.emoji}</span>
                    <span className="text-sm text-gray-600">{moodContext.mood}/5</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-orange-500" />
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-4 rounded-sm ${
                            level <= moodContext.stress
                              ? level <= 2 ? 'bg-green-500' : level <= 3 ? 'bg-yellow-500' : 'bg-red-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-4 rounded-sm ${
                            level <= moodContext.energy
                              ? level <= 2 ? 'bg-gray-400' : level <= 3 ? 'bg-blue-400' : 'bg-purple-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">Today's mood</span>
              </div>
            </div>
          )}

          <FormattedText text={getDisplayedInterpretation()} className="text-gray-700" />
          
          {/* Reflection Questions */}
          {reflectionQuestions && reflectionQuestions.length > 0 && (
            <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                Reflection Questions
              </h4>
              <ul className="space-y-2">
                {reflectionQuestions.map((question, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {preferredPerspective === 'jungian' && (
              <>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Archetypal</Badge>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">Symbolic</Badge>
              </>
            )}
            {preferredPerspective === 'freudian' && (
              <>
                <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">Unconscious</Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">Wish Fulfillment</Badge>
              </>
            )}
            {preferredPerspective === 'cognitive' && (
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Pattern Analysis</Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Adaptive</Badge>
              </>
            )}
            {preferredPerspective === 'synthesized' && (
              <>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Integrated</Badge>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">Comprehensive</Badge>
                <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">Insightful</Badge>
              </>
            )}
          </div>
          
          {/* Show indicator that all perspectives are available */}
          {perspectives && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Click on any dream in your history to view all perspectives
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )}
  )
}
