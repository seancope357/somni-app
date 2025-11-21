'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Calendar, Tag } from 'lucide-react'
import { LifeEvent, CATEGORY_CONFIG, INTENSITY_COLORS } from '@/lib/life-events-config'
import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface LifeEventCardProps {
  event: LifeEvent
  onEdit: (event: LifeEvent) => void
  onDelete: (eventId: string) => void
}

export default function LifeEventCard({ event, onEdit, onDelete }: LifeEventCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const categoryConfig = CATEGORY_CONFIG[event.category]
  const CategoryIcon = categoryConfig.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/life-events/${event.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete event')

      toast({
        title: "Event deleted",
        description: "Life event has been removed."
      })

      onDelete(event.id)
      setShowDeleteDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className={`${categoryConfig.bgColor} border-2 ${categoryConfig.borderColor} hover:shadow-lg transition-shadow`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className={`p-1.5 sm:p-2 rounded-lg ${categoryConfig.bgColor} border ${categoryConfig.borderColor} flex-shrink-0`}>
                <CategoryIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${categoryConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-gray-800 mb-1 break-words">{event.title}</h3>
                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{formatDate(event.date_start)}</span>
                  {event.date_end && (
                    <>
                      <span className="hidden sm:inline">→</span>
                      <span className="sm:hidden">-</span>
                      <span className="whitespace-nowrap">{formatDate(event.date_end)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(event)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/50"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
              </Button>
            </div>
          </div>

          {event.intensity && (
            <div className="mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">Intensity:</span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-6 h-2 rounded-full ${
                        level <= (event.intensity || 0)
                          ? INTENSITY_COLORS[level - 1]
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {event.description && (
            <p className="text-xs sm:text-sm text-gray-700 mb-3 leading-relaxed break-words">
              {event.description}
            </p>
          )}

          {event.tags && event.tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              <Tag className="w-3 h-3 text-gray-500" />
              {event.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-white/50 text-gray-700"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200">
            <Badge
              variant="outline"
              className={`text-xs ${categoryConfig.color} border-current`}
            >
              {categoryConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Life Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
