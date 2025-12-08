'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, X, Minimize2, Maximize2, Brain, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { FormattedText } from '@/components/ui/formatted-text'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface DreamChatbotProps {
  userId: string
  dreamId?: string
  dreamContent: string
  interpretation: string
  onClose: () => void
}

export default function DreamChatbot({ userId, dreamId, dreamContent, interpretation, onClose }: DreamChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hello! I'm here to help you explore this dream more deeply.\n\nI have access to your complete history and can answer specific questions:\n\n**Sleep Patterns:** Average hours, sleep quality trends, day-of-week patterns, sleep-dream correlations\n\n**Dream History:** Up to 200 dreams, recurring symbols, emotions, themes\n\n**Mood & Energy:** 90 days of mood logs, stress levels, energy patterns\n\n**Life Context:** 12 months of life events, journal entries, your goals and stressors\n\nAsk me anything:\n• How have I been sleeping lately?\n• What emotions come up when I sleep less?\n• Do I dream differently on weekends?\n• What patterns connect my sleep, moods, and dreams?\n• How does this dream relate to recent life events?\n\nWhat would you like to explore?",
      timestamp: Date.now()
    }])
  }, [])

  const handleSendMessage = async () => {
    if (!userInput.trim() || isThinking) return

    const userMessage: Message = {
      role: 'user',
      content: userInput.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setUserInput('')
    setIsThinking(true)

    try {
      const response = await fetch('/api/dream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dreamId,
          dreamContent,
          interpretation,
          userMessage: userMessage.content,
          conversationHistory: messages
        })
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error: any) {
      toast({
        title: "Chat error",
        description: error.message || "Failed to get response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsThinking(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out",
        isMinimized ? "w-16" : "w-full sm:w-96"
      )}
    >
      {/* Main Chat Card */}
      <Card className={cn(
        "h-full rounded-none border-l border-t-0 border-b-0 border-r-0 bg-white/95 backdrop-blur-lg shadow-2xl flex flex-col",
        isMinimized && "bg-purple-500"
      )}>
        {/* Header */}
        <CardHeader className={cn(
          "flex-shrink-0 pb-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50",
          isMinimized && "p-2 bg-purple-500"
        )}>
          {!isMinimized ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-serif text-gray-800">Dream Explorer</CardTitle>
                  <p className="text-xs text-gray-500">Ask me anything about your dreams</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="h-12 w-12 p-0 rounded-full bg-purple-500 hover:bg-purple-600 mx-auto"
            >
              <Brain className="w-6 h-6 text-white" />
            </Button>
          )}
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Context Badge */}
              <div className="sticky top-0 z-10 pb-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Discussing: "{dreamContent.substring(0, 50)}..."
                </Badge>
              </div>

              {/* Messages */}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 shadow-sm",
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <FormattedText text={message.content} className="text-sm leading-relaxed" />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                    <p
                      className={cn(
                        "text-xs mt-1",
                        message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                      )}
                    >
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t bg-white p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your dream..."
                  disabled={isThinking}
                  className="flex-1 border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isThinking}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                I have access to 200 dreams, 90 days of moods, sleep patterns, journal entries, and life events
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
