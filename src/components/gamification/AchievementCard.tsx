'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Check, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement, AchievementTier } from '@/types/gamification'
import { TIER_COLORS } from '@/types/gamification'

interface AchievementCardProps {
  achievement: Achievement
  isUnlocked?: boolean
  unlockedAt?: string | null
  progress?: number // 0-100
  showProgress?: boolean
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
}

export default function AchievementCard({
  achievement,
  isUnlocked = false,
  unlockedAt,
  progress = 0,
  showProgress = true,
  size = 'medium',
  onClick
}: AchievementCardProps) {
  const tierStyle = TIER_COLORS[achievement.tier]
  const isLegendary = achievement.tier === 'legendary'

  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6'
  }

  const iconSizes = {
    small: 'text-3xl',
    medium: 'text-4xl',
    large: 'text-5xl'
  }

  return (
    <Card
      className={cn(
        "relative transition-all duration-300 cursor-pointer",
        sizeClasses[size],
        isUnlocked ? "hover:shadow-lg hover:scale-105" : "opacity-60 grayscale",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Legendary Gradient Background */}
      {isLegendary && isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200 opacity-20 rounded-lg" />
      )}

      {/* Tier Badge */}
      <div className="absolute top-2 right-2">
        <Badge
          variant="secondary"
          className={cn(
            tierStyle.bg,
            tierStyle.text,
            tierStyle.border,
            "border text-xs font-semibold"
          )}
        >
          {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
        </Badge>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center text-center gap-3">
        {/* Icon */}
        <div className={cn("relative", iconSizes[size])}>
          {achievement.icon}
          {isUnlocked && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Name & Description */}
        <div>
          <h4 className={cn(
            "font-serif font-semibold",
            size === 'small' ? 'text-sm' : size === 'medium' ? 'text-base' : 'text-lg',
            isUnlocked ? 'text-gray-800' : 'text-gray-500'
          )}>
            {achievement.name}
          </h4>
          <p className={cn(
            "text-gray-600 mt-1",
            size === 'small' ? 'text-xs' : 'text-sm'
          )}>
            {achievement.description}
          </p>
        </div>

        {/* XP Reward */}
        <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
          <TrendingUp className="w-3 h-3" />
          <span>+{achievement.xp_reward} XP</span>
        </div>

        {/* Progress Bar (if not unlocked) */}
        {!isUnlocked && showProgress && progress > 0 && (
          <div className="w-full mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Unlocked Date */}
        {isUnlocked && unlockedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Unlocked {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}

        {/* Secret Achievement Hint */}
        {achievement.is_hidden && !isUnlocked && (
          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 mt-2">
            Secret Achievement
          </Badge>
        )}
      </div>
    </Card>
  )
}
