'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lightbulb, TrendingUp, Brain, Moon, Activity, Calendar } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { toast } from '@/hooks/use-toast'

interface InsightsData {
  summary: {
    total_dreams: number
    total_mood_logs: number
    total_life_events: number
    avg_mood: number
    avg_stress: number
    avg_energy: number
    avg_sleep: number
    time_range_days: number
  }
  mood_dream_correlations: Array<{
    mood_level: number
    dream_count: number
    avg_sleep_hours: number
    common_emotions: string[]
    common_symbols: string[]
  }>
  life_event_correlations: Array<{
    event_category: string
    dream_count: number
    common_themes: string[]
    common_emotions: string[]
    avg_intensity: number
  }>
  sleep_quality_insights: Array<{
    sleep_range: string
    dream_count: number
    avg_mood: number
    common_themes: string[]
  }>
  time_series: Array<{
    date: string
    dream_count: number
    avg_mood: number
    avg_stress: number
    avg_energy: number
    avg_sleep: number
  }>
  key_insights: string[]
}

interface InsightsViewProps {
  userId: string
}

export default function InsightsView({ userId }: InsightsViewProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    fetchInsights()
  }, [userId, timeRange])

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/insights?userId=${userId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      } else {
        throw new Error('Failed to fetch insights')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load insights",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Analyzing your patterns...</p>
      </div>
    )
  }

  if (!insights || insights.summary.total_dreams === 0) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur rounded-lg border border-gray-200">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Not enough data yet
        </h3>
        <p className="text-gray-600">
          Record more dreams and mood logs to unlock personalized insights
        </p>
      </div>
    )
  }

  const moodEmojis = ['😢', '😕', '😐', '😊', '😄']

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-gray-800">Insights & Analytics</h2>
          <p className="text-sm text-gray-600">Discover patterns in your dreams</p>
        </div>
        <div className="flex space-x-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      {insights.key_insights.length > 0 && (
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-900">
              <Lightbulb className="w-5 h-5 mr-2" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.key_insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-white/60 rounded-lg">
                <span className="text-purple-600 font-bold">{index + 1}.</span>
                <p className="text-sm text-gray-700 flex-1">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-gray-800">
            Summary Statistics
          </CardTitle>
          <CardDescription>
            Last {insights.summary.time_range_days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{insights.summary.total_dreams}</div>
              <div className="text-xs text-gray-600">Dreams</div>
            </div>
            <div className="text-center p-3 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{insights.summary.avg_mood.toFixed(1)}/5</div>
              <div className="text-xs text-gray-600">Avg Mood</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{insights.summary.avg_sleep.toFixed(1)}h</div>
              <div className="text-xs text-gray-600">Avg Sleep</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{insights.summary.total_life_events}</div>
              <div className="text-xs text-gray-600">Life Events</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Series Chart */}
      {insights.time_series.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <TrendingUp className="w-5 h-5 mr-2" />
              Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={insights.time_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="avg_mood" stroke="#ec4899" name="Mood" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_stress" stroke="#f59e0b" name="Stress" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_energy" stroke="#3b82f6" name="Energy" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_sleep" stroke="#8b5cf6" name="Sleep (h)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Mood-Dream Correlations */}
      {insights.mood_dream_correlations.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Activity className="w-5 h-5 mr-2" />
              Mood & Dream Correlations
            </CardTitle>
            <CardDescription>
              How your mood affects your dreams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insights.mood_dream_correlations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="mood_level" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(level) => moodEmojis[level - 1]}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'dream_count') return [value, 'Dreams']
                    if (name === 'avg_sleep_hours') return [value.toFixed(1) + 'h', 'Avg Sleep']
                    return [value, name]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="dream_count" fill="#8b5cf6" name="Dreams" />
                <Bar dataKey="avg_sleep_hours" fill="#06b6d4" name="Avg Sleep" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-4 space-y-2">
              {insights.mood_dream_correlations.map((corr) => (
                <div key={corr.mood_level} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {moodEmojis[corr.mood_level - 1]} Mood {corr.mood_level}/5
                    </span>
                    <span className="text-gray-500">{corr.dream_count} dreams</span>
                  </div>
                  {corr.common_emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {corr.common_emotions.map((emotion) => (
                        <Badge key={emotion} variant="secondary" className="text-xs">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep Quality Insights */}
      {insights.sleep_quality_insights.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Moon className="w-5 h-5 mr-2" />
              Sleep Quality Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.sleep_quality_insights.map((insight) => (
                <div key={insight.sleep_range} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{insight.sleep_range}</span>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {insight.dream_count} dreams
                      </Badge>
                      {insight.avg_mood > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {moodEmojis[Math.round(insight.avg_mood) - 1]} {insight.avg_mood.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {insight.common_themes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {insight.common_themes.map((theme) => (
                        <Badge key={theme} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Life Event Correlations */}
      {insights.life_event_correlations.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Calendar className="w-5 h-5 mr-2" />
              Life Event Impact
            </CardTitle>
            <CardDescription>
              How life events influence your dreams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.life_event_correlations.map((corr) => (
                <div key={corr.event_category} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800 capitalize">
                      {corr.event_category}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {corr.dream_count} dreams
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {corr.common_themes.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-600">Common themes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {corr.common_themes.map((theme) => (
                            <Badge key={theme} variant="secondary" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {corr.common_emotions.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-600">Common emotions:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {corr.common_emotions.map((emotion) => (
                            <Badge key={emotion} variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                              {emotion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
