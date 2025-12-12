'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Target, TrendingUp, Calendar, Sparkles, ChevronRight } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import StreakCounter from './StreakCounter'
import AchievementCard from './AchievementCard'
import CelebrationModal from './CelebrationModal'
import type { GamificationDashboard as DashboardData, CelebrationEvent } from '@/types/gamification'

interface GamificationDashboardProps {
  userId: string
}

export default function GamificationDashboard({ userId }: GamificationDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [celebrations, setCelebrations] = useState<CelebrationEvent[]>([])
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/gamification/dashboard?userId=${userId}`)
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message || "Failed to load gamification data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseStreakFreeze = async (type: 'dream' | 'mood' | 'wellness') => {
    try {
      const response = await fetch('/api/gamification/streaks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, streakType: type })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Streak Freeze Applied!",
          description: result.message
        })
        fetchDashboardData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply streak freeze",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-48 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No gamification data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Level Progress */}
      <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {data.level.current_level}
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-gray-800">
                  {data.level.current_title}
                </h2>
                <p className="text-sm text-gray-600">
                  Level {data.level.current_level} • Next: {data.level.next_title}
                </p>
              </div>
            </div>
            {data.unviewed_achievements_count > 0 && (
              <Badge variant="default" className="bg-red-500 text-white">
                {data.unviewed_achievements_count} New!
              </Badge>
            )}
          </div>

          {/* XP Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{data.level.current_xp} XP</span>
              <span>{data.level.xp_to_next_level} XP to next level</span>
            </div>
            <div className="h-4 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${data.level.progress_percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {data.level.progress_percentage}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Sparkles className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="w-4 h-4 mr-2" />
            Goals
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Streaks Section */}
          <div>
            <h3 className="text-lg font-serif font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔥</span> Your Streaks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StreakCounter
                streaks={data.streaks}
                type="wellness"
                showFreezeButton={true}
                onUseFreeze={() => handleUseStreakFreeze('wellness')}
              />
              <StreakCounter
                streaks={data.streaks}
                type="dream"
                showFreezeButton={true}
                onUseFreeze={() => handleUseStreakFreeze('dream')}
              />
              <StreakCounter
                streaks={data.streaks}
                type="mood"
                showFreezeButton={true}
                onUseFreeze={() => handleUseStreakFreeze('mood')}
              />
            </div>
          </div>

          {/* Recent Achievements */}
          {data.recent_achievements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Recent Achievements
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Switch to achievements tab
                    document.querySelector('[value="achievements"]')?.dispatchEvent(new Event('click'))
                  }}
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.recent_achievements.slice(0, 3).map((unlock) => (
                  <AchievementCard
                    key={unlock.achievement.id}
                    achievement={unlock.achievement}
                    isUnlocked={true}
                    unlockedAt={unlock.achievement.created_at}
                    size="small"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Goals */}
          {data.active_goals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif font-semibold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Active Goals
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.active_goals.slice(0, 4).map((goalProgress) => (
                  <Card key={goalProgress.goal.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{goalProgress.goal.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{goalProgress.goal.title}</h4>
                          <p className="text-xs text-gray-500">
                            {goalProgress.goal.current_value} / {goalProgress.goal.target_value}
                          </p>
                        </div>
                      </div>
                      <Badge variant={goalProgress.is_on_track ? "default" : "secondary"}>
                        {goalProgress.is_on_track ? 'On Track' : 'Behind'}
                      </Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-500"
                        style={{ width: `${goalProgress.progress_percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {goalProgress.days_remaining} day{goalProgress.days_remaining !== 1 ? 's' : ''} remaining
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* This Week Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">
                    {data.daily_activity.total_this_week.dreams}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Dreams</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">
                    {data.daily_activity.total_this_week.moods}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Moods</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">
                    {data.daily_activity.total_this_week.journals}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Journals</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-600">
                    {data.daily_activity.total_this_week.xp}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">XP Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>All Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                View all achievements in the achievements gallery component (implement separately)
              </p>
              {data.recent_achievements.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.recent_achievements.map((unlock) => (
                    <AchievementCard
                      key={unlock.achievement.id}
                      achievement={unlock.achievement}
                      isUnlocked={true}
                      unlockedAt={unlock.achievement.created_at}
                      size="medium"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Manage Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Full goal management interface (implement separately with create/edit/delete)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        celebrations={celebrations}
        newAchievements={data.recent_achievements.map(ra => ra.achievement)}
      />
    </div>
  )
}
