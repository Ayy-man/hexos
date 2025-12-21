import { createClient } from '@/lib/supabase/server'

export async function getBlueprints() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blueprints')
    .select('id, name, description, base_price, estimated_hours')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getBlueprint(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blueprints')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
