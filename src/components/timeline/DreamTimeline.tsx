'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronLeft, ChevronRight, Moon, Heart, Calendar as CalendarIcon, TrendingUp, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface TimelineDay {
  date: string
  dreams: any[]
  moodLog: any | null
  lifeEvents: any[]
  dreamCount: number
  avgMood: number | null
  hasHighStress: boolean
}

interface TimelineStats {
  totalDreams: number
  totalMoodLogs: number
  totalLifeEvents: number
  averageMood: number | null
  averageStress: number | null
  dreamFrequency: {
    daysWithDreams: number
    totalDays: number
    percentage: number
  }
}

interface DreamTimelineProps {
  userId: string
}

type ViewMode = 'month' | 'week' | 'year'

export default function DreamTimeline({ userId }: DreamTimelineProps) {
  const [timelineData, setTimelineData] = useState<TimelineDay[]>([])
  const [stats, setStats] = useState<TimelineStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<TimelineDay | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  // Helper function to generate emoji from mood level
  const getMoodEmoji = (mood: number | null) => {
    if (!mood) return '😐'
    const emojis = ['😢', '😕', '😐', '😊', '😄']
    return emojis[mood - 1] || '😐'
  }

  useEffect(() => {
    fetchTimelineData()
  }, [userId, viewMode, currentDate])

  // Click outside to close details
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        setSelectedDay(null)
      }
    }

    if (selectedDay) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedDay])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDay(null)
      } else if (e.key === 'ArrowLeft') {
        navigate('prev')
      } else if (e.key === 'ArrowRight') {
        navigate('next')
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const fetchTimelineData = async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange()
      const response = await fetch(
        `/api/timeline?userId=${userId}&startDate=${start}&endDate=${end}&view=${viewMode}`
      )
      const data = await response.json()

      if (response.ok) {
        setTimelineData(data.timeline || [])
        setStats(data.stats)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Failed to load timeline",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getDateRange = () => {
    const date = currentDate
    let start: string
    let end: string

    switch (viewMode) {
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        start = weekStart.toISOString().split('T')[0]
        end = weekEnd.toISOString().split('T')[0]
        break
      case 'month':
        start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
        break
      case 'year':
        start = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0]
        end = new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0]
        break
      default:
        start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
    }

    return { start, end }
  }

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    switch (viewMode) {
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'year':
        newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1))
        break
    }

    setCurrentDate(newDate)
    setSelectedDay(null) // Close details when navigating
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(null)
  }

  const getIntensityColor = (day: TimelineDay) => {
    const dreamCount = day.dreamCount
    const hasMood = day.moodLog !== null
    const hasEvents = day.lifeEvents.length > 0

    if (dreamCount === 0 && !hasMood && !hasEvents) {
      return 'bg-gray-100 hover:bg-gray-200'
    }

    // Base color on dream count
    if (dreamCount === 0) {
      return hasMood
        ? getMoodColor(day.avgMood, day.hasHighStress)
        : 'bg-blue-100 hover:bg-blue-200'
    }

    if (dreamCount === 1) {
      return 'bg-purple-200 hover:bg-purple-300 text-purple-900'
    } else if (dreamCount === 2) {
      return 'bg-purple-400 hover:bg-purple-500 text-white'
    } else {
      return 'bg-purple-600 hover:bg-purple-700 text-white'
    }
  }

  const getMoodColor = (mood: number | null, highStress: boolean) => {
    if (mood === null) return 'bg-gray-100 hover:bg-gray-200'

    if (highStress) {
      return 'bg-red-200 hover:bg-red-300 text-red-900'
    }

    if (mood <= 2) {
      return 'bg-blue-200 hover:bg-blue-300 text-blue-900'
    } else if (mood <= 3) {
      return 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
    } else {
      return 'bg-green-200 hover:bg-green-300 text-green-900'
    }
  }

  // Month View
  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startPadding = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days = []

    // Add empty cells for padding
    for (let i = 0; i < startPadding; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />)
    }

    // Add day cells
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const dayData = timelineData.find(d => d.date === dateStr)
      const isToday = dateStr === new Date().toISOString().split('T')[0]

      days.push(
        <button
          key={dateStr}
          onClick={() => dayData && setSelectedDay(dayData)}
          className={cn(
            "aspect-square p-1 rounded-lg border-2 transition-all relative",
            dayData ? getIntensityColor(dayData) : 'bg-gray-50 hover:bg-gray-100',
            isToday ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent',
            selectedDay?.date === dateStr && 'ring-2 ring-indigo-400'
          )}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <span className={cn(
              "text-xs font-medium",
              !dayData && 'text-gray-600'
            )}>
              {i}
            </span>
            {dayData && dayData.dreamCount > 0 && (
              <Moon className="w-3 h-3 mt-0.5" />
            )}
            {dayData && dayData.lifeEvents.length > 0 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full" />
            )}
          </div>
        </button>
      )
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 pb-2">
            {day}
          </div>
        ))}
        {days}
      </div>
    )
  }

  // Week View
  const renderWeekView = () => {
    const weekStart = new Date(currentDate)
    weekStart.setDate(currentDate.getDate() - currentDate.getDay())

    const days = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = timelineData.find(d => d.date === dateStr)
      const isToday = dateStr === new Date().toISOString().split('T')[0]

      days.push(
        <button
          key={dateStr}
          onClick={() => dayData && setSelectedDay(dayData)}
          className={cn(
            "p-4 rounded-lg border-2 transition-all flex-1 min-h-[120px] relative",
            dayData ? getIntensityColor(dayData) : 'bg-gray-50 hover:bg-gray-100',
            isToday ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent',
            selectedDay?.date === dateStr && 'ring-2 ring-indigo-400'
          )}
        >
          <div className="flex flex-col h-full">
            <div className="text-xs font-medium mb-2">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-2xl font-bold mb-2">
              {date.getDate()}
            </div>
            {dayData && dayData.dreamCount > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Moon className="w-4 h-4" />
                <span>{dayData.dreamCount}</span>
              </div>
            )}
            {dayData && dayData.moodLog && (
              <div className="text-xl mt-auto">
                {getMoodEmoji(dayData.moodLog.mood)}
              </div>
            )}
            {dayData && dayData.lifeEvents.length > 0 && (
              <Badge variant="secondary" className="text-xs mt-1 bg-orange-500 text-white">
                {dayData.lifeEvents.length} event{dayData.lifeEvents.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </button>
      )
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {days}
      </div>
    )
  }

  // Year View (12 mini months)
  const renderYearView = () => {
    const months = []

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(currentDate.getFullYear(), month, 1)
      const lastDay = new Date(currentDate.getFullYear(), month + 1, 0)
      const daysInMonth = lastDay.getDate()

      // Calculate dream count for this month
      const monthDreams = timelineData.filter(d => {
        const date = new Date(d.date)
        return date.getMonth() === month
      }).reduce((sum, d) => sum + d.dreamCount, 0)

      months.push(
        <button
          key={month}
          onClick={() => {
            const newDate = new Date(currentDate.getFullYear(), month, 1)
            setCurrentDate(newDate)
            setViewMode('month')
          }}
          className="p-3 rounded-lg bg-white border border-gray-200 hover:border-purple-400 transition-all group"
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            {new Date(currentDate.getFullYear(), month).toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dateStr = `${currentDate.getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
              const dayData = timelineData.find(d => d.date === dateStr)
              const hasDreams = dayData && dayData.dreamCount > 0

              return (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-sm",
                    hasDreams
                      ? dayData.dreamCount === 1
                        ? 'bg-purple-300'
                        : dayData.dreamCount === 2
                        ? 'bg-purple-500'
                        : 'bg-purple-700'
                      : 'bg-gray-100'
                  )}
                />
              )
            })}
          </div>
          <div className="text-xs text-purple-600 mt-2 font-medium">
            {monthDreams} dream{monthDreams !== 1 ? 's' : ''}
          </div>
        </button>
      )
    }

    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {months}
      </div>
    )
  }

  const getViewTitle = () => {
    switch (viewMode) {
      case 'week':
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      case 'year':
        return currentDate.getFullYear().toString()
    }
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

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-xl font-serif">Period Statistics</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalDreams}</div>
                <div className="text-xs text-gray-600">Dreams</div>
              </div>
              <div className="text-center p-3 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{stats.totalMoodLogs}</div>
                <div className="text-xs text-gray-600">Mood Logs</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.totalLifeEvents}</div>
                <div className="text-xs text-gray-600">Life Events</div>
              </div>
              {stats.averageMood && (
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.averageMood.toFixed(1)}/5</div>
                  <div className="text-xs text-gray-600">Avg Mood</div>
                </div>
              )}
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {stats.dreamFrequency.percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">Dream Days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-xl font-serif">Dream Calendar</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('week')}
                className={viewMode === 'week' ? 'bg-purple-100' : ''}
              >
                Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('month')}
                className={viewMode === 'month' ? 'bg-purple-100' : ''}
              >
                Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('year')}
                className={viewMode === 'year' ? 'bg-purple-100' : ''}
              >
                Year
              </Button>
            </div>
          </div>
          <CardDescription>
            {viewMode === 'year'
              ? 'Click a month to view details'
              : 'Click on a day to see details. Use arrow keys or buttons to navigate'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <div className="text-center">
              <h3 className="font-semibold text-gray-800">{getViewTitle()}</h3>
              <Button variant="link" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('next')}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Calendar Grid */}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'year' && renderYearView()}

          {/* Legend */}
          {viewMode !== 'year' && (
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded border" />
                <span>No activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-200 rounded" />
                <span>1 dream</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded" />
                <span>2 dreams</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded" />
                <span>3+ dreams</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-200 rounded relative">
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                </div>
                <span>Life event</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDay && (
        <Card ref={detailsRef} className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-serif">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dreams */}
            {selectedDay.dreams.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Dreams ({selectedDay.dreams.length})
                </h4>
                <div className="space-y-2">
                  {selectedDay.dreams.map((dream, i) => (
                    <div key={i} className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-2">{dream.content}</p>
                      {dream.symbols && dream.symbols.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dream.symbols.slice(0, 3).map((symbol: string, j: number) => (
                            <Badge key={j} variant="secondary" className="text-xs">
                              {symbol}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mood */}
            {selectedDay.moodLog && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Mood
                </h4>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-2xl">{getMoodEmoji(selectedDay.moodLog.mood)}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>Mood: {selectedDay.moodLog.mood}/5</p>
                      <p>Stress: {selectedDay.moodLog.stress}/5</p>
                      <p>Energy: {selectedDay.moodLog.energy}/5</p>
                    </div>
                  </div>
                  {selectedDay.moodLog.notes && (
                    <p className="text-sm text-gray-600 mt-2">{selectedDay.moodLog.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Life Events */}
            {selectedDay.lifeEvents.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Life Events</h4>
                <div className="space-y-2">
                  {selectedDay.lifeEvents.map((event: any, i: number) => (
                    <div key={i} className="p-3 bg-orange-50 rounded-lg">
                      <p className="font-medium text-orange-900">{event.title}</p>
                      <p className="text-sm text-gray-700">{event.description}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {event.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDay.dreams.length === 0 && !selectedDay.moodLog && selectedDay.lifeEvents.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No activity on this day</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
