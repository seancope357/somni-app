'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Heart, Brain, Zap } from 'lucide-react'

interface MoodLog {
  id: string
  log_date: string
  mood: number
  stress: number
  energy: number
  notes?: string
}

interface MoodHistoryChartProps {
  userId: string
  days?: number
}

export default function MoodHistoryChart({ userId, days = 30 }: MoodHistoryChartProps) {
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMoodHistory()
  }, [userId, days])

  const fetchMoodHistory = async () => {
    setIsLoading(true)
    try {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)
      
      const response = await fetch(
        `/api/mood-logs?userId=${userId}&from=${fromDate.toISOString().split('T')[0]}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setMoodLogs(data.reverse()) // Reverse to get chronological order
      }
    } catch (error) {
      console.error('Failed to fetch mood history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-sm">Loading mood history...</p>
        </CardContent>
      </Card>
    )
  }

  if (moodLogs.length === 0) {
    return (
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-gray-800">
            Mood History
          </CardTitle>
          <CardDescription>
            No mood data available for this period
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">
            Start logging your daily mood to see trends
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate averages
  const avgMood = (moodLogs.reduce((sum, log) => sum + log.mood, 0) / moodLogs.length).toFixed(1)
  const avgStress = (moodLogs.reduce((sum, log) => sum + log.stress, 0) / moodLogs.length).toFixed(1)
  const avgEnergy = (moodLogs.reduce((sum, log) => sum + log.energy, 0) / moodLogs.length).toFixed(1)

  // Format data for chart
  const chartData = moodLogs.map(log => ({
    date: new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: log.mood,
    stress: log.stress,
    energy: log.energy,
    fullDate: log.log_date
  }))

  const moodEmojis = ['😢', '😕', '😐', '😊', '😄']

  return (
    <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-serif text-gray-800">
          Mood History
        </CardTitle>
        <CardDescription>
          Your emotional patterns over the last {days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-pink-50 rounded-lg">
            <Heart className="w-5 h-5 text-pink-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-pink-600">{avgMood}/5</div>
            <div className="text-xs text-gray-600">Avg Mood</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <Brain className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-orange-600">{avgStress}/5</div>
            <div className="text-xs text-gray-600">Avg Stress</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Zap className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600">{avgEnergy}/5</div>
            <div className="text-xs text-gray-600">Avg Energy</div>
          </div>
        </div>

        {/* Line Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              interval={Math.floor(chartData.length / 7)}
            />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ fontSize: '12px' }}
              labelFormatter={(label) => {
                const data = chartData.find(d => d.date === label)
                return data ? new Date(data.fullDate).toLocaleDateString() : label
              }}
              formatter={(value: number, name: string) => {
                if (name === 'mood') return [value + ' ' + moodEmojis[value - 1], 'Mood']
                if (name === 'stress') return [value, 'Stress']
                if (name === 'energy') return [value, 'Energy']
                return [value, name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area 
              type="monotone" 
              dataKey="mood" 
              stroke="#ec4899" 
              fillOpacity={1}
              fill="url(#colorMood)"
              name="Mood"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="stress" 
              stroke="#f59e0b" 
              fillOpacity={1}
              fill="url(#colorStress)"
              name="Stress"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="energy" 
              stroke="#3b82f6" 
              fillOpacity={1}
              fill="url(#colorEnergy)"
              name="Energy"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Recent Entries */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Entries</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {moodLogs.slice(-5).reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                <span className="text-gray-600">
                  {new Date(log.log_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Heart className="w-3 h-3 text-pink-500 mr-1" />
                    {moodEmojis[log.mood - 1]}
                  </span>
                  <span className="flex items-center text-gray-600">
                    <Brain className="w-3 h-3 text-orange-500 mr-1" />
                    {log.stress}
                  </span>
                  <span className="flex items-center text-gray-600">
                    <Zap className="w-3 h-3 text-blue-500 mr-1" />
                    {log.energy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
