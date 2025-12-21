import { createClient } from '@/lib/supabase/server'

// Upload image to Supabase storage
export async function uploadCaseStudyImage(file: File): Promise<string> {
  const supabase = await createClient()

  const fileExt = file.name.split('.').pop()
  const fileName = `case-studies/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('general-purpose')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error('Failed to upload image')
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('general-purpose')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// Types
export interface CaseStudy {
  id: string
  name: string
  description: string | null
  client_name: string | null
  industry: string | null
  challenge: string | null
  solution: string | null
  results: string | null
  content: unknown | null
  tags: string[]
  status: 'draft' | 'published'
  icon: string | null
  image_url: string | null
  blueprint_id: string | null
  blueprint?: { id: string; name: string; icon: string | null }
  created_at: string
  updated_at: string | null
}

export interface CreateCaseStudyInput {
  name: string
  description?: string
  client_name?: string
  industry?: string
  challenge?: string
  solution?: string
  results?: string
  content?: unknown
  tags?: string[]
  status?: 'draft' | 'published'
  icon?: string
  image_url?: string
  blueprint_id?: string
}

export interface UpdateCaseStudyInput {
  name?: string
  description?: string
  client_name?: string
  industry?: string
  challenge?: string
  solution?: string
  results?: string
  content?: unknown
  tags?: string[]
  status?: 'draft' | 'published'
  icon?: string
  image_url?: string | null
  blueprint_id?: string | null
}

// Read operations
export async function getCaseStudies(options?: {
  tags?: string[]
  status?: 'draft' | 'published' | 'all'
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('case_studies')
    .select(`
      id, name, description, client_name, industry,
      challenge, solution, results, tags, status, icon, image_url,
      blueprint_id, created_at,
      blueprint:blueprints(id, name, icon)
    `)
    .order('created_at', { ascending: false })

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

  // Search by name, description, or client_name
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,client_name.ilike.%${options.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getCaseStudy(id: string): Promise<CaseStudy | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('case_studies')
    .select(`
      *,
      blueprint:blueprints(id, name, icon)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as CaseStudy
}

export async function getCaseStudyTags(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('case_studies')
    .select('tags')
    .eq('status', 'published')

  if (error) throw error

  // Flatten and dedupe tags
  const allTags = (data || []).flatMap(row => row.tags || [])
  return [...new Set(allTags)].sort()
}

// Get blueprints for dropdown selection
export async function getBlueprintsForSelect() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blueprints')
    .select('id, name, icon')
    .eq('status', 'published')
    .order('name')

  if (error) throw error
  return data || []
}

// Write operations (admin only - RLS enforced)
export async function createCaseStudy(input: CreateCaseStudyInput): Promise<CaseStudy> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('case_studies')
    .insert({
      name: input.name,
      description: input.description || null,
      client_name: input.client_name || null,
      industry: input.industry || null,
      challenge: input.challenge || null,
      solution: input.solution || null,
      results: input.results || null,
      content: input.content || null,
      tags: input.tags || [],
      status: input.status || 'draft',
      icon: input.icon || null,
      image_url: input.image_url || null,
      blueprint_id: input.blueprint_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CaseStudy
}

export async function updateCaseStudy(id: string, input: UpdateCaseStudyInput): Promise<CaseStudy> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.client_name !== undefined) updateData.client_name = input.client_name
  if (input.industry !== undefined) updateData.industry = input.industry
  if (input.challenge !== undefined) updateData.challenge = input.challenge
  if (input.solution !== undefined) updateData.solution = input.solution
  if (input.results !== undefined) updateData.results = input.results
  if (input.content !== undefined) updateData.content = input.content
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.status !== undefined) updateData.status = input.status
  if (input.icon !== undefined) updateData.icon = input.icon
  if (input.image_url !== undefined) updateData.image_url = input.image_url
  if (input.blueprint_id !== undefined) updateData.blueprint_id = input.blueprint_id

  const { data, error } = await supabase
    .from('case_studies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as CaseStudy
}

export async function deleteCaseStudy(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('case_studies')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function duplicateCaseStudy(id: string): Promise<CaseStudy> {
  const original = await getCaseStudy(id)
  if (!original) throw new Error('Case study not found')

  return createCaseStudy({
    name: `${original.name} (Copy)`,
    description: original.description || undefined,
    client_name: original.client_name || undefined,
    industry: original.industry || undefined,
    challenge: original.challenge || undefined,
    solution: original.solution || undefined,
    results: original.results || undefined,
    content: original.content || undefined,
    tags: original.tags || [],
    status: 'draft', // Always create as draft
    icon: original.icon || undefined,
    image_url: original.image_url || undefined,
    blueprint_id: original.blueprint_id || undefined,
  })
}
