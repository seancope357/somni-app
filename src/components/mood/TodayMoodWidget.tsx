'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, Zap, Brain } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface TodayMoodWidgetProps {
  userId: string
  onMoodLogged?: () => void
}

const MOOD_EMOJIS = ['😢', '😕', '😐', '😊', '😄']
const STRESS_COLORS = ['bg-green-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500']
const ENERGY_COLORS = ['bg-gray-400', 'bg-gray-500', 'bg-blue-400', 'bg-blue-500', 'bg-purple-500']

export default function TodayMoodWidget({ userId, onMoodLogged }: TodayMoodWidgetProps) {
  const [mood, setMood] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLogged, setHasLogged] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchTodayMood()
  }, [userId])

  const fetchTodayMood = async () => {
    try {
      const response = await fetch(`/api/mood-logs?userId=${userId}&from=${today}&to=${today}`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          const todayLog = data[0]
          setMood(todayLog.mood)
          setStress(todayLog.stress)
          setEnergy(todayLog.energy)
          setHasLogged(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch today mood:', error)
    }
  }

  const handleSave = async () => {
    if (!mood || !stress || !energy) {
      toast({
        title: "Please select all three",
        description: "Mood, stress, and energy are required.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/mood-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          log_date: today,
          mood,
          stress,
          energy
        })
      })

      if (!response.ok) throw new Error('Failed to save')

      setHasLogged(true)
      setIsExpanded(false)
      toast({
        title: "Mood logged!",
        description: "Your daily mood has been saved."
      })
      
      if (onMoodLogged) onMoodLogged()

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your mood. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (hasLogged && !isExpanded) {
    return (
      <Card className="border-0 bg-white/90 backdrop-blur-lg rounded-xl shadow-md">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className="text-2xl">{MOOD_EMOJIS[mood! - 1]}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-orange-500" />
                <div className={`w-2 h-2 rounded-full ${STRESS_COLORS[stress! - 1]}`} />
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <div className={`w-2 h-2 rounded-full ${ENERGY_COLORS[energy! - 1]}`} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/90 backdrop-blur-lg rounded-xl shadow-md">
      <CardContent className="pt-4 pb-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700 text-center">
          How are you feeling today?
        </h3>

        {/* Mood */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-medium text-gray-600">Mood</span>
          </div>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map(val => (
              <button
                key={val}
                onClick={() => setMood(val)}
                className={`flex-1 text-2xl p-2 rounded-lg transition-all ${
                  mood === val
                    ? 'bg-pink-100 ring-2 ring-pink-500 scale-110'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {MOOD_EMOJIS[val - 1]}
              </button>
            ))}
          </div>
        </div>

        {/* Stress */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-600">Stress</span>
          </div>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map(val => (
              <button
                key={val}
                onClick={() => setStress(val)}
                className={`flex-1 h-8 rounded-lg transition-all ${STRESS_COLORS[val - 1]} ${
                  stress === val
                    ? 'ring-2 ring-offset-2 ring-gray-800 scale-105'
                    : 'opacity-40 hover:opacity-60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Energy */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">Energy</span>
          </div>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map(val => (
              <button
                key={val}
                onClick={() => setEnergy(val)}
                className={`flex-1 h-8 rounded-lg transition-all ${ENERGY_COLORS[val - 1]} ${
                  energy === val
                    ? 'ring-2 ring-offset-2 ring-gray-800 scale-105'
                    : 'opacity-40 hover:opacity-60'
                }`}
              />
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading || !mood || !stress || !energy}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
        >
          {isLoading ? 'Saving...' : hasLogged ? 'Update Mood' : 'Log Mood'}
        </Button>
      </CardContent>
    </Card>
  )
}
