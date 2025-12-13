'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { UserGoal, GoalType, GoalPeriod } from '@/types/gamification'

interface GoalFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (goalData: GoalFormData) => Promise<void>
  editingGoal?: UserGoal | null
  userId: string
}

export interface GoalFormData {
  title: string
  description: string
  icon: string
  goalType: GoalType
  targetValue: number
  period: GoalPeriod
  customDates?: {
    start: string
    end: string
  }
}

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  dream_count: 'Dream Count',
  mood_count: 'Mood Count',
  journal_count: 'Journal Count',
  custom: 'Custom'
}

const ICON_OPTIONS = {
  dreams: ['🌙', '💤', '🛌', '✨', '🌟', '📖', '💭'],
  moods: ['😊', '😌', '😄', '💚', '❤️', '🧡', '💛'],
  journals: ['✍️', '📝', '📓', '📔', '📕', '🖊️', '📄'],
  general: ['🎯', '🏆', '⭐', '🔥', '💪', '🎉', '🚀', '💎']
}

const GOAL_PRESETS = [
  {
    title: 'Dream Journal Week',
    description: 'Log a dream every day this week',
    goalType: 'dream_count' as GoalType,
    targetValue: 7,
    period: 'weekly' as GoalPeriod,
    icon: '📖'
  },
  {
    title: 'Mood Tracking Month',
    description: 'Log your mood daily for 30 days',
    goalType: 'mood_count' as GoalType,
    targetValue: 30,
    period: 'monthly' as GoalPeriod,
    icon: '😊'
  },
  {
    title: 'Weekly Reflection',
    description: 'Write 5 journal entries this week',
    goalType: 'journal_count' as GoalType,
    targetValue: 5,
    period: 'weekly' as GoalPeriod,
    icon: '✍️'
  },
  {
    title: 'Dream Explorer',
    description: 'Log 10 dreams this month',
    goalType: 'dream_count' as GoalType,
    targetValue: 10,
    period: 'monthly' as GoalPeriod,
    icon: '🌙'
  }
]

export default function GoalFormDialog({
  isOpen,
  onClose,
  onSubmit,
  editingGoal,
  userId
}: GoalFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [goalType, setGoalType] = useState<GoalType>('dream_count')
  const [targetValue, setTargetValue] = useState(7)
  const [period, setPeriod] = useState<GoalPeriod>('weekly')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()

  // Reset form when dialog opens/closes or editing goal changes
  useEffect(() => {
    if (isOpen) {
      if (editingGoal) {
        setTitle(editingGoal.title)
        setDescription(editingGoal.description || '')
        setIcon(editingGoal.icon || '🎯')
        setGoalType(editingGoal.goal_type)
        setTargetValue(editingGoal.target_value)
        setPeriod(editingGoal.period)
        if (editingGoal.period === 'custom') {
          setCustomStartDate(new Date(editingGoal.start_date))
          setCustomEndDate(new Date(editingGoal.end_date))
        }
      } else {
        resetForm()
      }
      setErrors({})
    }
  }, [isOpen, editingGoal])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setIcon('🎯')
    setGoalType('dream_count')
    setTargetValue(7)
    setPeriod('weekly')
    setCustomStartDate(undefined)
    setCustomEndDate(undefined)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    } else if (title.trim().length > 50) {
      newErrors.title = 'Title must be less than 50 characters'
    }

    if (targetValue <= 0) {
      newErrors.targetValue = 'Target must be greater than 0'
    } else if (targetValue > 1000) {
      newErrors.targetValue = 'Target must be 1000 or less'
    }

    if (period === 'custom') {
      if (!customStartDate) {
        newErrors.customStartDate = 'Start date is required'
      }
      if (!customEndDate) {
        newErrors.customEndDate = 'End date is required'
      }
      if (customStartDate && customEndDate && customEndDate <= customStartDate) {
        newErrors.customEndDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const goalData: GoalFormData = {
        title: title.trim(),
        description: description.trim(),
        icon,
        goalType,
        targetValue,
        period,
        customDates: period === 'custom' && customStartDate && customEndDate ? {
          start: format(customStartDate, 'yyyy-MM-dd'),
          end: format(customEndDate, 'yyyy-MM-dd')
        } : undefined
      }

      await onSubmit(goalData)
      onClose()
      resetForm()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save goal' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePresetClick = (preset: typeof GOAL_PRESETS[0]) => {
    setTitle(preset.title)
    setDescription(preset.description)
    setGoalType(preset.goalType)
    setTargetValue(preset.targetValue)
    setPeriod(preset.period)
    setIcon(preset.icon)
    setCustomStartDate(undefined)
    setCustomEndDate(undefined)
    setErrors({})
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="space-y-3">
              {Object.entries(ICON_OPTIONS).map(([category, icons]) => (
                <div key={category}>
                  <p className="text-xs text-gray-500 mb-2 capitalize">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {icons.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={cn(
                          "text-2xl w-10 h-10 rounded-lg transition-all duration-200",
                          "hover:scale-110 hover:bg-purple-100",
                          icon === emoji
                            ? "bg-purple-200 ring-2 ring-purple-500 scale-110"
                            : "bg-gray-100"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Dream Journal Week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What do you want to achieve?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="goalType">Goal Type</Label>
            <Select value={goalType} onValueChange={(value) => setGoalType(value as GoalType)}>
              <SelectTrigger id="goalType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="targetValue">
              Target Value <span className="text-red-500">*</span>
            </Label>
            <Input
              id="targetValue"
              type="number"
              min="1"
              max="1000"
              value={targetValue}
              onChange={(e) => setTargetValue(parseInt(e.target.value) || 0)}
              className={errors.targetValue ? 'border-red-500' : ''}
            />
            {errors.targetValue && (
              <p className="text-sm text-red-500">{errors.targetValue}</p>
            )}
          </div>

          {/* Time Period */}
          <div className="space-y-3">
            <Label>Time Period</Label>
            <RadioGroup value={period} onValueChange={(value) => setPeriod(value as GoalPeriod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="font-normal cursor-pointer">
                  Daily (ends today)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="font-normal cursor-pointer">
                  Weekly (7 days from today)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">
                  Monthly (30 days from today)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom Date Range
                </Label>
              </div>
            </RadioGroup>

            {/* Custom Date Pickers */}
            {period === 'custom' && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground",
                          errors.customStartDate && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.customStartDate && (
                    <p className="text-sm text-red-500">{errors.customStartDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground",
                          errors.customEndDate && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        disabled={(date) => customStartDate ? date <= customStartDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.customEndDate && (
                    <p className="text-sm text-red-500">{errors.customEndDate}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preset Templates */}
          {!editingGoal && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-300" />
                <p className="text-sm text-gray-500">Or choose a preset</p>
                <div className="flex-1 border-t border-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{preset.icon}</span>
                      <h4 className="font-semibold text-sm">{preset.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600">{preset.description}</p>
                    <p className="text-xs text-purple-600 mt-2">
                      {preset.targetValue} {GOAL_TYPE_LABELS[preset.goalType].toLowerCase()} • {preset.period}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
