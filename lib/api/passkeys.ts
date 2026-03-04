import { createClient } from '@/lib/supabase/server'

export interface PasskeyCredential {
  id: string
  credential_id: string
  device_name: string | null
  created_at: string
  last_used_at: string | null
}

export async function getUserPasskeys(): Promise<PasskeyCredential[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('passkey_credentials')
    .select('id, credential_id, device_name, created_at, last_used_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PasskeyCredential[]
}
