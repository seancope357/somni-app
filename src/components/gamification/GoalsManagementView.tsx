'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Target,
  Plus,
  Filter,
  Grid3x3,
  List,
  Trophy,
  CheckCircle2,
  Loader2,
  Sparkles
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import GoalCard from './GoalCard'
import GoalCreationDialog from './GoalCreationDialog'
import type { GoalProgress, UserGoal, GoalStatus, GoalType } from '@/types/gamification'

interface GoalsManagementViewProps {
  userId: string
}

export default function GoalsManagementView({ userId }: GoalsManagementViewProps) {
  const [goals, setGoals] = useState<GoalProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('active')
  const [typeFilter, setTypeFilter] = useState<GoalType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null)

  useEffect(() => {
    fetchGoals()
  }, [userId, statusFilter, typeFilter])

  const fetchGoals = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ userId, status: statusFilter })
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/gamification/goals?${params}`)
      const result = await response.json()

      if (response.ok) {
        setGoals(result.goals || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error loading goals',
        description: error.message || 'Failed to fetch goals',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (goal: UserGoal) => {
    setEditingGoal(goal)
    setShowCreateDialog(true)
  }

  const handleDelete = async (goalId: string) => {
    try {
      const response = await fetch(`/api/gamification/goals?userId=${userId}&goalId=${goalId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast({
        title: 'Goal deleted',
        description: 'Goal has been removed'
      })

      fetchGoals()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete goal',
        variant: 'destructive'
      })
    }
  }

  const handleMarkComplete = async (goalId: string) => {
    try {
      const response = await fetch('/api/gamification/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          goalId,
          updates: { status: 'completed', completed_at: new Date().toISOString() }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast({
        title: 'Goal completed!',
        description: 'Congratulations on reaching your goal!',
        duration: 5000
      })

      fetchGoals()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update goal',
        variant: 'destructive'
      })
    }
  }

  const handleMarkAbandoned = async (goalId: string) => {
    try {
      const response = await fetch('/api/gamification/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          goalId,
          updates: { status: 'abandoned' }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast({
        title: 'Goal abandoned',
        description: 'Goal has been marked as abandoned'
      })

      fetchGoals()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update goal',
        variant: 'destructive'
      })
    }
  }

  const handleDialogClose = () => {
    setShowCreateDialog(false)
    setEditingGoal(null)
  }

  const handleGoalCreated = () => {
    fetchGoals()
    handleDialogClose()
  }

  const filteredGoals = goals

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-400" />
            Goals Management
          </h2>
          <p className="text-sm text-purple-200 mt-1">Track and manage your personal goals</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Filters and View Controls */}
      <Card className="p-4 bg-white/10 backdrop-blur-lg border-white/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-purple-300" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dream_count">Dream Entries</SelectItem>
                <SelectItem value="mood_count">Mood Logs</SelectItem>
                <SelectItem value="journal_count">Journal Entries</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-purple-600' : 'bg-white/10 border-white/20 text-white'}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-purple-600' : 'bg-white/10 border-white/20 text-white'}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Goals Display */}
      {filteredGoals.length === 0 ? (
        <Card className="p-12 text-center bg-white/10 backdrop-blur-lg border-white/20">
          <Target className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-xl font-serif font-semibold text-white mb-2">
            {statusFilter === 'active' ? 'No Active Goals' : 'No Goals Found'}
          </h3>
          <p className="text-purple-200 mb-6 max-w-md mx-auto">
            {statusFilter === 'active'
              ? 'Create your first goal to start tracking your progress!'
              : 'Try adjusting your filters or create a new goal.'}
          </p>
          {statusFilter === 'active' && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          )}
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredGoals.map((goalProgress) => (
            <GoalCard
              key={goalProgress.goal.id}
              goalProgress={goalProgress}
              viewMode={viewMode}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkComplete={handleMarkComplete}
              onMarkAbandoned={handleMarkAbandoned}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <GoalCreationDialog
        isOpen={showCreateDialog}
        onClose={handleDialogClose}
        userId={userId}
        onGoalCreated={handleGoalCreated}
        editGoal={editingGoal}
      />
    </div>
  )
}
