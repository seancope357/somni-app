'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle, BookOpen, Search, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import JournalEntryCard from './JournalEntryCard'
import JournalEntryDialog from './JournalEntryDialog'
import SmartPrompts from '@/components/prompts/SmartPrompts'

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
  dreams?: any
}

interface JournalViewProps {
  userId: string
}

export default function JournalView({ userId }: JournalViewProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [dreams, setDreams] = useState<Array<{ id: string; content: string; created_at: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  useEffect(() => {
    fetchEntries()
    fetchDreams()
  }, [userId])

  const fetchEntries = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/journal?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load journal entries',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDreams = async () => {
    try {
      const response = await fetch(`/api/dreams-supabase?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setDreams(data.map((d: any) => ({
          id: d.id,
          content: d.content,
          created_at: d.created_at
        })))
      }
    } catch (error) {
      console.error('Failed to fetch dreams:', error)
    }
  }

  const handleCreateNew = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleDelete = (entryId: string) => {
    setEntries(entries.filter(e => e.id !== entryId))
  }

  const handleSave = () => {
    fetchEntries()
  }

  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase()
    return (
      entry.title?.toLowerCase().includes(searchLower) ||
      entry.content.toLowerCase().includes(searchLower) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchLower))
    )
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-purple-200 mt-4">Loading journal...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif text-white">Journal</h2>
          <p className="text-sm text-purple-200">Your personal reflections and insights</p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Smart Prompts */}
      <div className="mb-6">
        <SmartPrompts userId={userId} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
        <input
          type="text"
          placeholder="Search entries, tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        {searchTerm && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white"
            onClick={() => setSearchTerm('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <Card className="border-0 bg-white/10 backdrop-blur-lg rounded-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <BookOpen className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <h3 className="text-white font-serif text-lg mb-2">
              {searchTerm ? 'No entries found' : 'No journal entries yet'}
            </h3>
            <p className="text-purple-200 text-sm mb-4">
              {searchTerm
                ? 'Try a different search term'
                : 'Start journaling to record your thoughts and reflections'}
            </p>
            {!searchTerm && (
              <Button
                onClick={handleCreateNew}
                variant="outline"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create First Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <JournalEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={userId}
        entry={editingEntry}
        dreams={dreams}
        onSave={handleSave}
      />
    </div>
  )
}
