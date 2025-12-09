'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, X, Minimize2, Maximize2, Brain, Sparkles, Copy, Check, Mic, MicOff, Download, Save, History, Trash2, ThumbsUp, ThumbsDown, PlusCircle, Calendar as CalendarIcon, BookOpen } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { FormattedText } from '@/components/ui/formatted-text'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  id?: string
  reaction?: 'thumbs_up' | 'thumbs_down' | null
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [quickReplies, setQuickReplies] = useState<string[]>([
    "How have I been sleeping lately?",
    "What patterns do you see in my dreams?",
    "How does my mood affect my dreams?",
    "What recurring themes appear?"
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Copy message to clipboard
  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast({
        title: "Copied!",
        description: "Message copied to clipboard"
      })
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive"
      })
    }
  }

  // React to message
  const reactToMessage = (messageId: string, reaction: 'thumbs_up' | 'thumbs_down') => {
    setMessages(prev => prev.map(msg => {
      if ((msg.id || '') === messageId) {
        // Toggle reaction - if same reaction clicked, remove it
        const newReaction = msg.reaction === reaction ? null : reaction
        return { ...msg, reaction: newReaction }
      }
      return msg
    }))

    toast({
      title: "Feedback recorded",
      description: "Thank you for your feedback!",
      duration: 1500
    })
  }

  // Detect suggested actions from AI response
  const getSuggestedActions = (content: string) => {
    const actions = []
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes('journal') || lowerContent.includes('write') || lowerContent.includes('reflect on')) {
      actions.push({
        label: 'Create journal entry',
        icon: BookOpen,
        action: () => {
          toast({
            title: "Opening journal",
            description: "Feature coming soon - will open journal with pre-filled insights"
          })
        }
      })
    }

    if (lowerContent.includes('life event') || lowerContent.includes('significant') || lowerContent.includes('milestone')) {
      actions.push({
        label: 'Add life event',
        icon: CalendarIcon,
        action: () => {
          toast({
            title: "Opening life events",
            description: "Feature coming soon - will open life event form"
          })
        }
      })
    }

    if (lowerContent.includes('mood') || lowerContent.includes('feeling') || lowerContent.includes('emotional')) {
      actions.push({
        label: 'Log current mood',
        icon: PlusCircle,
        action: () => {
          toast({
            title: "Opening mood tracker",
            description: "Feature coming soon - will open mood log form"
          })
        }
      })
    }

    return actions
  }

  // Voice input functionality
  const startVoiceInput = () => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in your browser",
        variant: "destructive"
      })
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setUserInput(transcript)
      setIsRecording(false)
    }

    recognition.onerror = () => {
      setIsRecording(false)
      toast({
        title: "Voice input failed",
        description: "Could not capture voice input. Please try again.",
        variant: "destructive"
      })
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  // Update quick replies based on conversation context
  const updateQuickReplies = (lastMessage: string) => {
    const contextualReplies = []

    if (lastMessage.toLowerCase().includes('sleep')) {
      contextualReplies.push("Tell me more about my sleep quality", "How does sleep affect my dream recall?")
    }
    if (lastMessage.toLowerCase().includes('mood')) {
      contextualReplies.push("What's the mood-dream connection?", "Am I dreaming more when stressed?")
    }
    if (lastMessage.toLowerCase().includes('pattern')) {
      contextualReplies.push("What other patterns exist?", "Show me long-term trends")
    }

    // Fallback to default questions
    if (contextualReplies.length < 3) {
      const defaults = [
        "What emotions come up most in my dreams?",
        "How does this dream compare to my recent ones?",
        "Do I dream differently on weekends?",
        "What symbols appear frequently?"
      ]
      contextualReplies.push(...defaults.filter(q => !contextualReplies.includes(q)).slice(0, 4 - contextualReplies.length))
    }

    setQuickReplies(contextualReplies.slice(0, 4))
  }

  // Save conversation
  const saveConversation = async () => {
    if (messages.length <= 1) {
      toast({
        title: "Nothing to save",
        description: "Start a conversation first",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const title = `Dream chat - ${new Date().toLocaleDateString()}`
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dreamId,
          title,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          conversationId
        })
      })

      const data = await response.json()
      if (response.ok) {
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }
        toast({
          title: "Saved!",
          description: "Conversation saved to history"
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Could not save conversation",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Export conversation as text
  const exportConversation = () => {
    const text = messages.map(m => {
      const time = new Date(m.timestamp).toLocaleString()
      return `[${time}] ${m.role.toUpperCase()}:\n${m.content}\n`
    }).join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dream-chat-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Exported!",
      description: "Conversation downloaded"
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to close chatbot
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
      // Escape to close
      if (e.key === 'Escape' && !isMinimized) {
        onClose()
      }
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveConversation()
      }
      // Cmd/Ctrl + E to export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        exportConversation()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [messages, isMinimized, conversationId])

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hello! I'm here to help you explore this dream more deeply.\n\nI have access to your complete history and can answer specific questions:\n\n**Sleep Patterns:** Average hours, sleep quality trends, day-of-week patterns, sleep-dream correlations\n\n**Dream History:** Up to 200 dreams, recurring symbols, emotions, themes\n\n**Mood & Energy:** 90 days of mood logs, stress levels, energy patterns\n\n**Life Context:** 12 months of life events, journal entries, your goals and stressors\n\nAsk me anything:\n• How have I been sleeping lately?\n• What emotions come up when I sleep less?\n• Do I dream differently on weekends?\n• What patterns connect my sleep, moods, and dreams?\n• How does this dream relate to recent life events?\n\nWhat would you like to explore?",
      timestamp: Date.now(),
      id: 'welcome-message'
    }])
  }, [])

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || userInput.trim()
    if (!textToSend || isThinking) return

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      id: `user-${Date.now()}`
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
          timestamp: Date.now(),
          id: `assistant-${Date.now()}`
        }
        setMessages(prev => [...prev, assistantMessage])

        // Update quick replies based on the AI response
        updateQuickReplies(data.response)
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

  const handleQuickReply = (question: string) => {
    handleSendMessage(question)
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
                  onClick={exportConversation}
                  disabled={messages.length <= 1}
                  className="h-8 w-8 p-0"
                  title="Export conversation (Cmd+E)"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveConversation}
                  disabled={messages.length <= 1 || isSaving}
                  className="h-8 w-8 p-0"
                  title="Save to history (Cmd+S)"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-8 w-8 p-0"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  title="Close (Esc or Cmd+K)"
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
                  key={message.id || index}
                  className={cn(
                    "flex group",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyMessage(message.content, message.id || `${index}`)}
                          className="h-7 w-7 p-0"
                          title="Copy message"
                        >
                          {copiedMessageId === (message.id || `${index}`) ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reactToMessage(message.id || `${index}`, 'thumbs_up')}
                          className={cn(
                            "h-7 w-7 p-0",
                            message.reaction === 'thumbs_up' && "bg-green-50"
                          )}
                          title="Helpful response"
                        >
                          <ThumbsUp className={cn(
                            "w-3 h-3",
                            message.reaction === 'thumbs_up' ? "text-green-600 fill-green-600" : "text-gray-500"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reactToMessage(message.id || `${index}`, 'thumbs_down')}
                          className={cn(
                            "h-7 w-7 p-0",
                            message.reaction === 'thumbs_down' && "bg-red-50"
                          )}
                          title="Not helpful"
                        >
                          <ThumbsDown className={cn(
                            "w-3 h-3",
                            message.reaction === 'thumbs_down' ? "text-red-600 fill-red-600" : "text-gray-500"
                          )} />
                        </Button>
                      </div>
                    )}
                    <div className="flex-1">
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2 shadow-sm",
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
                      {/* Show reaction badge if message has been reacted to */}
                      {message.role === 'assistant' && message.reaction && (
                        <div className="mt-1 ml-2">
                          <Badge variant="secondary" className={cn(
                            "text-xs",
                            message.reaction === 'thumbs_up' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {message.reaction === 'thumbs_up' ? (
                              <><ThumbsUp className="w-3 h-3 mr-1 fill-current" /> Helpful</>
                            ) : (
                              <><ThumbsDown className="w-3 h-3 mr-1 fill-current" /> Not helpful</>
                            )}
                          </Badge>
                        </div>
                      )}

                      {/* Quick action buttons for AI suggestions */}
                      {message.role === 'assistant' && getSuggestedActions(message.content).length > 0 && (
                        <div className="mt-2 ml-2 flex flex-wrap gap-2">
                          {getSuggestedActions(message.content).map((action, idx) => {
                            const Icon = action.icon
                            return (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={action.action}
                                className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                              >
                                <Icon className="w-3 h-3 mr-1" />
                                {action.label}
                              </Button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Enhanced Thinking Indicator */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t bg-white p-4 space-y-3">
              {/* Quick Reply Buttons */}
              {!isThinking && messages.length > 1 && quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="text-xs px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full border border-purple-200 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input with Voice */}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your dream..."
                  disabled={isThinking || isRecording}
                  className="flex-1 border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  disabled={isThinking}
                  className={cn(
                    "h-10 w-10 p-0",
                    isRecording && "bg-red-50 border-red-300"
                  )}
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4 text-red-600 animate-pulse" />
                  ) : (
                    <Mic className="w-4 h-4 text-gray-600" />
                  )}
                </Button>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!userInput.trim() || isThinking || isRecording}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                I have access to 200 dreams, 90 days of moods, sleep patterns, journal entries, and life events
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
