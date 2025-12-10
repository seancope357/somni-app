'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Trophy, Target, TrendingUp, ChevronRight, Zap, Star } from 'lucide-react'
import CircularStreakProgress from './CircularStreakProgress'
import { cn } from '@/lib/utils'

interface GamificationWidgetProps {
  userId: string
  onViewFullClick?: () => void
  variant?: 'compact' | 'full'
}

interface QuickStats {
  totalXP: number
  level: number
  levelTitle: string
  achievementsUnlocked: number
  totalAchievements: number
  activeGoals: number
  newAchievements: number
  recentAchievement?: {
    name: string
    icon: string
    tier: string
  }
}

export default function GamificationWidget({
  userId,
  onViewFullClick,
  variant = 'full'
}: GamificationWidgetProps) {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSparkle, setShowSparkle] = useState(false)

  useEffect(() => {
    fetchGamificationStats()
    // Trigger sparkle animation every 5 seconds
    const interval = setInterval(() => {
      setShowSparkle(true)
      setTimeout(() => setShowSparkle(false), 1000)
    }, 5000)
    return () => clearInterval(interval)
  }, [userId])

  const fetchGamificationStats = async () => {
    try {
      const response = await fetch(`/api/gamification/dashboard?userId=${userId}`)
      const result = await response.json()

      if (response.ok) {
        setStats({
          totalXP: result.level?.total_xp || 0,
          level: result.level?.current_level || 1,
          levelTitle: result.level?.current_title || 'Dream Novice',
          achievementsUnlocked: result.recent_achievements?.length || 0,
          totalAchievements: 23, // Total achievements available
          activeGoals: result.active_goals?.length || 0,
          newAchievements: result.unviewed_achievements_count || 0,
          recentAchievement: result.recent_achievements?.[0]?.achievement
        })
      }
    } catch (error) {
      console.error('Failed to fetch gamification stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <Card
        className="border-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden"
        onClick={onViewFullClick}
      >
        {/* Animated background sparkles */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-4 animate-pulse">✨</div>
          <div className="absolute bottom-4 left-4 animate-pulse delay-100">⭐</div>
          <div className="absolute top-1/2 left-1/2 animate-pulse delay-200">💫</div>
        </div>

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-white/80 mb-1">Your Progress</p>
              <h3 className="text-2xl font-serif font-bold">{stats?.levelTitle || 'Loading...'}</h3>
              <p className="text-sm text-white/90 mt-1">Level {stats?.level || 1}</p>
            </div>
            {stats && stats.newAchievements > 0 && (
              <Badge className="bg-yellow-400 text-yellow-900 font-bold animate-bounce">
                {stats.newAchievements} New!
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <Trophy className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.achievementsUnlocked || 0}</p>
              <p className="text-xs text-white/80">Unlocked</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <Target className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.activeGoals || 0}</p>
              <p className="text-xs text-white/80">Goals</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <Zap className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.totalXP || 0}</p>
              <p className="text-xs text-white/80">Total XP</p>
            </div>
          </div>

          <Button
            className="w-full mt-4 bg-white text-purple-700 hover:bg-white/90 font-semibold"
            onClick={(e) => {
              e.stopPropagation()
              onViewFullClick?.()
            }}
          >
            View Progress
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl relative overflow-hidden">
      {/* Sparkle animation */}
      {showSparkle && (
        <div className="absolute top-4 right-4 animate-ping">
          <Sparkles className="w-6 h-6 text-yellow-400" />
        </div>
      )}

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Your Journey
          </CardTitle>
          {stats && stats.newAchievements > 0 && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold animate-bounce shadow-lg">
              <Star className="w-3 h-3 mr-1" />
              {stats.newAchievements} New Achievement{stats.newAchievements > 1 ? 's' : ''}!
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Circular Progress - Center piece */}
        <div className="flex justify-center pt-4 pb-20">
          <CircularStreakProgress
            userId={userId}
            size="large"
            showRewards={true}
            onClick={onViewFullClick}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Level & Title */}
          <div className="col-span-2 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Level {stats?.level || 1}</p>
                <h4 className="text-xl font-serif font-bold text-purple-700">
                  {stats?.levelTitle || 'Dream Novice'}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-600 font-medium">
                    {stats?.totalXP || 0} Total XP
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {stats?.level || 1}
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100">
            <Trophy className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {stats?.achievementsUnlocked || 0}
              <span className="text-sm text-gray-500 font-normal ml-1">/ {stats?.totalAchievements || 23}</span>
            </p>
            <p className="text-xs text-gray-600">Achievements</p>
          </div>

          {/* Active Goals */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
            <Target className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats?.activeGoals || 0}</p>
            <p className="text-xs text-gray-600">Active Goals</p>
          </div>
        </div>

        {/* Recent Achievement */}
        {stats?.recentAchievement && (
          <div className="p-4 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 rounded-xl border-2 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{stats.recentAchievement.icon}</div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Latest Achievement</p>
                <h4 className="font-serif font-semibold text-gray-800">
                  {stats.recentAchievement.name}
                </h4>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-semibold",
                  stats.recentAchievement.tier === 'legendary' && "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
                  stats.recentAchievement.tier === 'platinum' && "bg-gradient-to-r from-blue-500 to-purple-500 text-white",
                  stats.recentAchievement.tier === 'gold' && "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                )}
              >
                {stats.recentAchievement.tier.toUpperCase()}
              </Badge>
            </div>
          </div>
        )}

        {/* View Full Button */}
        <Button
          onClick={onViewFullClick}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          size="lg"
        >
          <Trophy className="w-5 h-5 mr-2" />
          View Full Progress
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Motivational Message */}
        <div className="text-center">
          <p className="text-sm text-gray-600 italic">
            {stats && stats.totalXP > 0
              ? "Keep up the amazing work! 🌟"
              : "Start your journey today! ✨"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
