import { createClient } from '@/lib/supabase/server'

/**
 * Get all devs with their roles
 */
export async function getAllDevs(): Promise<{ id: string; name: string; email: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'dev')
    .order('name')

  if (error) throw error
  return data || []
}
