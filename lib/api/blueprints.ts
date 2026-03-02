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
  loom_video_url: string | null
  created_at: string
  updated_at: string | null
}

// Lighter type for list views (what getBlueprints returns)
export interface BlueprintSummary {
  id: string
  name: string
  description: string | null
  base_price: number | null
  estimated_hours: number | null
  tags: string[]
  status: 'draft' | 'published'
  icon: string | null
  pricing_tiers: PricingTier[]
  loom_video_url: string | null
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
  loom_video_url?: string
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
  loom_video_url?: string | null
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
    .select('id, name, description, base_price, estimated_hours, tags, status, icon, pricing_tiers, loom_video_url')
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
      loom_video_url: input.loom_video_url || null,
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
  if (input.loom_video_url !== undefined) updateData.loom_video_url = input.loom_video_url

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

// Get blueprint status counts (for sidebar hover preview)
export async function getBlueprintStatusCounts() {
  const supabase = await createClient()
  const { data } = await supabase.from('blueprints').select('status')
  if (!data) return { draft: 0, published: 0 }
  const counts = { draft: 0, published: 0 }
  for (const row of data) {
    if (row.status === 'draft') counts.draft++
    else if (row.status === 'published') counts.published++
  }
  return counts
}

// Get blueprints by status (for sidebar hover drill-down)
export async function getBlueprintsByStatus(status: string, limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blueprints')
    .select('id, name')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function duplicateBlueprint(id: string): Promise<Blueprint> {
  const original = await getBlueprint(id)
  if (!original) throw new Error('Blueprint not found')

  return createBlueprint({
    name: `${original.name} (Copy)`,
    description: original.description || undefined,
    estimated_hours: original.estimated_hours || undefined,
    base_price: original.base_price || undefined,
    content: original.content || undefined,
    pricing_tiers: original.pricing_tiers || [],
    tags: original.tags || [],
    status: 'draft', // Always create as draft
    icon: original.icon || undefined,
    loom_video_url: original.loom_video_url || undefined,
  })
}
