import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'json' // json or csv

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Fetch all user data
    const [dreamsResult, moodLogsResult, lifeEventsResult, profileResult] = await Promise.all([
      supabase.from('dreams').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('mood_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false }),
      supabase.from('life_events').select('*').eq('user_id', userId).order('date_start', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', userId).single()
    ])

    if (dreamsResult.error) throw dreamsResult.error
    if (moodLogsResult.error) throw moodLogsResult.error
    if (lifeEventsResult.error) throw lifeEventsResult.error

    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      profile: profileResult.data || {},
      dreams: dreamsResult.data || [],
      mood_logs: moodLogsResult.data || [],
      life_events: lifeEventsResult.data || [],
      statistics: {
        total_dreams: dreamsResult.data?.length || 0,
        total_mood_logs: moodLogsResult.data?.length || 0,
        total_life_events: lifeEventsResult.data?.length || 0
      }
    }

    if (format === 'csv') {
      // Generate CSV for dreams
      const dreamsCSV = generateCSV(
        exportData.dreams,
        ['id', 'content', 'interpretation', 'sleep_hours', 'created_at']
      )

      return new NextResponse(dreamsCSV, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="oneir-dreams-${userId.substring(0, 8)}-${Date.now()}.csv"`
        }
      })
    }

    // Return JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="oneir-export-${userId.substring(0, 8)}-${Date.now()}.json"`
      }
    })

  } catch (error) {
    console.error('Failed to export data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

function generateCSV(data: any[], fields: string[]): string {
  if (data.length === 0) return ''

  const header = fields.join(',')
  const rows = data.map(item => {
    return fields.map(field => {
      let value = item[field]
      if (Array.isArray(value)) value = value.join('; ')
      if (typeof value === 'object') value = JSON.stringify(value)
      if (value === null || value === undefined) value = ''
      // Escape quotes and wrap in quotes if contains comma
      value = String(value).replace(/"/g, '""')
      if (value.includes(',') || value.includes('\n')) {
        value = `"${value}"`
      }
      return value
    }).join(',')
  }).join('\n')

  return header + '\n' + rows
}
