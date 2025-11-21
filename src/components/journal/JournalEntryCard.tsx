'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Calendar, Tag, Heart, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface JournalEntry {
  id: string
  user_id: string
  dream_id: string | null
  title: string | null
  content: string
  tags: string[]
  mood_rating: number | null
  created_at: string
  updated_at: string
  dreams?: {
    id: string
    content: string
    interpretation: string
    symbols: string[]
    emotions: string[]
    themes: string[]
    sleep_hours: number | null
  } | null
}

interface JournalEntryCardProps {
  entry: JournalEntry
  onEdit: (entry: JournalEntry) => void
  onDelete: (entryId: string) => void
}

export default function JournalEntryCard({ entry, onEdit, onDelete }: JournalEntryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showDream, setShowDream] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMoodEmoji = (rating: number | null) => {
    if (!rating) return null
    const emojis = ['😢', '😕', '😐', '😊', '😄']
    return emojis[rating - 1]
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/journal/${entry.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete journal entry')
      }

      toast({
        title: 'Journal entry deleted',
        description: 'Your entry has been removed successfully'
      })

      onDelete(entry.id)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete journal entry',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {entry.title && (
              <CardTitle className="text-lg font-serif text-gray-800 mb-1">
                {entry.title}
              </CardTitle>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(entry.created_at)}
              {entry.created_at !== entry.updated_at && (
                <span className="text-gray-400">(edited)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entry.mood_rating && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full">
                <Heart className="w-3 h-3 text-purple-600" />
                <span className="text-lg">{getMoodEmoji(entry.mood_rating)}</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(entry)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Content */}
        <div className={`text-sm text-gray-700 whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>
          {entry.content}
        </div>
        
        {entry.content.length > 200 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-purple-600 hover:text-purple-700 p-0 h-auto"
          >
            {expanded ? 'Show less' : 'Read more'}
          </Button>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <Tag className="w-3 h-3 text-gray-400" />
            {entry.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Linked Dream */}
        {entry.dreams && (
          <div className="pt-3 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDream(!showDream)}
              className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
            >
              {showDream ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDream ? 'Hide' : 'Show'} linked dream
            </Button>
            
            {showDream && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg space-y-2">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {entry.dreams.content}
                </p>
                {entry.dreams.interpretation && (
                  <p className="text-xs text-gray-600 italic line-clamp-2">
                    {entry.dreams.interpretation}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {entry.dreams.symbols?.slice(0, 3).map((symbol, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                      {symbol}
                    </Badge>
                  ))}
                  {entry.dreams.emotions?.slice(0, 2).map((emotion, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                      {emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
