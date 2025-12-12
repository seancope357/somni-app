'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trophy, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/types/gamification'
import { TIER_COLORS } from '@/types/gamification'

interface AchievementDetailModalProps {
  achievement: Achievement
  isOpen: boolean
  onClose: () => void
  progress?: number
  isUnlocked?: boolean
  unlockedAt?: string | null
}

export default function AchievementDetailModal({
  achievement,
  isOpen,
  onClose,
  progress = 0,
  isUnlocked = false,
  unlockedAt
}: AchievementDetailModalProps) {
  const tierStyle = TIER_COLORS[achievement.tier]
  const isLegendary = achievement.tier === 'legendary'

  // Parse criteria for display
  const getCriteriaText = () => {
    const criteria = achievement.criteria as any
    if (criteria.type === 'dream_count') {
      return `Log ${criteria.threshold} dream${criteria.threshold > 1 ? 's' : ''}`
    }
    if (criteria.type === 'streak') {
      return `Maintain a ${criteria.threshold}-day ${criteria.category} streak`
    }
    if (criteria.type === 'mood_count') {
      return `Log ${criteria.threshold} mood${criteria.threshold > 1 ? 's' : ''}`
    }
    if (criteria.type === 'journal_count') {
      return `Write ${criteria.threshold} journal entr${criteria.threshold > 1 ? 'ies' : 'y'}`
    }
    return achievement.description
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Legendary gradient background */}
        {isLegendary && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200 opacity-10 rounded-lg" />
        )}

        <div className="relative space-y-6 py-6">
          {/* Large icon */}
          <div className="text-center">
            <div className={cn(
              "text-8xl mb-4 inline-block",
              !isUnlocked && "grayscale opacity-50"
            )}>
              {achievement.icon}
            </div>

            {/* Tier badge */}
            <div className="flex justify-center mb-2">
              <Badge
                variant="secondary"
                className={cn(
                  tierStyle.bg,
                  tierStyle.text,
                  tierStyle.border,
                  "border-2 text-sm font-bold px-4 py-1"
                )}
              >
                {achievement.tier.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Name and description */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif font-bold text-gray-800">
              {achievement.name}
            </h2>
            <p className="text-gray-600">
              {achievement.description}
            </p>
          </div>

          {/* XP reward */}
          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-3 rounded-full">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-lg font-bold text-purple-700">
              +{achievement.xp_reward} XP
            </span>
            <Trophy className="w-5 h-5 text-purple-600" />
          </div>

          {/* Criteria */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">How to Unlock:</h3>
            <p className="text-sm text-gray-600">{getCriteriaText()}</p>
          </div>

          {/* Progress for locked achievements */}
          {!isUnlocked && progress > 0 && (
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Unlock date for unlocked achievements */}
          {isUnlocked && unlockedAt && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Unlocked on {new Date(unlockedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Secret achievement indicator */}
          {achievement.is_hidden && !isUnlocked && (
            <div className="text-center">
              <Badge variant="outline" className="border-purple-300 text-purple-600">
                🔒 Secret Achievement
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
