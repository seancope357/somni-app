// Gamification utility functions

// XP rewards for different actions
export const XP_REWARDS = {
  DREAM_LOGGED: 10,
  MOOD_LOGGED: 5,
  JOURNAL_ENTRY: 15,
  LIFE_EVENT: 10,
  FIRST_DREAM_OF_DAY: 5,
  STREAK_BONUS: 20,
  PERSPECTIVE_CHANGE: 5,
}

// Award XP to user
export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  relatedId?: string,
  relatedType?: string
): Promise<{ newLevel: number; levelUp: boolean; totalXp: number } | null> {
  try {
    const response = await fetch('/api/gamification/add-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount,
        reason,
        relatedId,
        relatedType
      })
    })

    if (!response.ok) {
      console.error('Failed to award XP')
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error awarding XP:', error)
    return null
  }
}

// Update streak
export async function updateStreak(userId: string): Promise<{
  currentStreak: number
  longestStreak: number
  isNewRecord: boolean
} | null> {
  try {
    const response = await fetch('/api/gamification/update-streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      console.error('Failed to update streak')
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating streak:', error)
    return null
  }
}

// Update user counter (dreams, moods, etc.)
export async function updateCounter(userId: string, action: 'dream' | 'journal' | 'mood' | 'event') {
  try {
    const response = await fetch('/api/user-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action })
    })

    if (!response.ok) {
      console.error('Failed to update counter')
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating counter:', error)
    return false
  }
}

// Check and award achievements
export async function checkAchievements(userId: string, stats: any) {
  // This would be more sophisticated in production
  // For now, achievements are checked server-side when counters update
  // You could add client-side achievement checking logic here
}
