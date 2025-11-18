import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Check if API key is set
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not set in environment variables' },
        { status: 500 }
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })

    // Test with a simple request
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Say "API test successful" in one sentence.'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    })

    const response = completion.choices[0]?.message?.content

    return NextResponse.json({
      success: true,
      message: 'Groq API is working!',
      response: response,
      model: 'llama-3.3-70b-versatile'
    })

  } catch (error: any) {
    console.error('Groq test error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
        status: error?.status,
        details: error?.error
      },
      { status: error?.status || 500 }
    )
  }
}
