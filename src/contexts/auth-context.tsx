'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  needsOnboarding: boolean
  signOut: () => Promise<void>
  refreshOnboardingStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  // Check onboarding status
  const checkOnboardingStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/onboarding?userId=${userId}`)
      const { data } = await response.json()

      // User needs onboarding if they don't have a record or it's not completed
      setNeedsOnboarding(!data || !data.completed)
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setNeedsOnboarding(true) // Default to showing onboarding on error
    }
  }

  const refreshOnboardingStatus = async () => {
    if (user?.id) {
      await checkOnboardingStatus(user.id)
    }
  }

  useEffect(() => {
    // If Supabase is not configured, show setup message
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      // Check onboarding status if user exists
      if (session?.user) {
        await checkOnboardingStatus(session.user.id)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        // Check onboarding status on auth change
        if (session?.user) {
          await checkOnboardingStatus(session.user.id)
        } else {
          setNeedsOnboarding(false)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  const value = {
    user,
    session,
    loading,
    needsOnboarding,
    signOut,
    refreshOnboardingStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}