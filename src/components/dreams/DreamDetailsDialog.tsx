'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Moon, Brain, Heart, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Dream {
  id: string
  content: string
  interpretation: string
  sleep_hours: number | null
  symbols: string[]
  emotions: string[]
  themes: string[]
  created_at: string
}

interface DreamDetailsDialogProps {
  dream: Dream | null
  open: boolean
  onClose: () => void
}

export default function DreamDetailsDialog({ dream, open, onClose }: DreamDetailsDialogProps) {
  if (!dream) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Moon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-serif text-gray-800 mb-2">
                Dream Analysis
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(dream.created_at)}</span>
                </div>
                {dream.sleep_hours && (
                  <div className="flex items-center gap-1">
                    <Moon className="w-4 h-4" />
                    <span>{dream.sleep_hours}h sleep</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Dream Content */}
            <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-800">Your Dream</h3>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {dream.content}
                </p>
              </CardContent>
            </Card>

            {/* Interpretation */}
            <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Interpretation</h3>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {dream.interpretation}
                </p>
              </CardContent>
            </Card>

            {/* Analysis Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Symbols */}
              {dream.symbols && dream.symbols.length > 0 && (
                <Card className="border-2 border-purple-200 bg-white">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Symbols
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dream.symbols.map((symbol, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 border-purple-200"
                        >
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emotions */}
              {dream.emotions && dream.emotions.length > 0 && (
                <Card className="border-2 border-pink-200 bg-white">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-600" />
                      Emotions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dream.emotions.map((emotion, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-pink-100 text-pink-700 border-pink-200"
                        >
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Themes */}
              {dream.themes && dream.themes.length > 0 && (
                <Card className="border-2 border-indigo-200 bg-white">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-indigo-600" />
                      Themes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dream.themes.map((theme, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-indigo-100 text-indigo-700 border-indigo-200"
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Insight Tags */}
            <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-gray-200">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Symbolic
              </Badge>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                Psychological
              </Badge>
              <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                Insightful
              </Badge>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
