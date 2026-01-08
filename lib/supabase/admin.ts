import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client that bypasses RLS - use only for system operations
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('[AdminClient] Creating client...', {
    hasUrl: !!supabaseUrl,
    hasKey: !!serviceRoleKey,
    keyPrefix: serviceRoleKey?.substring(0, 10) + '...',
  })

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[AdminClient] Missing credentials:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey,
    })
    throw new Error('Missing Supabase admin credentials')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
