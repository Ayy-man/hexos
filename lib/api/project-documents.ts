import { createClient } from '@/lib/supabase/server'

// Types
export type DocumentVisibility = 'internal' | 'client'

export interface ProjectDocument {
  id: string
  project_id: string
  title: string
  slug: string
  content: unknown // Plate.js JSON content
  discussions: unknown // Inline discussions
  created_by: string | null
  position: number
  visibility: DocumentVisibility
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  content: unknown
  created_by: string | null
  created_at: string
  description: string | null
  checkpoint_name: string | null
  is_checkpoint: boolean
  author?: {
    id: string
    name: string
  }
}

export interface CreateDocumentInput {
  project_id: string
  title: string
  slug: string
  content?: unknown
  position?: number
  visibility?: DocumentVisibility
}

export interface UpdateDocumentInput {
  title?: string
  content?: unknown
  discussions?: unknown
  position?: number
}

// Get all documents for a project, optionally filtered by visibility
export async function getProjectDocuments(
  projectId: string,
  visibility?: DocumentVisibility
): Promise<ProjectDocument[]> {
  const supabase = await createClient()

  let query = supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)

  if (visibility) {
    query = query.eq('visibility', visibility)
  }

  const { data, error } = await query.order('position', { ascending: true })

  if (error) throw error
  return data as ProjectDocument[]
}

// Get a single document by ID
export async function getProjectDocument(id: string): Promise<ProjectDocument> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ProjectDocument
}

// Get document by project and slug
export async function getProjectDocumentBySlug(
  projectId: string,
  slug: string
): Promise<ProjectDocument | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as ProjectDocument
}

// Create a new document
export async function createProjectDocument(input: CreateDocumentInput): Promise<ProjectDocument> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('project_documents')
    .insert({
      ...input,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectDocument
}

// Update a document
export async function updateProjectDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<ProjectDocument> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_documents')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ProjectDocument
}

// Delete a document
export async function deleteProjectDocument(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get version history for a document
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_versions')
    .select(`
      *,
      author:profiles!created_by(id, name)
    `)
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data as DocumentVersion[]
}

// Get checkpoints only
export async function getDocumentCheckpoints(documentId: string): Promise<DocumentVersion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_versions')
    .select(`
      *,
      author:profiles!created_by(id, name)
    `)
    .eq('document_id', documentId)
    .eq('is_checkpoint', true)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data as DocumentVersion[]
}

// Create a version (auto-save or checkpoint)
export async function createDocumentVersion(
  documentId: string,
  content: unknown,
  options?: {
    description?: string
    checkpointName?: string
    isCheckpoint?: boolean
  }
): Promise<DocumentVersion> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get the next version number
  const { data: latestVersion } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersionNumber = (latestVersion?.version_number || 0) + 1

  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: nextVersionNumber,
      content,
      created_by: user?.id || null,
      description: options?.description || null,
      checkpoint_name: options?.checkpointName || null,
      is_checkpoint: options?.isCheckpoint || false,
    })
    .select()
    .single()

  if (error) throw error
  return data as DocumentVersion
}

// Restore a version
export async function restoreDocumentVersion(
  documentId: string,
  versionId: string
): Promise<ProjectDocument> {
  const supabase = await createClient()

  // Get the version content
  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select('content')
    .eq('id', versionId)
    .single()

  if (versionError) throw versionError

  // Update the document with the restored content
  const { data, error } = await supabase
    .from('project_documents')
    .update({ content: version.content })
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error

  // Create a checkpoint marking the restore
  await createDocumentVersion(documentId, version.content, {
    description: 'Restored from previous version',
    isCheckpoint: true,
  })

  return data as ProjectDocument
}
