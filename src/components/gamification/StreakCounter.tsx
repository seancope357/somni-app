'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, Trophy, Shield, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserStreak, StreakType } from '@/types/gamification'

interface StreakCounterProps {
  streaks: UserStreak
  type: StreakType
  showFreezeButton?: boolean
  onUseFreeze?: () => void
  warning?: {
    hours_until_break: number
    can_use_freeze: boolean
  }
}

export default function StreakCounter({
  streaks,
  type,
  showFreezeButton = false,
  onUseFreeze,
  warning
}: StreakCounterProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Get streak data based on type
  const getStreakData = () => {
    switch (type) {
      case 'dream':
        return {
          current: streaks.current_dream_streak,
          longest: streaks.longest_dream_streak,
          label: 'Dream Streak',
          color: 'from-purple-500 to-indigo-500',
          icon: '🌙'
        }
      case 'mood':
        return {
          current: streaks.current_mood_streak,
          longest: streaks.longest_mood_streak,
          label: 'Mood Streak',
          color: 'from-blue-500 to-cyan-500',
          icon: '😊'
        }
      case 'wellness':
        return {
          current: streaks.current_wellness_streak,
          longest: streaks.longest_wellness_streak,
          label: 'Wellness Streak',
          color: 'from-green-500 to-emerald-500',
          icon: '✨'
        }
    }
  }

  const data = getStreakData()
  const hasStreak = data.current > 0
  const isPersonalBest = data.current === data.longest && data.current > 0

  // Calculate flame size based on streak
  const getFlameSize = () => {
    if (data.current === 0) return 'text-4xl opacity-30'
    if (data.current < 3) return 'text-4xl'
    if (data.current < 7) return 'text-5xl'
    if (data.current < 30) return 'text-6xl'
    return 'text-7xl'
  }

  // Get flame animation based on streak
  const getFlameAnimation = () => {
    if (data.current === 0) return ''
    if (data.current < 7) return 'animate-pulse'
    return 'animate-bounce'
  }

  return (
    <Card
      className={cn(
        "relative p-6 transition-all duration-300",
        hasStreak && "hover:shadow-lg",
        isHovered && hasStreak && "scale-105"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Warning Banner */}
      {warning && warning.hours_until_break > 0 && warning.hours_until_break < 24 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
          <AlertCircle className="w-3 h-3" />
          <span>{Math.round(warning.hours_until_break)}h left</span>
        </div>
      )}

      {/* Personal Best Badge */}
      {isPersonalBest && data.current >= 7 && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Trophy className="w-3 h-3 mr-1" />
            Personal Best!
          </Badge>
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* Left: Icon & Streak Count */}
        <div className="flex items-center gap-4">
          <div className={cn("transition-all duration-300", getFlameSize(), getFlameAnimation())}>
            {hasStreak ? '🔥' : data.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg text-gray-800">{data.label}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-bold bg-gradient-to-r {data.color} bg-clip-text text-transparent">
                {data.current}
              </span>
              <span className="text-sm text-gray-500">day{data.current !== 1 ? 's' : ''}</span>
            </div>
            {data.longest > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Best: {data.longest} day{data.longest !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right: Streak Freeze Button */}
        {showFreezeButton && warning && warning.can_use_freeze && onUseFreeze && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUseFreeze}
            className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
            title="Use a streak freeze to protect this streak"
          >
            <Shield className="w-4 h-4" />
            Use Freeze ({streaks.streak_freezes_available})
          </Button>
        )}
      </div>

      {/* Progress Bar (visual indicator) */}
      {hasStreak && (
        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r transition-all duration-500",
              data.color
            )}
            style={{
              width: `${Math.min(100, (data.current / (data.longest || data.current)) * 100)}%`
            }}
          />
        </div>
      )}

      {/* Milestone Messages */}
      {data.current >= 7 && data.current % 7 === 0 && (
        <p className="mt-3 text-sm text-center text-purple-600 font-medium">
          🎉 {data.current / 7} week{data.current / 7 !== 1 ? 's' : ''} strong!
        </p>
      )}
      {data.current === 30 && (
        <p className="mt-3 text-sm text-center text-purple-600 font-medium">
          👑 One month milestone!
        </p>
      )}
      {data.current === 100 && (
        <p className="mt-3 text-sm text-center text-purple-600 font-medium">
          💎 Century club! You're legendary!
        </p>
      )}

      {/* Empty State Message */}
      {!hasStreak && (
        <p className="mt-3 text-sm text-center text-gray-500">
          Start your streak today!
        </p>
      )}
    </Card>
  )
}
