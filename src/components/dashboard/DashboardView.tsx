'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Moon, Heart, TrendingUp, Calendar, Brain, MessageCircle, Zap } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

interface DashboardViewProps {
  userId: string
  onInterpretClick: () => void
  onChatClick: (question: string) => void
}

interface DashboardData {
  quickStats: {
    dreamsThisWeek: number
    moodStreak: number
    avgSleepHours: number
    totalLifeEvents: number
  }
  recentDreams: Array<{
    id: string
    content: string
    symbols: string[]
    created_at: string
  }>
  moodChartData: Array<{
    date: string
    mood: number
    stress: number
    energy: number
  }>
  insights: string[]
}

export default function DashboardView({ userId, onInterpretClick, onChatClick }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/dashboard?userId=${userId}`)
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Failed to load dashboard",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "How have I been sleeping lately?",
    "What patterns do you notice in my dreams?",
    "How does my mood correlate with my sleep?",
    "What themes keep appearing in my dreams?"
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Unable to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif text-white">Welcome Back</h2>
        <p className="text-purple-200">Here's your dream journey at a glance</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Dreams This Week */}
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-purple-600">{data.quickStats.dreamsThisWeek}</p>
                <p className="text-xs text-gray-500 mt-1">dreams</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Moon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mood Streak */}
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Mood Streak</p>
                <p className="text-3xl font-bold text-pink-600">{data.quickStats.moodStreak}</p>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </div>
              <div className="p-3 bg-pink-100 rounded-full">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Sleep */}
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Sleep</p>
                <p className="text-3xl font-bold text-indigo-600">{data.quickStats.avgSleepHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">hours</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Life Events */}
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Life Events</p>
                <p className="text-3xl font-bold text-orange-600">{data.quickStats.totalLifeEvents}</p>
                <p className="text-xs text-gray-500 mt-1">tracked</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Dreams - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-serif text-gray-800 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-purple-600" />
                    Recent Dreams
                  </CardTitle>
                  <CardDescription>Your latest dream entries</CardDescription>
                </div>
                <Button
                  onClick={onInterpretClick}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  New Dream
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentDreams.length > 0 ? (
                data.recentDreams.map((dream) => (
                  <div
                    key={dream.id}
                    className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors cursor-pointer"
                  >
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                      {dream.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {dream.symbols.slice(0, 3).map((symbol, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            {symbol}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(dream.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Moon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No dreams yet</p>
                  <Button
                    onClick={onInterpretClick}
                    variant="outline"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    Interpret Your First Dream
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          {data.insights.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-serif flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white/90">{insight}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Mood Chart */}
          <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-600" />
                Mood Trends
              </CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {data.moodChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.moodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                    />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="energy" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No mood data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Suggestions */}
          <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-gray-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                Ask Dream Explorer
              </CardTitle>
              <CardDescription>Suggested questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => onChatClick(question)}
                  className="w-full text-left p-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-lg border border-purple-100 hover:border-purple-200 transition-all text-sm text-gray-700 group"
                >
                  <span className="group-hover:text-purple-700">{question}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
