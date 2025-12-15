'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar
} from 'recharts'
import {
  Moon,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Heart,
  Brain,
  Flame,
  Edit,
  Trash2,
  Clock,
  BedDouble,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SleepLog {
  id: string
  user_id: string
  log_date: string
  sleep_hours: number
  sleep_quality: number
  restfulness: number
  bedtime?: string
  wake_time?: string
  interruptions?: number
  notes?: string
  sleep_score: number
  sleep_grade: string
  created_at: string
}

interface SleepAnalytics {
  average_score: number
  average_duration: number
  average_quality: number
  total_logs: number
  current_streak: number
  longest_streak: number
  mood_correlation?: number
  dream_correlation?: number
  trend_7_days: 'up' | 'down' | 'stable'
}

interface SleepDashboardProps {
  userId: string
}

const QUALITY_EMOJIS = ['😫', '😔', '😐', '😊', '😴']
const RESTFULNESS_EMOJIS = ['🥱', '😕', '😐', '🙂', '✨']

const calculateSleepScore = (hours: number, quality: number, restfulness: number): number => {
  // Optimal sleep duration: 7-9 hours
  let durationScore = 0
  if (hours >= 7 && hours <= 9) {
    durationScore = 40
  } else if (hours >= 6 && hours < 7) {
    durationScore = 30
  } else if (hours >= 5 && hours < 6) {
    durationScore = 20
  } else if (hours > 9 && hours <= 10) {
    durationScore = 30
  } else {
    durationScore = 10
  }

  // Quality contributes 40% of score
  const qualityScore = (quality / 5) * 40

  // Restfulness contributes 20% of score
  const restfulnessScore = (restfulness / 5) * 20

  return Math.round(durationScore + qualityScore + restfulnessScore)
}

const getGrade = (score: number): string => {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

export default function SleepDashboard({ userId }: SleepDashboardProps) {
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [sleepHours, setSleepHours] = useState<number>(8)
  const [sleepQuality, setSleepQuality] = useState<number>(3)
  const [restfulness, setRestfulness] = useState<number>(3)
  const [bedtime, setBedtime] = useState<string>('')
  const [wakeTime, setWakeTime] = useState<string>('')
  const [interruptions, setInterruptions] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Data state
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([])
  const [analytics, setAnalytics] = useState<SleepAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingLog, setEditingLog] = useState<string | null>(null)

  // Calculated preview score
  const previewScore = calculateSleepScore(sleepHours, sleepQuality, restfulness)
  const previewGrade = getGrade(previewScore)

  useEffect(() => {
    fetchSleepData()
    fetchAnalytics()
  }, [userId])

  const fetchSleepData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sleep-logs?userId=${userId}`)

      if (response.ok) {
        const data = await response.json()
        setSleepLogs(data)
      } else {
        throw new Error('Failed to fetch sleep logs')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load sleep logs",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/sleep-analytics?userId=${userId}`)

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const logData = {
        userId,
        logDate: format(selectedDate, 'yyyy-MM-dd'),
        sleepHours,
        sleepQuality,
        restfulness,
        bedtime: bedtime || undefined,
        wakeTime: wakeTime || undefined,
        interruptions: interruptions || undefined,
        notes: notes || undefined
      }

      const response = await fetch('/api/sleep-logs', {
        method: editingLog ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLog ? { ...logData, id: editingLog } : logData)
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: editingLog ? "Sleep log updated!" : "Sleep logged successfully!",
          description: `Score: ${result.sleep_score}/100 (${result.sleep_grade})${result.xp_earned ? ` • +${result.xp_earned} XP earned!` : ''}`
        })

        // Reset form
        resetForm()
        fetchSleepData()
        fetchAnalytics()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save sleep log",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this sleep log?')) return

    try {
      const response = await fetch(`/api/sleep-logs?id=${logId}&userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Sleep log deleted",
          description: "The log has been removed"
        })
        fetchSleepData()
        fetchAnalytics()
      } else {
        throw new Error('Failed to delete log')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (log: SleepLog) => {
    setEditingLog(log.id)
    setSelectedDate(new Date(log.log_date))
    setSleepHours(log.sleep_hours)
    setSleepQuality(log.sleep_quality)
    setRestfulness(log.restfulness)
    setBedtime(log.bedtime || '')
    setWakeTime(log.wake_time || '')
    setInterruptions(log.interruptions || 0)
    setNotes(log.notes || '')
    setShowOptionalFields(!!(log.bedtime || log.wake_time || log.interruptions || log.notes))
  }

  const resetForm = () => {
    setEditingLog(null)
    setSelectedDate(new Date())
    setSleepHours(8)
    setSleepQuality(3)
    setRestfulness(3)
    setBedtime('')
    setWakeTime('')
    setInterruptions(0)
    setNotes('')
    setShowOptionalFields(false)
  }

  // Get weekly trend data
  const weeklyData = sleepLogs
    .slice(-7)
    .map(log => ({
      date: format(new Date(log.log_date), 'MMM dd'),
      score: log.sleep_score,
      duration: log.sleep_hours,
      quality: log.sleep_quality
    }))

  // Get today's log
  const todayLog = sleepLogs.find(
    log => format(new Date(log.log_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  )

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-96 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="h-48 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white flex items-center gap-2">
            <Moon className="w-8 h-8 text-purple-400" />
            Sleep Tracker
          </h2>
          <p className="text-gray-400 mt-1">Track your sleep quality and build healthy habits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sleep Log Form */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5" />
                  {editingLog ? 'Edit Sleep Log' : 'Log Sleep'}
                </span>
                {editingLog && (
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Record your sleep data to track patterns and improve rest quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sleep Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Sleep Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-gray-600">hours</span>
                    </div>
                  </div>
                  <Slider
                    value={[sleepHours]}
                    onValueChange={([value]) => setSleepHours(value)}
                    min={0}
                    max={12}
                    step={0.5}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500">
                    Recommended: 7-9 hours for optimal health
                  </p>
                </div>

                {/* Sleep Quality */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Sleep Quality
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{QUALITY_EMOJIS[sleepQuality - 1]}</span>
                      <span className="text-sm text-gray-600">{sleepQuality}/5</span>
                    </div>
                  </div>
                  <Slider
                    value={[sleepQuality]}
                    onValueChange={([value]) => setSleepQuality(value)}
                    min={1}
                    max={5}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Restfulness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      How Rested Do You Feel?
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{RESTFULNESS_EMOJIS[restfulness - 1]}</span>
                      <span className="text-sm text-gray-600">{restfulness}/5</span>
                    </div>
                  </div>
                  <Slider
                    value={[restfulness]}
                    onValueChange={([value]) => setRestfulness(value)}
                    min={1}
                    max={5}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Exhausted</span>
                    <span>Fully Refreshed</span>
                  </div>
                </div>

                {/* Score Preview */}
                <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estimated Sleep Score</p>
                      <p className="text-xs text-gray-600">Based on your inputs</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-600">{previewScore}</div>
                      <div className="text-lg font-semibold text-purple-500">{previewGrade}</div>
                    </div>
                  </div>
                </div>

                {/* Optional Fields (Collapsible) */}
                <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">Optional Details</span>
                      {showOptionalFields ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Bedtime</label>
                        <Input
                          type="time"
                          value={bedtime}
                          onChange={(e) => setBedtime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Wake Time</label>
                        <Input
                          type="time"
                          value={wakeTime}
                          onChange={(e) => setWakeTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Sleep Interruptions
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={interruptions}
                        onChange={(e) => setInterruptions(parseInt(e.target.value) || 0)}
                        placeholder="Number of times you woke up"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full min-h-20 p-2 border rounded-md text-sm"
                        placeholder="Any observations about your sleep..."
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 mr-2" />
                      {editingLog ? 'Update Sleep Log' : 'Log Sleep'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Current Stats */}
        <div className="space-y-6">
          {/* Today's Stats */}
          {todayLog ? (
            <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Today's Sleep
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-6xl font-bold mb-2">{todayLog.sleep_score}</div>
                  <div className="text-3xl font-semibold opacity-90">{todayLog.sleep_grade}</div>
                  <div className="mt-4 text-sm opacity-80">
                    {todayLog.sleep_hours} hours • Quality: {todayLog.sleep_quality}/5
                  </div>
                </div>
                {analytics && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {analytics.trend_7_days === 'up' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-300" />
                        <span className="text-green-300">Improving from average</span>
                      </>
                    ) : analytics.trend_7_days === 'down' ? (
                      <>
                        <TrendingDown className="w-4 h-4 text-orange-300" />
                        <span className="text-orange-300">Below recent average</span>
                      </>
                    ) : (
                      <>
                        <span className="opacity-80">Consistent with average</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-purple-300">
              <CardContent className="p-6 text-center">
                <Moon className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No sleep logged for today yet</p>
                <p className="text-gray-500 text-xs mt-1">Fill out the form to track your sleep</p>
              </CardContent>
            </Card>
          )}

          {/* Sleep Streaks */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Sleep Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-5xl">🔥</span>
                      <div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                          {analytics.current_streak}
                        </div>
                        <div className="text-sm text-gray-500">
                          day{analytics.current_streak !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                    style={{
                      width: `${Math.min(100, (analytics.current_streak / (analytics.longest_streak || analytics.current_streak)) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Best: {analytics.longest_streak} day{analytics.longest_streak !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Average Stats */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sleep Score</span>
                  <span className="font-semibold">{analytics.average_score.toFixed(0)}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="font-semibold">{analytics.average_duration.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quality</span>
                  <span className="font-semibold">{analytics.average_quality.toFixed(1)}/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Logs</span>
                  <span className="font-semibold">{analytics.total_logs}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {weeklyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              7-Day Sleep Trends
            </CardTitle>
            <CardDescription>Track your sleep patterns over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  domain={[0, 100]}
                  label={{ value: 'Sleep Score', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 12]}
                  label={{ value: 'Hours', angle: 90, position: 'insideRight', fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Score') return [value, 'Sleep Score']
                    if (name === 'Duration') return [`${value}h`, 'Sleep Duration']
                    if (name === 'Quality') return [`${value}/5`, 'Sleep Quality']
                    return [value, name]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  name="Score"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="duration"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Duration"
                  dot={{ r: 4 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="quality"
                  fill="#a78bfa"
                  opacity={0.3}
                  name="Quality"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Correlations Section */}
      {analytics && (analytics.mood_correlation !== undefined || analytics.dream_correlation !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sleep-Mood Correlation */}
          {analytics.mood_correlation !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Sleep-Mood Correlation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-pink-600">
                    {(analytics.mood_correlation * 100).toFixed(0)}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {analytics.mood_correlation > 0.7
                      ? 'Strong positive correlation'
                      : analytics.mood_correlation > 0.4
                      ? 'Moderate correlation'
                      : 'Weak correlation'}
                  </p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                    style={{ width: `${analytics.mood_correlation * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Better sleep tends to improve your mood
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sleep-Dream Correlation */}
          {analytics.dream_correlation !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Sleep-Dream Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-purple-600">
                    {(analytics.dream_correlation * 100).toFixed(0)}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {analytics.dream_correlation > 0.7
                      ? 'Strong dream activity correlation'
                      : analytics.dream_correlation > 0.4
                      ? 'Moderate dream correlation'
                      : 'Independent patterns'}
                  </p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                    style={{ width: `${analytics.dream_correlation * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Sleep quality affects dream recall and vividness
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Logs List */}
      {sleepLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Sleep Logs
            </CardTitle>
            <CardDescription>Your latest 5 sleep entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sleepLogs.slice(-5).reverse().map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{log.sleep_score}</div>
                      <div className="text-sm font-semibold text-purple-500">{log.sleep_grade}</div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {format(new Date(log.log_date), 'EEEE, MMM dd')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {log.sleep_hours}h sleep • Quality: {QUALITY_EMOJIS[log.sleep_quality - 1]}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{log.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(log)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(log.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {sleepLogs.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Moon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sleep Logs Yet</h3>
            <p className="text-gray-500 mb-4">
              Start tracking your sleep to unlock insights and build healthy habits
            </p>
            <p className="text-sm text-gray-400">
              Fill out the form above to log your first sleep entry
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
