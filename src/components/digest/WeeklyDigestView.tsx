'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, TrendingUp, Brain, Target, Lightbulb, Calendar, ChevronLeft, ChevronRight, Sparkles, Eye, RefreshCw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { FormattedText } from '@/components/ui/formatted-text'

interface WeeklyDigest {
  id: string
  week_start_date: string
  week_end_date: string
  summary: string
  pattern_trends: Array<{
    pattern: string
    description: string
    frequency: string
    insight: string
  }>
  mood_insights: {
    correlation: string
    notable_patterns: string
    recommendation: string
  }
  goal_progress: {
    observations: string
    wins: string
    next_steps: string
  }
  reflection_prompts: string[]
  total_dreams: number
  total_journal_entries: number
  average_mood: number | null
  average_sleep_hours: number | null
  top_symbols: string[]
  top_emotions: string[]
  top_themes: string[]
  generated_at: string
  viewed: boolean
}

interface WeeklyDigestViewProps {
  userId: string
}

export default function WeeklyDigestView({ userId }: WeeklyDigestViewProps) {
  const [digests, setDigests] = useState<WeeklyDigest[]>([])
  const [currentDigestIndex, setCurrentDigestIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetchDigests()
  }, [userId])

  const fetchDigests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/weekly-digest?userId=${userId}&limit=10`)
      const data = await response.json()

      if (response.ok) {
        setDigests(data.digests || [])
        // Mark first digest as viewed if not already
        if (data.digests?.length > 0 && !data.digests[0].viewed) {
          markAsViewed(data.digests[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch digests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateThisWeekDigest = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weekOffset: 0 })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.empty) {
          toast({
            title: "No activity this week",
            description: "Record some dreams or journal entries to generate a digest!",
          })
        } else {
          toast({
            title: data.cached ? "Digest loaded" : "Digest generated!",
            description: "Your weekly insights are ready.",
          })
          await fetchDigests()
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate digest",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const markAsViewed = async (digestId: string) => {
    try {
      await fetch('/api/weekly-digest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digestId })
      })
    } catch (error) {
      console.error('Failed to mark as viewed:', error)
    }
  }

  const navigateDigest = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? Math.max(0, currentDigestIndex - 1)
      : Math.min(digests.length - 1, currentDigestIndex + 1)

    setCurrentDigestIndex(newIndex)

    if (!digests[newIndex].viewed) {
      markAsViewed(digests[newIndex].id)
    }
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  if (isLoading) {
    return (
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    )
  }

  const currentDigest = digests[currentDigestIndex]

  if (!currentDigest) {
    return (
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-purple-500" />
          <CardTitle className="text-2xl font-serif">No Digests Yet</CardTitle>
          <CardDescription>
            Generate your first weekly digest to see AI-powered insights about your dreams and patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={generateThisWeekDigest}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate This Week's Digest
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDigest('prev')}
              disabled={currentDigestIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Newer
            </Button>

            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-600">
                  {formatDateRange(currentDigest.week_start_date, currentDigest.week_end_date)}
                </span>
              </div>
              {!currentDigest.viewed && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Eye className="w-3 h-3 mr-1" />
                  New
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDigest('next')}
              disabled={currentDigestIndex === digests.length - 1}
            >
              Older
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-serif">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{currentDigest.total_dreams}</div>
              <div className="text-sm text-gray-600">Dreams</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{currentDigest.total_journal_entries}</div>
              <div className="text-sm text-gray-600">Journal Entries</div>
            </div>
            {currentDigest.average_mood && (
              <div className="text-center p-3 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{currentDigest.average_mood.toFixed(1)}/5</div>
                <div className="text-sm text-gray-600">Avg Mood</div>
              </div>
            )}
            {currentDigest.average_sleep_hours && (
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{currentDigest.average_sleep_hours.toFixed(1)}h</div>
                <div className="text-sm text-gray-600">Avg Sleep</div>
              </div>
            )}
          </div>

          {/* Top patterns */}
          <div className="mt-6 space-y-3">
            {currentDigest.top_symbols?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Top Symbols</p>
                <div className="flex flex-wrap gap-2">
                  {currentDigest.top_symbols.map((symbol, i) => (
                    <Badge key={i} variant="secondary" className="bg-purple-100 text-purple-700">
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {currentDigest.top_emotions?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Top Emotions</p>
                <div className="flex flex-wrap gap-2">
                  {currentDigest.top_emotions.map((emotion, i) => (
                    <Badge key={i} variant="secondary" className="bg-indigo-100 text-indigo-700">
                      {emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-xl font-serif">Weekly Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <FormattedText text={currentDigest.summary} className="text-gray-700 leading-relaxed" />
        </CardContent>
      </Card>

      {/* Pattern Trends */}
      {currentDigest.pattern_trends && currentDigest.pattern_trends.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <CardTitle className="text-xl font-serif">Pattern Trends</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentDigest.pattern_trends.map((trend, index) => (
              <div key={index} className="p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-semibold text-indigo-900 mb-1">{trend.pattern}</h4>
                <p className="text-sm text-indigo-700 mb-2">
                  <span className="font-medium">Frequency:</span> {trend.frequency}
                </p>
                <p className="text-sm text-gray-700 mb-2">{trend.description}</p>
                <p className="text-sm text-indigo-800 italic">{trend.insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mood Insights */}
      {currentDigest.mood_insights && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-pink-500" />
              <CardTitle className="text-xl font-serif">Mood Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Correlation</h4>
              <p className="text-sm text-gray-700">{currentDigest.mood_insights.correlation}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Notable Patterns</h4>
              <p className="text-sm text-gray-700">{currentDigest.mood_insights.notable_patterns}</p>
            </div>
            <Separator />
            <div className="p-3 bg-pink-50 rounded-lg">
              <h4 className="font-medium text-pink-900 mb-1">Recommendation</h4>
              <p className="text-sm text-pink-800">{currentDigest.mood_insights.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Progress */}
      {currentDigest.goal_progress && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              <CardTitle className="text-xl font-serif">Goal Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Observations</h4>
              <p className="text-sm text-gray-700">{currentDigest.goal_progress.observations}</p>
            </div>
            {currentDigest.goal_progress.wins && (
              <>
                <Separator />
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">✨ Wins This Week</h4>
                  <p className="text-sm text-green-800">{currentDigest.goal_progress.wins}</p>
                </div>
              </>
            )}
            <Separator />
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Next Steps</h4>
              <p className="text-sm text-gray-700">{currentDigest.goal_progress.next_steps}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reflection Prompts */}
      {currentDigest.reflection_prompts && currentDigest.reflection_prompts.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <CardTitle className="text-xl font-serif">Reflection Prompts</CardTitle>
            </div>
            <CardDescription>
              Questions to deepen your self-understanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {currentDigest.reflection_prompts.map((prompt, index) => (
                <li key={index} className="flex items-start p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-600 mr-2 mt-0.5">•</span>
                  <span className="text-sm text-gray-800">{prompt}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Generate new digest button */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardContent className="pt-6 text-center">
          <Button
            onClick={generateThisWeekDigest}
            disabled={isGenerating}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate This Week's Digest
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Generate a fresh digest for the current week
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
