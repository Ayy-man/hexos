import { createClient } from '@/lib/supabase/server'

// Types
export interface PricingTier {
  name: string
  setup_price: number
  monthly_price: number
  features: string[]
}

export interface Blueprint {
  id: string
  name: string
  description: string | null
  default_deliverables: unknown | null
  estimated_hours: number | null
  base_price: number | null
  content: unknown | null
  pricing_tiers: PricingTier[]
  tags: string[]
  status: 'draft' | 'published'
  icon: string | null
  created_at: string
  updated_at: string | null
}

export interface CreateBlueprintInput {
  name: string
  description?: string
  estimated_hours?: number
  base_price?: number
  content?: unknown
  pricing_tiers?: PricingTier[]
  tags?: string[]
  status?: 'draft' | 'published'
  icon?: string
}

export interface UpdateBlueprintInput {
  name?: string
  description?: string
  estimated_hours?: number
  base_price?: number
  content?: unknown
  pricing_tiers?: PricingTier[]
  tags?: string[]
  status?: 'draft' | 'published'
  icon?: string
}

// Read operations
export async function getBlueprints(options?: {
  tags?: string[]
  status?: 'draft' | 'published' | 'all'
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('blueprints')
    .select('id, name, description, base_price, estimated_hours, tags, status, icon, pricing_tiers')
    .order('name')

  // Filter by status (default to published only)
  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  } else if (!options?.status) {
    // Default: show published only (unless explicitly asked for all)
    query = query.eq('status', 'published')
  }

  // Filter by tags (any match)
  if (options?.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags)
  }

  // Search by name or description
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getBlueprint(id: string): Promise<Blueprint | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blueprints')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as Blueprint
}

export async function getBlueprintTags(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blueprints')
    .select('tags')
    .eq('status', 'published')

  if (error) throw error

  // Flatten and dedupe tags
  const allTags = (data || []).flatMap(row => row.tags || [])
  return [...new Set(allTags)].sort()
}

// Write operations (admin only - RLS enforced)
export async function createBlueprint(input: CreateBlueprintInput): Promise<Blueprint> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blueprints')
    .insert({
      name: input.name,
      description: input.description || null,
      estimated_hours: input.estimated_hours || null,
      base_price: input.base_price || null,
      content: input.content || null,
      pricing_tiers: input.pricing_tiers || [],
      tags: input.tags || [],
      status: input.status || 'draft',
      icon: input.icon || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Blueprint
}

export async function updateBlueprint(id: string, input: UpdateBlueprintInput): Promise<Blueprint> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.estimated_hours !== undefined) updateData.estimated_hours = input.estimated_hours
  if (input.base_price !== undefined) updateData.base_price = input.base_price
  if (input.content !== undefined) updateData.content = input.content
  if (input.pricing_tiers !== undefined) updateData.pricing_tiers = input.pricing_tiers
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.status !== undefined) updateData.status = input.status
  if (input.icon !== undefined) updateData.icon = input.icon

  const { data, error } = await supabase
    .from('blueprints')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Blueprint
}

export async function deleteBlueprint(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('blueprints')
    .delete()
    .eq('id', id)

  if (error) throw error
}
