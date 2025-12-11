import { createClient } from '@supabase/supabase-js'

/**
 * Get Supabase client for server-side API routes
 * Returns null if environment variables are not configured
 * This allows the build to succeed even without Supabase credentials
 */
export function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // During build time, env vars might not be available
  // Return null and let the API routes handle it
  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
