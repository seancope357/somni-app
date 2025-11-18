import { createClient } from '@supabase/supabase-js'

// For local development, we'll use mock Supabase client
// In production, these should be set as environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create mock client for development when Supabase is not configured
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve()
  },
  from: () => ({ data: [], error: null }),
  insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
  select: () => Promise.resolve({ data: [], error: null }),
  eq: () => ({})
})

// Only create real client if both URL and key are provided
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient()