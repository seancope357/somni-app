'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { LifeEventCategory, CATEGORY_CONFIG, INTENSITY_COLORS } from '@/lib/life-events-config'

interface LifeEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onEventCreated?: () => void
  editEvent?: {
    id: string
    title: string
    description?: string
    category: LifeEventCategory
    intensity?: number
    date_start: string
    date_end?: string
    tags?: string[]
  }
}

export default function LifeEventDialog({ 
  open, 
  onOpenChange, 
  userId, 
  onEventCreated,
  editEvent 
}: LifeEventDialogProps) {
  const [title, setTitle] = useState(editEvent?.title || '')
  const [description, setDescription] = useState(editEvent?.description || '')
  const [category, setCategory] = useState<LifeEventCategory>(editEvent?.category || 'other')
  const [intensity, setIntensity] = useState<number | undefined>(editEvent?.intensity)
  const [dateStart, setDateStart] = useState(editEvent?.date_start || new Date().toISOString().split('T')[0])
  const [dateEnd, setDateEnd] = useState(editEvent?.date_end || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(editEvent?.tags || [])
  const [isLoading, setIsLoading] = useState(false)

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your life event.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const eventData = {
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        intensity,
        date_start: dateStart,
        date_end: dateEnd || undefined,
        tags
      }

      const url = editEvent ? `/api/life-events/${editEvent.id}` : '/api/life-events'
      const method = editEvent ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) throw new Error('Failed to save event')

      toast({
        title: editEvent ? "Event updated!" : "Event created!",
        description: "Your life event has been saved."
      })

      onOpenChange(false)
      if (onEventCreated) onEventCreated()

      // Reset form
      setTitle('')
      setDescription('')
      setCategory('other')
      setIntensity(undefined)
      setDateStart(new Date().toISOString().split('T')[0])
      setDateEnd('')
      setTags([])
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save life event. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-gray-800">
            {editEvent ? 'Edit Life Event' : 'Add Life Event'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Record significant moments that may influence your dreams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Started new job"
              className="bg-gray-50"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                const isSelected = category === key
                return (
                  <button
                    key={key}
                    onClick={() => setCategory(key as LifeEventCategory)}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${config.borderColor} ${config.bgColor}`
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? config.color : 'text-gray-400'}`} />
                    <span className={`text-xs mt-1 ${isSelected ? config.color : 'text-gray-600'}`}>
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intensity (optional)
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(intensity === level ? undefined : level)}
                  className={`flex-1 h-10 rounded-lg transition-all ${
                    intensity === level
                      ? `${INTENSITY_COLORS[level - 1]} ring-2 ring-offset-2 ring-gray-800 scale-105`
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${intensity === level ? 'text-white' : 'text-gray-600'}`}>
                    {level}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">How significant was this event?</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="bg-gray-50"
                min={dateStart}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this event..."
              className="bg-gray-50 min-h-20 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex space-x-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="bg-gray-50"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-purple-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !title.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isLoading ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
