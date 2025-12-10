'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, TrendingUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement, CelebrationEvent } from '@/types/gamification'
import { TIER_COLORS } from '@/types/gamification'

interface CelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  celebrations: CelebrationEvent[]
  newAchievements?: Achievement[]
}

export default function CelebrationModal({
  isOpen,
  onClose,
  celebrations,
  newAchievements = []
}: CelebrationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0)
      setIsAnimating(true)

      // Trigger confetti or fireworks
      if (celebrations[0]?.animation === 'confetti') {
        triggerConfetti()
      } else if (celebrations[0]?.animation === 'fireworks') {
        triggerFireworks()
      }
    }
  }, [isOpen])

  const currentCelebration = celebrations[currentIndex]
  const hasMore = currentIndex < celebrations.length - 1

  const handleNext = () => {
    if (hasMore) {
      setCurrentIndex(prev => prev + 1)
      setIsAnimating(true)
    } else {
      onClose()
    }
  }

  const triggerConfetti = () => {
    // Simple confetti effect (in production, use library like canvas-confetti)
    const confettiCount = 50
    const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div')
      confetti.className = 'absolute w-2 h-2 rounded-full animate-fall'
      confetti.style.left = `${Math.random() * 100}%`
      confetti.style.top = `-20px`
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.animationDelay = `${Math.random() * 0.5}s`
      confetti.style.animationDuration = `${1 + Math.random()}s`

      document.body.appendChild(confetti)
      setTimeout(() => confetti.remove(), 2000)
    }
  }

  const triggerFireworks = () => {
    // Simple firework effect
    console.log('🎆 Fireworks!')
  }

  if (!currentCelebration) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <style jsx global>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
          .animate-fall {
            animation: fall linear forwards;
          }
        `}</style>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Content */}
        <div className="flex flex-col items-center text-center py-8 px-4">
          {/* Icon */}
          <div className={cn(
            "text-7xl mb-4 transition-all duration-500",
            isAnimating && (
              currentCelebration.animation === 'pulse' ? 'animate-pulse' :
              currentCelebration.animation === 'glow' ? 'animate-bounce' :
              'animate-bounce'
            )
          )}>
            {currentCelebration.icon}
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold font-serif text-gray-800 mb-2">
            {currentCelebration.title}
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-6">
            {currentCelebration.description}
          </p>

          {/* XP Reward */}
          {currentCelebration.xp_reward && currentCelebration.xp_reward > 0 && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-3 rounded-full mb-6">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="text-xl font-bold text-purple-700">
                +{currentCelebration.xp_reward} XP
              </span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          )}

          {/* Achievement Details (if achievement unlock) */}
          {currentCelebration.type === 'achievement' && newAchievements[currentIndex] && (
            <div className="w-full p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-4xl">{newAchievements[currentIndex].icon}</span>
                <div className="text-left">
                  <h3 className="font-serif font-semibold text-gray-800">
                    {newAchievements[currentIndex].name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {newAchievements[currentIndex].description}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  TIER_COLORS[newAchievements[currentIndex].tier].bg,
                  TIER_COLORS[newAchievements[currentIndex].tier].text,
                  "text-xs font-semibold"
                )}
              >
                {newAchievements[currentIndex].tier.toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Progress Indicator */}
          {celebrations.length > 1 && (
            <div className="flex items-center gap-2 mb-6">
              {celebrations.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    idx === currentIndex
                      ? "bg-purple-600 w-6"
                      : idx < currentIndex
                      ? "bg-purple-400"
                      : "bg-gray-300"
                  )}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              size="lg"
            >
              {hasMore ? 'Next' : 'Awesome!'}
            </Button>
          </div>

          {/* Skip Option */}
          {hasMore && (
            <button
              onClick={onClose}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip remaining ({celebrations.length - currentIndex - 1})
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
