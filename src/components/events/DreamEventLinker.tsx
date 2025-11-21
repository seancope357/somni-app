'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link2, Plus, X } from 'lucide-react'
import { LifeEvent, CATEGORY_CONFIG } from '@/lib/life-events-config'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DreamEventLinkerProps {
  dreamId: string
  userId: string
}

export default function DreamEventLinker({ dreamId, userId }: DreamEventLinkerProps) {
  const [linkedEvents, setLinkedEvents] = useState<LifeEvent[]>([])
  const [availableEvents, setAvailableEvents] = useState<LifeEvent[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchLinkedEvents()
  }, [dreamId])

  const fetchLinkedEvents = async () => {
    try {
      const response = await fetch(`/api/dream-links?dreamId=${dreamId}&userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setLinkedEvents(data)
      }
    } catch (error) {
      console.error('Failed to fetch linked events:', error)
    }
  }

  const fetchAvailableEvents = async () => {
    try {
      const response = await fetch(`/api/life-events?userId=${userId}`)
      if (response.ok) {
        const allEvents = await response.json()
        // Filter out already linked events
        const linkedIds = linkedEvents.map(e => e.id)
        const available = allEvents.filter((e: LifeEvent) => !linkedIds.includes(e.id))
        setAvailableEvents(available)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch life events",
        variant: "destructive"
      })
    }
  }

  const handleLinkEvent = async (eventId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dream-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId, lifeEventId: eventId, userId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to link event')
      }

      toast({
        title: "Event linked",
        description: "Life event has been linked to this dream"
      })

      fetchLinkedEvents()
      setShowDialog(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link event",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlinkEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/dream-links?dreamId=${dreamId}&lifeEventId=${eventId}&userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to unlink event')

      toast({
        title: "Event unlinked",
        description: "Life event has been unlinked from this dream"
      })

      setLinkedEvents(linkedEvents.filter(e => e.id !== eventId))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink event",
        variant: "destructive"
      })
    }
  }

  const handleOpenDialog = () => {
    fetchAvailableEvents()
    setShowDialog(true)
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Link2 className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Linked Events</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          className="h-6 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Link
        </Button>
      </div>

      {linkedEvents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {linkedEvents.map((event) => {
            const categoryConfig = CATEGORY_CONFIG[event.category]
            const CategoryIcon = categoryConfig.icon
            return (
              <Badge
                key={event.id}
                variant="outline"
                className={`${categoryConfig.color} border-current`}
              >
                <CategoryIcon className="w-3 h-3 mr-1" />
                {event.title}
                <button
                  onClick={() => handleUnlinkEvent(event.id)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">No linked events</p>
      )}

      {/* Link Event Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-gray-800">
              Link Life Event
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Associate this dream with a significant life event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            {availableEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No available events to link</p>
                <p className="text-sm text-gray-500">Create life events in the Events tab</p>
              </div>
            ) : (
              availableEvents.map((event) => {
                const categoryConfig = CATEGORY_CONFIG[event.category]
                const CategoryIcon = categoryConfig.icon
                return (
                  <button
                    key={event.id}
                    onClick={() => handleLinkEvent(event.id)}
                    disabled={isLoading}
                    className={`w-full text-left p-3 rounded-lg border-2 ${categoryConfig.borderColor} ${categoryConfig.bgColor} hover:shadow-md transition-all disabled:opacity-50`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${categoryConfig.bgColor} border ${categoryConfig.borderColor}`}>
                        <CategoryIcon className={`w-4 h-4 ${categoryConfig.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{event.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(event.date_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
