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

interface Dream {
  id: string
  content: string
  interpretation: string
  sleep_hours: number | null
  symbols: string[]
  emotions: string[]
  themes: string[]
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

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const [dreamText, setDreamText] = useState('')
  const [interpretation, setInterpretation] = useState('')
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

  useEffect(() => {
    if (user && currentView === 'history') {
      fetchDreams()
    } else if (user && currentView === 'patterns') {
      fetchPatterns()
    }
  }, [currentView, user])

  const fetchDreams = async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/dreams-supabase?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setDreams(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dream history",
        variant: "destructive"
      })
    }
  }

  const fetchPatterns = async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/dreams-supabase/patterns?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setPatterns(data)
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to fetch dream patterns",
        variant: "destructive"
      })
    }
  }

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
      setInterpretation(data.interpretation)
      setMoodContext(data.moodContext)
      
      if (saveToHistory && data.savedDream) {
        toast({
          title: "Dream saved!",
          description: "Your dream has been added to your history.",
        })
        // Refresh dreams list
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

  const toggleListening = () => {
    if (!isListening) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setDreamText(prev => prev + (prev ? ' ' : '') + transcript)
          setIsListening(false)
        }

        recognition.onerror = () => {
          setIsListening(false)
          toast({
            title: "Speech recognition error",
            description: "Please try again or type your dream manually.",
            variant: "destructive"
          })
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.start()
      } else {
        toast({
          title: "Speech recognition not supported",
          description: "Your browser doesn't support speech recognition. Please type your dream manually.",
          variant: "destructive"
        })
      }
    } else {
      setIsListening(false)
    }
  }

  // Apply search and filters
  const filteredDreams = dreams
    .filter(dream => {
      // Search filter
      const matchesSearch = 
        dream.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dream.interpretation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dream.symbols.some(symbol => symbol.toLowerCase().includes(searchTerm.toLowerCase())) ||
        dream.emotions.some(emotion => emotion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        dream.themes.some(theme => theme.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dream.sleep_hours && dream.sleep_hours.toString().includes(searchTerm))
      
      if (!matchesSearch) return false

      // Date range filter
      if (historyFilters.dateRange) {
        const dreamDate = new Date(dream.created_at).toISOString().split('T')[0]
        if (dreamDate < historyFilters.dateRange.start || dreamDate > historyFilters.dateRange.end) {
          return false
        }
      }

      // Note: mood and event filters would need additional data from API
      // For now, keeping them as UI-only; can extend later

      return true
    })
    .sort((a, b) => {
      // Apply sorting
      switch (historyFilters.sortBy) {
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'sleep-asc':
          return (a.sleep_hours || 0) - (b.sleep_hours || 0)
        case 'sleep-desc':
          return (b.sleep_hours || 0) - (a.sleep_hours || 0)
        default:
          return 0
      }
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading ONEIR...</p>
        </div>
      </div>
    )
  }

  // Show setup message if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg rounded-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-serif text-gray-800">
                ONEIR Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Supabase Configuration Needed</h3>
                <p className="text-yellow-700 text-sm mb-3">
                  To use ONEIR with authentication and database features, you need to configure Supabase:
                </p>
                <ol className="text-yellow-700 text-sm space-y-2 list-decimal list-inside">
                  <li>1. Create a free account at <a href="https://supabase.com" target="_blank" rel="noopener" className="text-yellow-600 underline hover:text-yellow-800">supabase.com</a></li>
                  <li>2. Create a new project</li>
                  <li>3. Copy the SQL schema from <code className="bg-yellow-100 px-1 rounded">supabase-schema.sql</code></li>
                  <li>4. Run the SQL in your Supabase project</li>
                  <li>5. Copy your project URL and keys</li>
                  <li>6. Create a <code className="bg-yellow-100 px-1 rounded">.env.local</code> file with your credentials</li>
                </ol>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">📝 Your .env.local file should contain:</h4>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key`}
                </pre>
              </div>
              
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  After setup, restart the development server with:
                </p>
                <code className="bg-gray-900 text-gray-100 px-3 py-1 rounded text-sm mt-2">
                  npm run dev
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show auth form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl md:text-7xl font-serif text-white mb-2 tracking-wide font-bold">
              ONEIR
            </h1>
            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent mx-auto mb-3"></div>
            <p className="text-purple-100 text-sm font-mono tracking-widest uppercase">
              Dream Interpretation & Journal
            </p>
            <p className="text-purple-100 text-xs mt-3 font-light tracking-wide">
              Decode Your Dreams
            </p>
          </div>

          <AuthForm onAuthSuccess={() => {}} />
        </div>
      </div>
    )
  }

  // Show main app if authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-4 sm:py-8 max-w-md">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif text-white mb-2 tracking-wide font-bold">
            ONEIR
          </h1>
          <div className="w-24 sm:w-32 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent mx-auto mb-2 sm:mb-3"></div>
          <p className="text-purple-100 text-xs sm:text-sm font-mono tracking-widest uppercase">
            Dream Interpretation & Journal
          </p>
          <p className="text-purple-100 text-xs mt-2 sm:mt-3 font-light tracking-wide">
            Welcome back, {user.email?.split('@')[0]}
          </p>
        </div>

        {/* Sign Out Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-purple-200 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Mood Widget */}
        <div className="mb-6">
          <TodayMoodWidget userId={user.id} />
        </div>

        {/* Navigation - Mobile optimized */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-full p-1 flex flex-wrap justify-center gap-1">
            <Button
              variant={currentView === 'interpret' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('interpret')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Interpret</span>
            </Button>
            <Button
              variant={currentView === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('history')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <History className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant={currentView === 'patterns' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('patterns')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Patterns</span>
            </Button>
            <Button
              variant={currentView === 'journal' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('journal')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Journal</span>
            </Button>
            <Button
              variant={currentView === 'events' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('events')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Events</span>
            </Button>
            <Button
              variant={currentView === 'insights' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('insights')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Insights</span>
            </Button>
            <Button
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('settings')}
              className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>

        {/* Interpret View */}
        {currentView === 'interpret' && (
          <>
            {/* Input Section */}
            <Card className="mb-8 shadow-2xl border-0 bg-white/95 backdrop-blur-lg rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif text-gray-800 text-center">
                  Your Dream
                </CardTitle>
                <CardDescription className="text-center text-gray-600 font-light">
                  Describe your dream in detail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sleep Hours Input */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Hours of Sleep Before Dream
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      disabled={isLoading}
                    />
                    <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 min-w-[60px] text-center font-medium text-gray-700">
                      {sleepHours}h
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>3h</span>
                    <span>7.5h (avg)</span>
                    <span>12h</span>
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    placeholder="I was dreaming that I was flying over a beautiful landscape..."
                    value={dreamText}
                    onChange={(e) => setDreamText(e.target.value)}
                    className="min-h-40 resize-none pr-14 border-0 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 transition-all"
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    variant={isListening ? "destructive" : "outline"}
                    className="absolute top-3 right-3 rounded-full w-10 h-10 p-0 border-0 shadow-lg"
                    onClick={toggleListening}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="saveHistory"
                    checked={saveToHistory}
                    onChange={(e) => setSaveToHistory(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="saveHistory" className="text-sm text-gray-600">
                    Save to dream history
                  </label>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading || !dreamText.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Interpreting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Interpret My Dream
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Interpretation Result */}
            {interpretation && (
              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg rounded-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-serif text-gray-800 text-center">
                    Interpretation
                  </CardTitle>
                  <CardDescription className="text-center text-gray-600 font-light">
                    What your dream reveals
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

                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-light">
                      {interpretation}
                    </div>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-2 justify-center">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Symbolic</Badge>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">Psychological</Badge>
                    <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">Insightful</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Smart Prompts */}
            {!interpretation && (
              <div className="mb-6">
                <SmartPrompts userId={user.id} />
              </div>
            )}

            {/* Tips */}
            {!interpretation && (
              <Card className="mt-2 border-0 bg-white/10 backdrop-blur-lg rounded-2xl">
                <CardContent className="pt-6">
                  <h3 className="font-serif text-lg text-white mb-4 text-center">Tips for Better Interpretations</h3>
                  <ul className="text-purple-100 space-y-2 text-sm font-light">
                    <li className="flex items-start">
                      <span className="text-purple-300 mr-2">•</span>
                      Include as many details as you can remember
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-300 mr-2">•</span>
                      Mention your feelings during the dream
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-300 mr-2">•</span>
                      Note any recurring symbols or themes
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-300 mr-2">•</span>
                      Describe the setting and other characters
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* History View */}
        {currentView === 'history' && (
          <div className="space-y-4">
            {/* Filters */}
            <HistoryFilters 
              onFiltersChange={setHistoryFilters}
              totalResults={filteredDreams.length}
            />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
              <input
                type="text"
                placeholder="Search dreams, symbols, emotions, sleep hours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {searchTerm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Dreams List */}
            {filteredDreams.length === 0 ? (
              <Card className="border-0 bg-white/10 backdrop-blur-lg rounded-2xl">
                <CardContent className="pt-8 pb-8 text-center">
                  <Book className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                  <h3 className="text-white font-serif text-lg mb-2">
                    {searchTerm ? 'No dreams found' : 'No dreams yet'}
                  </h3>
                  <p className="text-purple-200 text-sm">
                    {searchTerm ? 'Try a different search term' : 'Start interpreting dreams to build your history'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredDreams.map((dream) => (
                <Card key={dream.id} className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-serif text-gray-800 flex-1">
                        {dream.content.slice(0, 60)}{dream.content.length > 60 ? '...' : ''}
                      </CardTitle>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {formatDate(dream.created_at)}
                      </span>
                    </div>
                    {dream.sleep_hours && (
                      <div className="flex items-center mt-2">
                        <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">
                          {dream.sleep_hours}h sleep
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {dream.interpretation}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {dream.symbols.slice(0, 3).map((symbol, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          {symbol}
                        </Badge>
                      ))}
                      {dream.emotions.slice(0, 2).map((emotion, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                    <DreamEventLinker dreamId={dream.id} userId={user.id} />
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <SimilarDreams dreamId={dream.id} userId={user.id} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Patterns View */}
        {currentView === 'patterns' && (
          <div className="space-y-6">
            {patterns ? (
              <>
                {/* Stats Overview */}
                <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-serif text-gray-800 text-center">
                      Your Dream Journey
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{patterns.totalDreams}</div>
                        <div className="text-sm text-gray-600">Total Dreams</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-indigo-600">{patterns.dreamFrequency.thisWeek}</div>
                        <div className="text-sm text-gray-600">This Week</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-pink-600">{patterns.dreamFrequency.thisMonth}</div>
                        <div className="text-sm text-gray-600">This Month</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Patterns */}
                {patterns.topSymbols.length > 0 && (
                  <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-serif text-gray-800">
                        Top Symbols
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {patterns.topSymbols.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 capitalize">{item.symbol}</span>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {item.count}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {patterns.topEmotions.length > 0 && (
                  <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-serif text-gray-800">
                        Common Emotions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {patterns.topEmotions.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 capitalize">{item.emotion}</span>
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                              {item.count}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {patterns.topThemes.length > 0 && (
                  <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-serif text-gray-800">
                        Recurring Themes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {patterns.topThemes.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 capitalize">{item.theme}</span>
                            <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                              {item.count}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mood History */}
                <MoodHistoryChart userId={user.id} days={30} />

                {/* Sleep Tracking Chart */}
                {patterns.sleepChartData.length > 0 && (
                  <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-serif text-gray-800">
                        Sleep Tracking
                      </CardTitle>
                      <CardDescription className="text-center text-gray-600 font-light">
                        Sleep hours before dreams (last {patterns.sleepChartData.length} recordings)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-indigo-600">{patterns.sleepStats.average.toFixed(1)}h</div>
                            <div className="text-xs text-gray-600">Average</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-green-600">{patterns.sleepStats.min}h</div>
                            <div className="text-xs text-gray-600">Minimum</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-orange-600">{patterns.sleepStats.max}h</div>
                            <div className="text-xs text-gray-600">Maximum</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-600">{patterns.sleepStats.total}</div>
                            <div className="text-xs text-gray-600">Recordings</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {patterns.sleepChartData.map((item, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <span className="text-xs text-gray-500 w-12">{item.date}</span>
                            <div className="flex-1 flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${(item.hours / 12) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700 w-10 text-right">{item.hours}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-0 bg-white/10 backdrop-blur-lg rounded-2xl">
                <CardContent className="pt-8 pb-8 text-center">
                  <TrendingUp className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                  <h3 className="text-white font-serif text-lg mb-2">
                    No patterns yet
                  </h3>
                  <p className="text-purple-200 text-sm">
                    Record more dreams to discover your patterns
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Journal View */}
        {currentView === 'journal' && (
          <JournalView userId={user.id} />
        )}

        {/* Events View */}
        {currentView === 'events' && (
          <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardContent className="pt-6">
              <LifeEventsTimeline userId={user.id} />
            </CardContent>
          </Card>
        )}

        {/* Insights View */}
        {currentView === 'insights' && (
          <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardContent className="pt-6">
              <InsightsView userId={user.id} />
            </CardContent>
          </Card>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardContent className="pt-6">
              <SettingsView userId={user.id} userEmail={user.email} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
