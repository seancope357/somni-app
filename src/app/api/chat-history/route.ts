import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List all conversations for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = searchParams.get('conversationId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // If conversationId provided, get that specific conversation with messages
    if (conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (convError) throw convError

      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgError) throw msgError

      return NextResponse.json({
        conversation,
        messages: messages || []
      })
    }

    // Otherwise, list all conversations
    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('*, chat_messages(count)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(conversations || [])

  } catch (error: any) {
    console.error('Chat history error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}

// POST - Create new conversation or save messages to existing
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, dreamId, title, messages, conversationId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // If conversationId provided, just save messages to existing conversation
    if (conversationId) {
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'Messages required' }, { status: 400 })
      }

      const messagesToInsert = messages.map(msg => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content
      }))

      const { error } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert)

      if (error) throw error

      return NextResponse.json({ success: true, conversationId })
    }

    // Create new conversation
    if (!title) {
      return NextResponse.json({ error: 'Title required for new conversation' }, { status: 400 })
    }

    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        dream_id: dreamId || null,
        title
      })
      .select()
      .single()

    if (convError) throw convError

    // If messages provided, save them
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const messagesToInsert = messages.map(msg => ({
        conversation_id: conversation.id,
        role: msg.role,
        content: msg.content
      }))

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert)

      if (msgError) throw msgError
    }

    return NextResponse.json({ success: true, conversationId: conversation.id })

  } catch (error: any) {
    console.error('Chat save error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save chat' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a conversation
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = searchParams.get('conversationId')

    if (!userId || !conversationId) {
      return NextResponse.json(
        { error: 'User ID and conversation ID required' },
        { status: 400 }
      )
    }

    // Verify ownership before deleting
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single()

    if (!conversation || conversation.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete conversation (messages will be cascade deleted)
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Chat delete error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
