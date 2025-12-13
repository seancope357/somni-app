'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GoalProgress, UserGoal, GoalStatus } from '@/types/gamification'

interface GoalCardProps {
  goalProgress: GoalProgress
  viewMode?: 'grid' | 'list'
  onEdit: (goal: UserGoal) => void
  onDelete: (goalId: string) => void
  onMarkComplete: (goalId: string) => void
  onMarkAbandoned: (goalId: string) => void
}

const STATUS_STYLES: Record<GoalStatus, { bg: string; text: string; border: string; icon: JSX.Element }> = {
  active: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    icon: <TrendingUp className="w-3 h-3" />
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: <CheckCircle className="w-3 h-3" />
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: <XCircle className="w-3 h-3" />
  },
  abandoned: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: <XCircle className="w-3 h-3" />
  }
}

export default function GoalCard({
  goalProgress,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onMarkComplete,
  onMarkAbandoned
}: GoalCardProps) {
  const { goal, progress_percentage, days_remaining, is_on_track } = goalProgress
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const statusStyle = STATUS_STYLES[goal.status]

  // Calculate progress bar gradient color based on percentage
  const getProgressGradient = () => {
    if (progress_percentage < 34) return 'from-red-500 to-orange-500'
    if (progress_percentage < 67) return 'from-yellow-500 to-amber-500'
    return 'from-green-500 to-emerald-500'
  }

  // Truncate description to 2 lines
  const truncateDescription = (text: string | null, maxLength: number = 80) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    } else {
      onDelete(goal.id)
      setShowDeleteConfirm(false)
    }
  }

  const isGridMode = viewMode === 'grid'

  return (
    <Card
      className={cn(
        "relative transition-all duration-300 cursor-default",
        "bg-white/80 backdrop-blur-sm border border-white/20",
        isHovered && "shadow-lg scale-102",
        goal.status === 'completed' && "border-2 border-green-400",
        goal.status === 'active' && isHovered && "border-purple-400",
        isGridMode ? "p-5" : "p-4 flex items-start gap-4"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Grid Mode Layout */}
      {isGridMode ? (
        <>
          {/* Header: Icon, Title, Status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-3xl flex-shrink-0" role="img" aria-label="Goal icon">
                {goal.icon || '🎯'}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-semibold text-gray-800 text-lg truncate">
                  {goal.title}
                </h4>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "border text-xs font-semibold flex items-center gap-1 flex-shrink-0 ml-2",
                statusStyle.bg,
                statusStyle.text,
                statusStyle.border
              )}
            >
              {statusStyle.icon}
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </Badge>
          </div>

          {/* Description */}
          {goal.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {truncateDescription(goal.description)}
            </p>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-medium">{progress_percentage}%</span>
            </div>
            <div
              className="h-3 bg-gray-200/50 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress_percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Goal progress: ${progress_percentage}%`}
            >
              <div
                className={cn(
                  "h-full bg-gradient-to-r transition-all duration-500",
                  getProgressGradient()
                )}
                style={{ width: `${progress_percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {goal.current_value} / {goal.target_value}
            </p>
          </div>

          {/* Footer: Time Remaining & On Track Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {days_remaining > 0 ? (
                  `${days_remaining} day${days_remaining !== 1 ? 's' : ''} left`
                ) : days_remaining === 0 ? (
                  'Due today'
                ) : (
                  `${Math.abs(days_remaining)} day${days_remaining !== -1 ? 's' : ''} overdue`
                )}
              </span>
            </div>
            {goal.status === 'active' && (
              <Badge
                variant={is_on_track ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  is_on_track
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-orange-100 text-orange-700 border-orange-300"
                )}
              >
                {is_on_track ? 'On Track' : 'Behind'}
              </Badge>
            )}
          </div>

          {/* Action Menu */}
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Goal actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Goal
                </DropdownMenuItem>
                {goal.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => onMarkComplete(goal.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMarkAbandoned(goal.id)}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Mark Abandoned
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {showDeleteConfirm ? 'Click again to confirm' : 'Delete Goal'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Warning for overdue goals */}
          {goal.status === 'active' && days_remaining < 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>This goal is overdue. Consider marking it complete or abandoned.</span>
            </div>
          )}
        </>
      ) : (
        /* List Mode Layout */
        <>
          {/* Icon */}
          <span className="text-4xl flex-shrink-0" role="img" aria-label="Goal icon">
            {goal.icon || '🎯'}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-semibold text-gray-800 text-lg truncate">
                  {goal.title}
                </h4>
                {goal.description && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {truncateDescription(goal.description, 120)}
                  </p>
                )}
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "border text-xs font-semibold flex items-center gap-1 flex-shrink-0 ml-4",
                  statusStyle.bg,
                  statusStyle.text,
                  statusStyle.border
                )}
              >
                {statusStyle.icon}
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </Badge>
            </div>

            {/* Progress & Stats */}
            <div className="flex items-center gap-6 mb-2">
              {/* Progress Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>{goal.current_value} / {goal.target_value}</span>
                  <span className="font-medium">{progress_percentage}%</span>
                </div>
                <div
                  className="h-2 bg-gray-200/50 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={progress_percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Goal progress: ${progress_percentage}%`}
                >
                  <div
                    className={cn(
                      "h-full bg-gradient-to-r transition-all duration-500",
                      getProgressGradient()
                    )}
                    style={{ width: `${progress_percentage}%` }}
                  />
                </div>
              </div>

              {/* Time & Status */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="whitespace-nowrap">
                    {days_remaining > 0 ? `${days_remaining}d left` : days_remaining === 0 ? 'Due today' : `${Math.abs(days_remaining)}d overdue`}
                  </span>
                </div>
                {goal.status === 'active' && (
                  <Badge
                    variant={is_on_track ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      is_on_track
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-orange-100 text-orange-700 border-orange-300"
                    )}
                  >
                    {is_on_track ? 'On Track' : 'Behind'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                aria-label="Goal actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Goal
              </DropdownMenuItem>
              {goal.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={() => onMarkComplete(goal.id)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMarkAbandoned(goal.id)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark Abandoned
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {showDeleteConfirm ? 'Click again to confirm' : 'Delete Goal'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </Card>
  )
}
