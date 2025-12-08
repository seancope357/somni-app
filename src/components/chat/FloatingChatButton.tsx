'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Brain, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingChatButtonProps {
  onClick: () => void
  isOpen: boolean
}

export default function FloatingChatButton({ onClick, isOpen }: FloatingChatButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false)

  useEffect(() => {
    // Check if user has seen the tooltip before
    const seen = localStorage.getItem('hasSeenChatTooltip')
    if (!seen) {
      // Show tooltip after 2 seconds for first-time users
      const timer = setTimeout(() => {
        setShowTooltip(true)
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setHasSeenTooltip(true)
    }
  }, [])

  const handleClick = () => {
    if (showTooltip) {
      setShowTooltip(false)
      setHasSeenTooltip(true)
      localStorage.setItem('hasSeenChatTooltip', 'true')
    }
    onClick()
  }

  const dismissTooltip = () => {
    setShowTooltip(false)
    setHasSeenTooltip(true)
    localStorage.setItem('hasSeenChatTooltip', 'true')
  }

  // Don't show button when chatbot is open
  if (isOpen) return null

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-20 right-0 w-64 mb-2 animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-2xl p-4 relative">
              <button
                onClick={dismissTooltip}
                className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="pr-6">
                <p className="font-semibold mb-1">💬 Ask me anything!</p>
                <p className="text-sm text-white/90">
                  I can analyze your sleep patterns, dream correlations, and mood trends.
                </p>
              </div>
              {/* Arrow pointing to button */}
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-gradient-to-br from-purple-600 to-indigo-600 transform rotate-45"></div>
            </div>
          </div>
        )}

        {/* Main Button */}
        <Button
          onClick={handleClick}
          className={cn(
            "h-16 w-16 rounded-full shadow-2xl transition-all duration-300 relative",
            "bg-gradient-to-r from-purple-600 to-indigo-600",
            "hover:from-purple-700 hover:to-indigo-700",
            "hover:scale-110 hover:shadow-purple-500/50",
            "group"
          )}
        >
          {/* Pulse Animation Ring */}
          <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20"></div>

          {/* Icon */}
          <Brain className="w-8 h-8 text-white relative z-10 group-hover:scale-110 transition-transform" />

          {/* Badge for first-time users */}
          {!hasSeenTooltip && !showTooltip && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          )}
        </Button>

        {/* Hover Tooltip (for users who've seen the intro) */}
        {hasSeenTooltip && (
          <div className="absolute bottom-20 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              Ask Dream Explorer
            </div>
          </div>
        )}
      </div>
    </>
  )
}
