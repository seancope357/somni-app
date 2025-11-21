import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get user settings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Return default settings if none exist
    if (!settings) {
      const defaultSettings = {
        user_id: userId,
        timezone: 'UTC',
        reminders_enabled: false,
        reminder_time_local: '21:00',
        frequency: 'daily',
        days_of_week: null,
        channels: { email: true, push: false },
        remind_for: ['journal', 'mood']
      }
      
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// Create or update user settings
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      user_id,
      timezone,
      reminders_enabled,
      reminder_time_local,
      frequency,
      days_of_week,
      channels,
      remind_for
    } = body

    const actualUserId = userId || user_id

    if (!actualUserId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'custom']
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be daily, weekly, or custom' },
        { status: 400 }
      )
    }

    // Validate days_of_week if frequency is custom
    if (frequency === 'custom' && (!days_of_week || days_of_week.length === 0)) {
      return NextResponse.json(
        { error: 'Days of week required for custom frequency' },
        { status: 400 }
      )
    }

    // Validate remind_for
    const validRemindFor = ['journal', 'mood']
    if (remind_for && !remind_for.every((item: string) => validRemindFor.includes(item))) {
      return NextResponse.json(
        { error: 'Invalid remind_for value. Must be journal or mood' },
        { status: 400 }
      )
    }

    const settingsData = {
      user_id: actualUserId,
      timezone: timezone || 'UTC',
      reminders_enabled: reminders_enabled !== undefined ? reminders_enabled : false,
      reminder_time_local: reminder_time_local || '21:00',
      frequency: frequency || 'daily',
      days_of_week: frequency === 'custom' ? days_of_week : null,
      channels: channels || { email: true, push: false },
      remind_for: remind_for || ['journal', 'mood']
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert(settingsData, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving settings:', error)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
