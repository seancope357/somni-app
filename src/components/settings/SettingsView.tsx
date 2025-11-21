'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, Bell, Mail, Clock, Calendar as CalendarIcon, Save, User, Download } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

interface UserSettings {
  user_id: string
  timezone: string
  reminders_enabled: boolean
  reminder_time_local: string
  frequency: 'daily' | 'weekly' | 'custom'
  days_of_week: number[] | null
  channels: {
    email: boolean
    push: boolean
  }
  remind_for: string[]
}

interface SettingsViewProps {
  userId: string
  userEmail?: string
}

export default function SettingsView({ userId, userEmail }: SettingsViewProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [userId])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/settings?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your preferences have been updated successfully"
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDayOfWeek = (day: number) => {
    if (!settings) return
    
    const currentDays = settings.days_of_week || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort()
    
    setSettings({
      ...settings,
      days_of_week: newDays.length > 0 ? newDays : null
    })
  }

  const toggleRemindFor = (item: string) => {
    if (!settings) return
    
    const current = settings.remind_for || []
    const newRemindFor = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    
    setSettings({
      ...settings,
      remind_for: newRemindFor
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading settings...</p>
      </div>
    )
  }

  if (!settings) return null

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ]

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'Pacific/Honolulu',
    'America/Anchorage',
    'UTC',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-gray-800">Settings</h2>
          <p className="text-sm text-gray-600">Manage your preferences and notifications</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Account Information */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <User className="w-5 h-5 mr-2" />
            Account Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Email</Label>
            <p className="text-gray-600 mt-1">{userEmail || 'Not available'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">User ID</Label>
            <p className="text-xs text-gray-500 mt-1 font-mono">{userId.substring(0, 24)}...</p>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Settings */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Clock className="w-5 h-5 mr-2" />
            Timezone
          </CardTitle>
          <CardDescription>Set your local timezone for accurate reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Bell className="w-5 h-5 mr-2" />
            Reminders
          </CardTitle>
          <CardDescription>Get notified to journal and track your mood</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Reminders */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-gray-800">Enable Reminders</Label>
              <p className="text-xs text-gray-600 mt-1">Receive notifications to log dreams and mood</p>
            </div>
            <Switch
              checked={settings.reminders_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, reminders_enabled: checked })}
            />
          </div>

          {settings.reminders_enabled && (
            <>
              {/* Reminder Time */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Reminder Time</Label>
                <Input
                  type="time"
                  value={settings.reminder_time_local}
                  onChange={(e) => setSettings({ ...settings, reminder_time_local: e.target.value })}
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Time will be in your selected timezone</p>
              </div>

              {/* Frequency */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Frequency</Label>
                <div className="flex flex-wrap gap-2">
                  {['daily', 'weekly', 'custom'].map((freq) => (
                    <Button
                      key={freq}
                      variant={settings.frequency === freq ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings({ ...settings, frequency: freq as any })}
                      className="capitalize"
                    >
                      {freq}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Days of Week (for custom) */}
              {settings.frequency === 'custom' && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <Button
                        key={day.value}
                        variant={(settings.days_of_week || []).includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className="w-12"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Remind For */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Remind me to:</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium text-gray-800">Journal Dreams</Label>
                      <p className="text-xs text-gray-600">Record and interpret your dreams</p>
                    </div>
                    <Switch
                      checked={settings.remind_for.includes('journal')}
                      onCheckedChange={() => toggleRemindFor('journal')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium text-gray-800">Log Mood</Label>
                      <p className="text-xs text-gray-600">Track your daily emotional state</p>
                    </div>
                    <Switch
                      checked={settings.remind_for.includes('mood')}
                      onCheckedChange={() => toggleRemindFor('mood')}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Mail className="w-5 h-5 mr-2" />
            Notification Channels
          </CardTitle>
          <CardDescription>Choose how you want to receive reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-gray-800">Email Notifications</Label>
              <p className="text-xs text-gray-600 mt-1">Receive reminders via email</p>
            </div>
            <Switch
              checked={settings.channels.email}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                channels: { ...settings.channels, email: checked }
              })}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
            <div>
              <Label className="text-sm font-medium text-gray-800">Push Notifications</Label>
              <p className="text-xs text-gray-600 mt-1">
                Browser push notifications
                <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
              </p>
            </div>
            <Switch
              checked={false}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card className="border-0 bg-white/95 backdrop-blur-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Download className="w-5 h-5 mr-2" />
            Export Your Data
          </CardTitle>
          <CardDescription>Download all your dreams, mood logs, and life events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Export your complete DREAMONEIR data for backup or analysis. All data is yours to keep.
          </p>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/export?userId=${userId}&format=json`, '_blank')}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Export as JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/api/export?userId=${userId}&format=csv`, '_blank')}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  )
}
