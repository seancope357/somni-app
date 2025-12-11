'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp, Award, Flame, Zap, Calendar, BookOpen, Heart, Brain, Star, Trophy, Target, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface UserStats {
  total_xp: number
  current_level: number
  xp_to_next_level: number
  current_streak: number
  longest_streak: number
  total_dreams: number
  total_journal_entries: number
  total_mood_logs: number
  total_life_events: number
}

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  tier: string
  xp_reward: number
  progress: number
  is_completed: boolean
  completed_at: string | null
  requirement_value: number | null
}

interface AchievementStats {
  completed: number
  total: number
  percent_complete: number
}

interface DashboardViewProps {
  userId: string
}

export default function DashboardView({ userId }: DashboardViewProps) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [achievementStats, setAchievementStats] = useState<AchievementStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch user stats
      const statsResponse = await fetch(`/api/user-stats?userId=${userId}`)
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch user stats')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Fetch achievements
      const achievementsResponse = await fetch(`/api/achievements?userId=${userId}`)
      if (!achievementsResponse.ok) {
        const errorData = await achievementsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch achievements')
      }
      const achievementsData = await achievementsResponse.json()
      setAchievements(achievementsData.achievements)
      setAchievementStats(achievementsData.stats)
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load dashboard data'
      setError(errorMessage)
      console.error('Dashboard error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Gamification System Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            The gamification system is not yet configured. To enable the dashboard, achievements, and XP tracking,
            you need to run the database migration.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Setup Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Open your Supabase project dashboard</li>
              <li>Navigate to the SQL Editor</li>
              <li>Copy the contents of <code className="bg-gray-200 px-1 rounded">supabase-gamification-migration.sql</code></li>
              <li>Paste and execute the SQL in the editor</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Error details:</strong> {error}
              </p>
            </div>
          )}

          <Button
            onClick={fetchDashboardData}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            Retry Loading Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Calculate level progress percentage
  const totalXpForCurrentLevel = stats.total_xp
  const xpForNextLevel = stats.xp_to_next_level
  const xpInCurrentLevel = totalXpForCurrentLevel - (totalXpForCurrentLevel - xpForNextLevel)
  const levelProgress = xpForNextLevel > 0 ? Math.min(100, Math.max(0, ((xpForNextLevel - xpInCurrentLevel) / xpForNextLevel) * 100)) : 0

  // Get recent achievements
  const recentAchievements = achievements
    .filter(a => a.is_completed)
    .sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    })
    .slice(0, 5)

  // Get in-progress achievements
  const inProgressAchievements = achievements
    .filter(a => !a.is_completed && a.progress > 0)
    .slice(0, 3)

  // Tier colors
  const tierColors: { [key: string]: string } = {
    bronze: 'bg-amber-100 text-amber-700 border-amber-200',
    silver: 'bg-gray-100 text-gray-700 border-gray-300',
    gold: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    platinum: 'bg-purple-100 text-purple-700 border-purple-300'
  }

  return (
    <div className="space-y-6">
      {/* Level and XP Card */}
      <Card className="border-0 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 text-white rounded-2xl shadow-lg overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-6 h-6" />
                <h2 className="text-3xl font-bold">Level {stats.current_level}</h2>
              </div>
              <p className="text-purple-100 text-sm">
                {xpForNextLevel} XP to Level {stats.current_level + 1}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.total_xp}</div>
              <div className="text-purple-100 text-sm">Total XP</div>
            </div>
          </div>
          <Progress value={100 - levelProgress} className="h-3 bg-white/20" />
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{stats.total_dreams}</div>
            <div className="text-sm text-gray-600">Dreams</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-orange-100 rounded-full">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{stats.current_streak}</div>
            <div className="text-sm text-gray-600">Day Streak</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-pink-100 rounded-full">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{stats.total_mood_logs}</div>
            <div className="text-sm text-gray-600">Mood Logs</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {achievementStats?.completed || 0}/{achievementStats?.total || 0}
            </div>
            <div className="text-sm text-gray-600">Achievements</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Progress */}
      {achievementStats && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-serif text-gray-800">
                Achievement Progress
              </CardTitle>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {achievementStats.percent_complete}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={achievementStats.percent_complete} className="h-2 mb-4" />
            <p className="text-sm text-gray-600">
              {achievementStats.completed} of {achievementStats.total} achievements unlocked
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-gray-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                >
                  <div className="text-3xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{achievement.name}</div>
                    <div className="text-sm text-gray-600">{achievement.description}</div>
                  </div>
                  <Badge className={tierColors[achievement.tier] || tierColors.bronze}>
                    {achievement.tier}
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-600">
                      +{achievement.xp_reward} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In Progress */}
      {inProgressAchievements.length > 0 && (
        <Card className="border-0 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgressAchievements.map(achievement => {
                const progressPercent = achievement.requirement_value
                  ? Math.min(100, (achievement.progress / achievement.requirement_value) * 100)
                  : 0

                return (
                  <div key={achievement.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{achievement.name}</div>
                        <div className="text-sm text-gray-600">{achievement.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progressPercent} className="flex-1 h-2" />
                      <span className="text-sm text-gray-600 min-w-[60px] text-right">
                        {achievement.progress}/{achievement.requirement_value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak Info */}
      {stats.longest_streak > 0 && (
        <Card className="border-0 bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-6 h-6 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Personal Best</h3>
                </div>
                <p className="text-gray-600 text-sm">Your longest streak</p>
              </div>
              <div className="text-4xl font-bold text-orange-600">
                {stats.longest_streak}
                <span className="text-lg ml-1">days</span>
              </div>
            </div>
            {stats.current_streak === stats.longest_streak && stats.current_streak > 0 && (
              <div className="mt-3 p-2 bg-white/50 rounded-lg text-center">
                <p className="text-sm font-medium text-orange-700">
                  🎉 You're at your personal record!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Achievements Link */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2">
          View all {achievements.length} achievements in the Settings tab
        </p>
      </div>
    </div>
  )
}
