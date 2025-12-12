'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import type { GoalType, GoalPeriod } from '@/types/gamification'

interface GoalPreset {
  title: string
  description: string
  goal_type: GoalType
  target_value: number
  period: GoalPeriod
  icon: string
}

const GOAL_PRESETS: GoalPreset[] = [
  {
    title: 'Dream Journal Week',
    description: 'Log a dream every day this week',
    goal_type: 'dream_count',
    target_value: 7,
    period: 'weekly',
    icon: '📖'
  },
  {
    title: 'Mood Tracking Month',
    description: 'Log your mood daily for 30 days',
    goal_type: 'mood_count',
    target_value: 30,
    period: 'monthly',
    icon: '😊'
  },
  {
    title: 'Weekly Reflection',
    description: 'Write 5 journal entries this week',
    goal_type: 'journal_count',
    target_value: 5,
    period: 'weekly',
    icon: '✍️'
  },
  {
    title: 'Dream Explorer',
    description: 'Log 10 dreams this month',
    goal_type: 'dream_count',
    target_value: 10,
    period: 'monthly',
    icon: '🌙'
  }
]

const EMOJI_OPTIONS = ['🎯', '📖', '🌙', '😊', '✍️', '💭', '⭐', '🔥', '💪', '🌟', '🎨', '🧠', '💡', '🌸', '🦋', '🌈']

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  dream_count: 'Dream Entries',
  mood_count: 'Mood Logs',
  journal_count: 'Journal Entries',
  custom: 'Custom Goal'
}

interface GoalCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onGoalCreated: () => void
  editGoal?: any // For editing existing goals
}

export default function GoalCreationDialog({
  isOpen,
  onClose,
  userId,
  onGoalCreated,
  editGoal
}: GoalCreationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates')

  // Form state
  const [title, setTitle] = useState(editGoal?.title || '')
  const [description, setDescription] = useState(editGoal?.description || '')
  const [goalType, setGoalType] = useState<GoalType>(editGoal?.goal_type || 'dream_count')
  const [targetValue, setTargetValue] = useState(editGoal?.target_value || 7)
  const [period, setPeriod] = useState<GoalPeriod>(editGoal?.period || 'weekly')
  const [icon, setIcon] = useState(editGoal?.icon || '🎯')
  const [startDate, setStartDate] = useState<Date | undefined>(
    editGoal?.start_date ? new Date(editGoal.start_date) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    editGoal?.end_date ? new Date(editGoal.end_date) : undefined
  )

  const handlePresetSelect = (preset: GoalPreset) => {
    setTitle(preset.title)
    setDescription(preset.description)
    setGoalType(preset.goal_type)
    setTargetValue(preset.target_value)
    setPeriod(preset.period)
    setIcon(preset.icon)
    setActiveTab('custom')
  }

  const handleSubmit = async () => {
    if (!title || !targetValue || targetValue <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and valid target value',
        variant: 'destructive'
      })
      return
    }

    if (period === 'custom' && (!startDate || !endDate)) {
      toast({
        title: 'Missing Dates',
        description: 'Please select start and end dates for custom period',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      const payload: any = {
        userId,
        goalType,
        targetValue,
        period,
        title,
        description: description || null,
        icon
      }

      if (period === 'custom' && startDate && endDate) {
        payload.customDates = {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        }
      }

      if (editGoal) {
        // Update existing goal
        const response = await fetch('/api/gamification/goals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            goalId: editGoal.id,
            updates: {
              title,
              description: description || null,
              icon,
              target_value: targetValue
            }
          })
        })

        const result = await response.json()

        if (!response.ok) throw new Error(result.error)

        toast({
          title: 'Goal Updated!',
          description: 'Your goal has been updated successfully'
        })
      } else {
        // Create new goal
        const response = await fetch('/api/gamification/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const result = await response.json()

        if (!response.ok) throw new Error(result.error)

        toast({
          title: 'Goal Created!',
          description: `"${title}" is now active`,
          duration: 3000
        })
      }

      onGoalCreated()
      handleClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save goal',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setTitle('')
    setDescription('')
    setGoalType('dream_count')
    setTargetValue(7)
    setPeriod('weekly')
    setIcon('🎯')
    setStartDate(undefined)
    setEndDate(undefined)
    setActiveTab('templates')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            {editGoal ? 'Edit Goal' : 'Create New Goal'}
          </DialogTitle>
          <DialogDescription>
            {editGoal
              ? 'Update your goal details'
              : 'Choose a template or create a custom goal to track your progress'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" disabled={!!editGoal}>Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">Quick-start with a preset goal:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GOAL_PRESETS.map((preset, index) => (
                <Card
                  key={index}
                  className="p-4 hover:border-purple-400 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{preset.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{preset.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {preset.target_value} {GOAL_TYPE_LABELS[preset.goal_type]}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                          {preset.period}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Custom Tab */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                      icon === emoji
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Dream Journal Week"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What do you want to achieve?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Goal Type */}
            <div className="space-y-2">
              <Label>Goal Type *</Label>
              <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)} disabled={!!editGoal}>
                <SelectTrigger>
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
              <Label htmlFor="target">Target Value *</Label>
              <Input
                id="target"
                type="number"
                min="1"
                placeholder="e.g., 7"
                value={targetValue}
                onChange={(e) => setTargetValue(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label>Time Period *</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)} disabled={!!editGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {period === 'custom' && !editGoal && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : editGoal ? 'Update Goal' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
