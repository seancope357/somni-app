'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, TrendingUp, Trophy } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import AchievementCard from './AchievementCard'
import AchievementDetailModal from './AchievementDetailModal'
import type { Achievement, AchievementTier, AchievementCategory } from '@/types/gamification'
import { TIER_COLORS, CATEGORY_LABELS } from '@/types/gamification'
import { cn } from '@/lib/utils'

interface AchievementWithProgress extends Achievement {
  is_unlocked: boolean
  unlocked_at: string | null
  progress: number
}

interface AchievementGalleryProps {
  userId: string
}

type StatusFilter = 'all' | 'unlocked' | 'locked'
type SortOption = 'recent' | 'rarity' | 'name'

export default function AchievementGallery({ userId }: AchievementGalleryProps) {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<AchievementTier | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<AchievementCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  useEffect(() => {
    fetchAchievements()
  }, [userId])

  const fetchAchievements = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/gamification/achievements/progress?userId=${userId}`)
      const result = await response.json()

      if (response.ok) {
        setAchievements(result.achievements || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error loading achievements",
        description: error.message || "Failed to load achievement data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort achievements
  const filteredAndSortedAchievements = useMemo(() => {
    let filtered = achievements

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      )
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(a => a.tier === tierFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === categoryFilter)
    }

    // Status filter
    if (statusFilter === 'unlocked') {
      filtered = filtered.filter(a => a.is_unlocked)
    } else if (statusFilter === 'locked') {
      filtered = filtered.filter(a => !a.is_unlocked)
    }

    // Sort
    const sorted = [...filtered]
    if (sortBy === 'recent') {
      sorted.sort((a, b) => {
        // Unlocked achievements first, sorted by unlock date
        if (a.is_unlocked && !b.is_unlocked) return -1
        if (!a.is_unlocked && b.is_unlocked) return 1
        if (a.is_unlocked && b.is_unlocked && a.unlocked_at && b.unlocked_at) {
          return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
        }
        return 0
      })
    } else if (sortBy === 'rarity') {
      const tierOrder: Record<AchievementTier, number> = {
        legendary: 0,
        platinum: 1,
        gold: 2,
        silver: 3,
        bronze: 4
      }
      sorted.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  }, [achievements, searchQuery, tierFilter, categoryFilter, statusFilter, sortBy])

  const unlockedCount = achievements.filter(a => a.is_unlocked).length
  const totalCount = achievements.length
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const handleAchievementClick = (achievement: AchievementWithProgress) => {
    setSelectedAchievement(achievement)
    setShowDetailModal(true)
  }

  const tierOptions: (AchievementTier | 'all')[] = ['all', 'bronze', 'silver', 'gold', 'platinum', 'legendary']
  const categoryOptions: (AchievementCategory | 'all')[] = ['all', 'beginner', 'consistency', 'volume', 'quality', 'insight', 'special']

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="p-6 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-800 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
              Achievement Gallery
            </h2>
            <p className="text-gray-600 mt-2">
              {unlockedCount} of {totalCount} achievements unlocked
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-yellow-600">{percentage}%</div>
            <p className="text-sm text-gray-600 mt-1">Complete</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </Card>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tier Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Tier
            </label>
            <div className="flex flex-wrap gap-2">
              {tierOptions.map(tier => (
                <Button
                  key={tier}
                  variant={tierFilter === tier ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTierFilter(tier)}
                  className={cn(
                    "transition-all",
                    tier !== 'all' && tierFilter === tier && TIER_COLORS[tier as AchievementTier].bg,
                    tier !== 'all' && tierFilter === tier && TIER_COLORS[tier as AchievementTier].text
                  )}
                >
                  {tier === 'all' ? 'All Tiers' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Category & Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as AchievementCategory | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categoryOptions.slice(1).map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat as AchievementCategory]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <div className="flex gap-2">
                {(['all', 'unlocked', 'locked'] as StatusFilter[]).map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="flex-1"
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Sort By
            </label>
            <div className="flex gap-2">
              {([
                { value: 'recent', label: 'Recently Unlocked' },
                { value: 'rarity', label: 'Rarity' },
                { value: 'name', label: 'Name' }
              ] as { value: SortOption; label: string }[]).map(option => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Achievement Grid */}
      {filteredAndSortedAchievements.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedAchievements.map(achievement => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isUnlocked={achievement.is_unlocked}
              unlockedAt={achievement.unlocked_at}
              progress={achievement.progress}
              showProgress={true}
              size="medium"
              onClick={() => handleAchievementClick(achievement)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No achievements found</h3>
          <p className="text-gray-500">
            Try adjusting your filters or search query
          </p>
        </Card>
      )}

      {/* Detail Modal */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedAchievement(null)
          }}
          userId={userId}
        />
      )}
    </div>
  )
}
