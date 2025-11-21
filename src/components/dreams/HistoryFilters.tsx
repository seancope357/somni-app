'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Filter, X, ArrowUpDown } from 'lucide-react'

interface HistoryFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void
  totalResults: number
}

export interface FilterOptions {
  dateRange: { start: string; end: string } | null
  moodLevel: number | null
  hasLinkedEvents: boolean | null
  sortBy: 'date-desc' | 'date-asc' | 'sleep-desc' | 'sleep-asc'
}

export default function HistoryFilters({ onFiltersChange, totalResults }: HistoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: null,
    moodLevel: null,
    hasLinkedEvents: null,
    sortBy: 'date-desc'
  })

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFiltersChange(updated)
  }

  const clearFilters = () => {
    const defaults: FilterOptions = {
      dateRange: null,
      moodLevel: null,
      hasLinkedEvents: null,
      sortBy: 'date-desc'
    }
    setFilters(defaults)
    onFiltersChange(defaults)
  }

  const hasActiveFilters = 
    filters.dateRange !== null || 
    filters.moodLevel !== null || 
    filters.hasLinkedEvents !== null ||
    filters.sortBy !== 'date-desc'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="bg-white/20 text-white border-white/30 hover:bg-white/30"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 bg-purple-500 text-white">
              Active
            </Badge>
          )}
        </Button>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as FilterOptions['sortBy'] })}
            className="bg-white/20 text-white text-sm border border-white/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="date-desc" className="bg-gray-800">Newest First</option>
            <option value="date-asc" className="bg-gray-800">Oldest First</option>
            <option value="sleep-desc" className="bg-gray-800">Most Sleep</option>
            <option value="sleep-asc" className="bg-gray-800">Least Sleep</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-purple-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="border-0 bg-white/10 backdrop-blur-lg">
          <CardContent className="pt-4 space-y-4">
            {/* Date Range Filter */}
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => updateFilters({
                    dateRange: {
                      start: e.target.value,
                      end: filters.dateRange?.end || e.target.value
                    }
                  })}
                  className="bg-white/20 text-white text-sm border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => updateFilters({
                    dateRange: {
                      start: filters.dateRange?.start || e.target.value,
                      end: e.target.value
                    }
                  })}
                  className="bg-white/20 text-white text-sm border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Mood Level Filter */}
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Mood Level (from daily logs)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    variant={filters.moodLevel === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilters({
                      moodLevel: filters.moodLevel === level ? null : level
                    })}
                    className={filters.moodLevel === level 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                    }
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Linked Events Filter */}
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Life Events
              </label>
              <div className="flex gap-2">
                <Button
                  variant={filters.hasLinkedEvents === true ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilters({
                    hasLinkedEvents: filters.hasLinkedEvents === true ? null : true
                  })}
                  className={filters.hasLinkedEvents === true
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                  }
                >
                  Has Events
                </Button>
                <Button
                  variant={filters.hasLinkedEvents === false ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilters({
                    hasLinkedEvents: filters.hasLinkedEvents === false ? null : false
                  })}
                  className={filters.hasLinkedEvents === false
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                  }
                >
                  No Events
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/20">
              <p className="text-xs text-purple-200">
                Showing {totalResults} result{totalResults !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
