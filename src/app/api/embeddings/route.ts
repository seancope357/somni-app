import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Generate embedding for a single dream
export async function POST(request: Request) {
  try {
    const { dreamId, userId } = await request.json()

    if (!dreamId || !userId) {
      return NextResponse.json(
        { error: 'Dream ID and User ID required' },
        { status: 400 }
      )
    }

    // Fetch the dream
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .eq('user_id', userId)
      .single()

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found' },
        { status: 404 }
      )
    }

    // Create text for embedding (content + interpretation + symbols/emotions/themes)
    const embeddingText = [
      dream.content,
      dream.interpretation,
      ...(dream.symbols || []),
      ...(dream.emotions || []),
      ...(dream.themes || [])
    ].filter(Boolean).join(' ')

    // Generate embedding using OpenAI
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText,
      encoding_format: 'float'
    })

    const embedding = response.data[0].embedding

    // Store embedding in database
    const { data: savedEmbedding, error: embeddingError } = await supabase
      .from('dream_embeddings')
      .upsert({
        dream_id: dreamId,
        embedding: JSON.stringify(embedding), // Store as JSON string
        model: 'text-embedding-3-small'
      })
      .select()
      .single()

    if (embeddingError) {
      console.error('Error saving embedding:', embeddingError)
      return NextResponse.json(
        { error: 'Failed to save embedding' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dream_id: dreamId,
      embedding_dimension: embedding.length
    })

  } catch (error: any) {
    console.error('Failed to generate embedding:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate embedding' },
      { status: 500 }
    )
  }
}

// Batch generate embeddings for all dreams without embeddings
export async function PUT(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Find dreams without embeddings
    const { data: dreams, error: dreamsError } = await supabase
      .from('dreams')
      .select('id, content, interpretation, symbols, emotions, themes')
      .eq('user_id', userId)

    if (dreamsError) throw dreamsError

    if (!dreams || dreams.length === 0) {
      return NextResponse.json({
        message: 'No dreams found',
        processed: 0
      })
    }

    // Get existing embeddings
    const { data: existingEmbeddings } = await supabase
      .from('dream_embeddings')
      .select('dream_id')

    const existingIds = new Set(existingEmbeddings?.map(e => e.dream_id) || [])
    const dreamsToProcess = dreams.filter(d => !existingIds.has(d.id))

    if (dreamsToProcess.length === 0) {
      return NextResponse.json({
        message: 'All dreams already have embeddings',
        processed: 0,
        total: dreams.length
      })
    }

    // Process in batches to avoid rate limits
    const results = []
    for (const dream of dreamsToProcess.slice(0, 10)) { // Limit to 10 per request
      try {
        const embeddingText = [
          dream.content,
          dream.interpretation,
          ...(dream.symbols || []),
          ...(dream.emotions || []),
          ...(dream.themes || [])
        ].filter(Boolean).join(' ')

        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: embeddingText,
          encoding_format: 'float'
        })

        const embedding = response.data[0].embedding

        await supabase
          .from('dream_embeddings')
          .upsert({
            dream_id: dream.id,
            embedding: JSON.stringify(embedding),
            model: 'text-embedding-3-small'
          })

        results.push({ dream_id: dream.id, success: true })
      } catch (error) {
        console.error(`Failed to process dream ${dream.id}:`, error)
        results.push({ dream_id: dream.id, success: false })
      }
    }

    return NextResponse.json({
      message: 'Batch processing complete',
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: dreamsToProcess.length,
      remaining: Math.max(0, dreamsToProcess.length - 10)
    })

  } catch (error: any) {
    console.error('Failed to batch generate embeddings:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to batch generate embeddings' },
      { status: 500 }
    )
  }
}
