'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Filter, Calendar } from 'lucide-react'
import { LifeEvent, CATEGORY_CONFIG, LifeEventCategory } from '@/lib/life-events-config'
import LifeEventCard from './LifeEventCard'
import LifeEventDialog from './LifeEventDialog'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

interface LifeEventsTimelineProps {
  userId: string
}

export default function LifeEventsTimeline({ userId }: LifeEventsTimelineProps) {
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<LifeEvent | undefined>()
  const [filterCategory, setFilterCategory] = useState<LifeEventCategory | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [userId])

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/life-events?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch life events",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (event: LifeEvent) => {
    setEditingEvent(event)
    setShowDialog(true)
  }

  const handleDelete = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId))
  }

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open)
    if (!open) {
      setEditingEvent(undefined)
    }
  }

  const handleEventCreated = () => {
    fetchEvents()
    setEditingEvent(undefined)
  }

  // Filter events
  const filteredEvents = events.filter(event => 
    filterCategory === 'all' || event.category === filterCategory
  )

  // Group events by month/year
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = new Date(event.date_start)
    const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(event)
    return acc
  }, {} as Record<string, LifeEvent[]>)

  return (
    <div className="space-y-4">
      {/* Header with actions - Mobile optimized */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-serif text-gray-800">Life Events</h2>
            <p className="text-xs sm:text-sm text-gray-600">Track moments that influence your dreams</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex-shrink-0"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="bg-white/80 w-full sm:w-auto"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter by Category
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterCategory('all')}
            >
              All Events
            </Badge>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon
              return (
                <Badge
                  key={key}
                  variant={filterCategory === key ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    filterCategory === key ? config.color : 'text-gray-600'
                  }`}
                  onClick={() => setFilterCategory(key as LifeEventCategory)}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur rounded-lg border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {filterCategory === 'all' ? 'No life events yet' : 'No events in this category'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filterCategory === 'all' 
              ? 'Start tracking significant moments that may influence your dreams'
              : 'Try selecting a different category or add a new event'
            }
          </p>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Event
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([period, periodEvents]) => (
            <div key={period}>
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {period}
                </div>
                <div className="flex-1 h-px bg-gray-200 ml-4"></div>
              </div>
              <div className="space-y-3 ml-4">
                {periodEvents
                  .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())
                  .map(event => (
                    <LifeEventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog for creating/editing events */}
      <LifeEventDialog
        open={showDialog}
        onOpenChange={handleDialogClose}
        userId={userId}
        onEventCreated={handleEventCreated}
        editEvent={editingEvent}
      />
    </div>
  )
}
