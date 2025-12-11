import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'


// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// Find similar dreams using vector similarity
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set environment variables.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dreamId = searchParams.get('dreamId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!dreamId || !userId) {
      return NextResponse.json(
        { error: 'Dream ID and User ID required' },
        { status: 400 }
      )
    }

    // Get the embedding for the query dream
    const { data: queryEmbedding, error: queryError } = await supabase
      .from('dream_embeddings')
      .select('embedding')
      .eq('dream_id', dreamId)
      .single()

    if (queryError || !queryEmbedding) {
      return NextResponse.json(
        { error: 'Embedding not found for this dream. Generate embeddings first.' },
        { status: 404 }
      )
    }

    // Parse the query embedding
    const queryVector = JSON.parse(queryEmbedding.embedding)

    // Get all user's dreams with embeddings
    const { data: userDreams, error: dreamsError } = await supabase
      .from('dreams')
      .select(`
        id,
        content,
        interpretation,
        symbols,
        emotions,
        themes,
        sleep_hours,
        created_at,
        dream_embeddings (embedding)
      `)
      .eq('user_id', userId)
      .neq('id', dreamId) // Exclude the query dream itself

    if (dreamsError) {
      console.error('Error fetching dreams:', dreamsError)
      return NextResponse.json(
        { error: 'Failed to fetch dreams' },
        { status: 500 }
      )
    }

    if (!userDreams || userDreams.length === 0) {
      return NextResponse.json({
        similar_dreams: [],
        message: 'No other dreams found'
      })
    }

    // Calculate similarities
    const similarities = userDreams
      .filter((dream: any) => dream.dream_embeddings?.[0]?.embedding)
      .map((dream: any) => {
        const dreamVector = JSON.parse(dream.dream_embeddings[0].embedding)
        const similarity = cosineSimilarity(queryVector, dreamVector)
        
        return {
          id: dream.id,
          content: dream.content,
          interpretation: dream.interpretation,
          symbols: dream.symbols || [],
          emotions: dream.emotions || [],
          themes: dream.themes || [],
          sleep_hours: dream.sleep_hours,
          created_at: dream.created_at,
          similarity_score: similarity
        }
      })
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit)

    return NextResponse.json({
      similar_dreams: similarities,
      query_dream_id: dreamId,
      total_compared: userDreams.length
    })

  } catch (error: any) {
    console.error('Failed to find similar dreams:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to find similar dreams' },
      { status: 500 }
    )
  }
}
