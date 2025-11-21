'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lightbulb, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SmartPromptsProps {
  userId: string
}

export default function SmartPrompts({ userId }: SmartPromptsProps) {
  const [prompts, setPrompts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchPrompts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/smart-prompts?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch prompts')
      }

      const data = await response.json()
      setPrompts(data.prompts || [])
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

  useEffect(() => {
    fetchPrompts()
  }, [userId])

  if (prompts.length === 0 && !loading) {
    return null
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-800 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Journaling Prompts
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchPrompts}
            disabled={loading}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-600 text-center py-4">
            Generating personalized prompts...
          </div>
        ) : (
          <ul className="space-y-2">
            {prompts.map((prompt, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start">
                <span className="text-purple-500 mr-2 mt-0.5">•</span>
                <span>{prompt}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
