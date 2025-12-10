'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Trophy, Zap, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CircularStreakProgressProps {
  userId: string
  size?: 'small' | 'medium' | 'large'
  showRewards?: boolean
  onClick?: () => void
}

interface StreakData {
  dreamStreak: number
  moodStreak: number
  wellnessStreak: number
  level: number
  currentXP: number
  xpToNext: number
  nextReward?: string
  streakFreezesAvailable: number
}

export default function CircularStreakProgress({
  userId,
  size = 'medium',
  showRewards = true,
  onClick
}: CircularStreakProgressProps) {
  const [data, setData] = useState<StreakData | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStreakData()
  }, [userId])

  const fetchStreakData = async () => {
    try {
      const response = await fetch(`/api/gamification/dashboard?userId=${userId}`)
      const result = await response.json()

      if (response.ok) {
        setData({
          dreamStreak: result.streaks?.current_dream_streak || 0,
          moodStreak: result.streaks?.current_mood_streak || 0,
          wellnessStreak: result.streaks?.current_wellness_streak || 0,
          level: result.level?.current_level || 1,
          currentXP: result.level?.current_xp || 0,
          xpToNext: result.level?.xp_to_next_level || 100,
          nextReward: result.next_achievement?.name || null,
          streakFreezesAvailable: result.streaks?.streak_freezes_available || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch streak data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sizes = {
    small: { container: 'w-40 h-40', svg: 140, center: 60, text: 'text-xl' },
    medium: { container: 'w-56 h-56', svg: 200, center: 80, text: 'text-2xl' },
    large: { container: 'w-72 h-72', svg: 260, center: 100, text: 'text-3xl' }
  }

  const config = sizes[size]
  const radius = config.svg / 2 - 20
  const centerX = config.svg / 2
  const centerY = config.svg / 2

  // Calculate progress percentages
  const dreamProgress = data ? Math.min((data.dreamStreak / 30) * 100, 100) : 0
  const moodProgress = data ? Math.min((data.moodStreak / 30) * 100, 100) : 0
  const wellnessProgress = data ? Math.min((data.wellnessStreak / 30) * 100, 100) : 0
  const xpProgress = data ? (data.currentXP / data.xpToNext) * 100 : 0

  // Create circular path for each streak (3 concentric circles)
  const createCirclePath = (progress: number, radiusOffset: number) => {
    const r = radius - radiusOffset
    const circumference = 2 * Math.PI * r
    const offset = circumference - (progress / 100) * circumference
    return { circumference, offset, radius: r }
  }

  const dream = createCirclePath(dreamProgress, 0)
  const mood = createCirclePath(moodProgress, 15)
  const wellness = createCirclePath(wellnessProgress, 30)

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 rounded-full",
        config.container
      )}>
        <div className="animate-spin">
          <Sparkles className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalStreak = data.dreamStreak + data.moodStreak + data.wellnessStreak
  const hasActiveStreaks = totalStreak > 0

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-transform duration-300",
        config.container,
        isHovered && "scale-105"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* SVG Circular Progress */}
      <svg
        width={config.svg}
        height={config.svg}
        className="transform -rotate-90"
      >
        {/* Background circles */}
        <circle
          cx={centerX}
          cy={centerY}
          r={dream.radius}
          fill="none"
          stroke="#f3e8ff"
          strokeWidth="8"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={mood.radius}
          fill="none"
          stroke="#fce7f3"
          strokeWidth="8"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={wellness.radius}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth="8"
        />

        {/* Progress circles with gradient */}
        <defs>
          <linearGradient id="dreamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="wellnessGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>

        {/* Dream Streak (outer ring) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={dream.radius}
          fill="none"
          stroke="url(#dreamGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dream.circumference}
          strokeDashoffset={dream.offset}
          className="transition-all duration-700 ease-out"
        />

        {/* Mood Streak (middle ring) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={mood.radius}
          fill="none"
          stroke="url(#moodGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={mood.circumference}
          strokeDashoffset={mood.offset}
          className="transition-all duration-700 ease-out"
        />

        {/* Wellness Streak (inner ring) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={wellness.radius}
          fill="none"
          stroke="url(#wellnessGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={wellness.circumference}
          strokeDashoffset={wellness.offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Level Badge */}
        <div className={cn(
          "w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg mb-2",
          isHovered && "scale-110 shadow-xl transition-all duration-300"
        )}>
          <span className="text-2xl font-bold text-white">{data.level}</span>
        </div>

        {/* XP Progress */}
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Level {data.level}</p>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data.currentXP} / {data.xpToNext} XP
          </p>
        </div>

        {/* Fire Icon for Active Streaks */}
        {hasActiveStreaks && (
          <div className={cn(
            "mt-2 transition-all duration-300",
            isHovered ? "scale-125" : "scale-100"
          )}>
            <span className="text-3xl">🔥</span>
          </div>
        )}
      </div>

      {/* Hover Overlay - Show Rewards */}
      {isHovered && showRewards && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-200">
          <Sparkles className="w-8 h-8 mb-2 text-yellow-400" />
          <p className="text-sm font-semibold text-center mb-3">Next Rewards</p>

          {data.nextReward && (
            <div className="mb-2 text-center">
              <Trophy className="w-5 h-5 inline-block text-yellow-400 mr-1" />
              <span className="text-xs">{data.nextReward}</span>
            </div>
          )}

          <div className="space-y-1 text-xs text-center">
            {data.dreamStreak < 7 && (
              <p className="text-purple-300">
                🌙 {7 - data.dreamStreak} days to Week Warrior
              </p>
            )}
            {data.moodStreak < 7 && (
              <p className="text-pink-300">
                💗 {7 - data.moodStreak} days to Mood Master
              </p>
            )}
            {totalStreak < 21 && (
              <p className="text-green-300">
                ✨ {21 - totalStreak} days to Consistency King
              </p>
            )}
          </div>

          {data.streakFreezesAvailable > 0 && (
            <Badge className="mt-3 bg-blue-500 text-white text-xs">
              {data.streakFreezesAvailable} Streak Freezes
            </Badge>
          )}

          <p className="text-xs text-gray-300 mt-3">Click to view all</p>
        </div>
      )}

      {/* Legend (positioned below) */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
          <span className="text-gray-600">Dreams {data.dreamStreak}d</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500" />
          <span className="text-gray-600">Mood {data.moodStreak}d</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-teal-500" />
          <span className="text-gray-600">Wellness {data.wellnessStreak}d</span>
        </div>
      </div>
    </div>
  )
}
