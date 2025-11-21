'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface JournalEntry {
  id?: string
  user_id: string
  dream_id: string | null
  title: string | null
  content: string
  tags: string[]
  mood_rating: number | null
  created_at?: string
  updated_at?: string
}

interface JournalEntryDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  entry?: JournalEntry | null
  dreams?: Array<{ id: string; content: string; created_at: string }>
  preselectedDreamId?: string | null
  onSave: () => void
}

export default function JournalEntryDialog({
  open,
  onClose,
  userId,
  entry,
  dreams = [],
  preselectedDreamId,
  onSave
}: JournalEntryDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [moodRating, setMoodRating] = useState<number | null>(null)
  const [selectedDreamId, setSelectedDreamId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      // Reset or populate form based on entry
      if (entry) {
        setTitle(entry.title || '')
        setContent(entry.content)
        setTags(entry.tags || [])
        setMoodRating(entry.mood_rating)
        setSelectedDreamId(entry.dream_id)
      } else {
        setTitle('')
        setContent('')
        setTags([])
        setMoodRating(null)
        setSelectedDreamId(preselectedDreamId || null)
      }
      setTagInput('')
    }
  }, [open, entry, preselectedDreamId])

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please write some content for your journal entry',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)
    try {
      const method = entry?.id ? 'PUT' : 'POST'
      const url = entry?.id ? `/api/journal/${entry.id}` : '/api/journal'

      const body: any = {
        content: content.trim(),
        title: title.trim() || null,
        tags,
        moodRating
      }

      if (!entry?.id) {
        body.userId = userId
        body.dreamId = selectedDreamId
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to save journal entry')
      }

      toast({
        title: entry?.id ? 'Entry updated' : 'Entry created',
        description: 'Your journal entry has been saved successfully'
      })

      onSave()
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save journal entry. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const moodEmojis = [
    { value: 1, emoji: '😢', label: 'Very Bad' },
    { value: 2, emoji: '😕', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Neutral' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '😄', label: 'Great' }
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            {entry?.id ? 'Edit Journal Entry' : 'New Journal Entry'}
          </DialogTitle>
          <DialogDescription>
            {entry?.id ? 'Update your journal entry' : 'Record your thoughts and reflections'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your entry a title..."
              className="mt-1.5"
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content" className="text-sm font-medium">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts, reflections, or insights..."
              className="mt-1.5 min-h-[200px] resize-none"
            />
          </div>

          {/* Dream Selection */}
          {!entry?.id && dreams.length > 0 && (
            <div>
              <Label htmlFor="dream" className="text-sm font-medium">Link to Dream (optional)</Label>
              <select
                id="dream"
                value={selectedDreamId || ''}
                onChange={(e) => setSelectedDreamId(e.target.value || null)}
                className="mt-1.5 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">None - Standalone entry</option>
                {dreams.map((dream) => (
                  <option key={dream.id} value={dream.id}>
                    {dream.content.substring(0, 60)}... ({new Date(dream.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tags (press Enter)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Mood Rating */}
          <div>
            <Label className="text-sm font-medium mb-3 block">How are you feeling?</Label>
            <div className="flex gap-2 justify-between">
              {moodEmojis.map((mood) => (
                <Button
                  key={mood.value}
                  type="button"
                  variant={moodRating === mood.value ? 'default' : 'outline'}
                  onClick={() => setMoodRating(mood.value)}
                  className="flex-1 flex flex-col items-center gap-1 h-auto py-3"
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-xs">{mood.label}</span>
                </Button>
              ))}
            </div>
            {moodRating && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMoodRating(null)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Clear rating
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
