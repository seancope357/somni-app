'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SimilarDream {
  id: string
  content: string
  interpretation: string
  symbols: string[]
  emotions: string[]
  themes: string[]
  sleep_hours: number | null
  created_at: string
  similarity_score: number
}

interface SimilarDreamsProps {
  dreamId: string
  userId: string
}

export default function SimilarDreams({ dreamId, userId }: SimilarDreamsProps) {
  const [similarDreams, setSimilarDreams] = useState<SimilarDream[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { toast } = useToast()

  const findSimilarDreams = async () => {
    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/similar-dreams?dreamId=${dreamId}&userId=${userId}&limit=5`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to find similar dreams')
      }

      const data = await response.json()
      setSimilarDreams(data.similar_dreams || [])

      if (data.similar_dreams.length === 0) {
        toast({
          title: 'No similar dreams found',
          description: 'Generate embeddings for more dreams to enable similarity search.',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.9) return { label: 'Very Similar', color: 'bg-green-500' }
    if (score >= 0.8) return { label: 'Similar', color: 'bg-blue-500' }
    if (score >= 0.7) return { label: 'Somewhat Similar', color: 'bg-yellow-500' }
    return { label: 'Related', color: 'bg-gray-500' }
  }

  return (
    <div className="space-y-4">
      {!hasSearched && (
        <Button
          onClick={findSimilarDreams}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? 'Finding Similar Dreams...' : 'Find Similar Dreams'}
        </Button>
      )}

      {hasSearched && similarDreams.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Similar Dreams</h3>
            <Button
              onClick={findSimilarDreams}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              Refresh
            </Button>
          </div>

          {similarDreams.map((dream) => {
            const similarity = getSimilarityLabel(dream.similarity_score)
            return (
              <Card key={dream.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(dream.created_at)}
                    </div>
                    <Badge className={`${similarity.color} text-white text-xs`}>
                      {similarity.label} ({Math.round(dream.similarity_score * 100)}%)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm line-clamp-3">{dream.content}</p>
                  
                  {dream.interpretation && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      {dream.interpretation}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {dream.symbols.slice(0, 3).map((symbol, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {symbol}
                      </Badge>
                    ))}
                    {dream.emotions.slice(0, 2).map((emotion, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {emotion}
                      </Badge>
                    ))}
                  </div>

                  {dream.sleep_hours && (
                    <p className="text-xs text-muted-foreground">
                      Sleep: {dream.sleep_hours}h
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {hasSearched && similarDreams.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No similar dreams found. Make sure embeddings have been generated for your dreams.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
