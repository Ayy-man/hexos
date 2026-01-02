import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type FileVisibility = 'workspace' | 'portal'
export type ContentType = 'file' | 'folder' | 'document' | 'whiteboard'

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  visibility: FileVisibility
  description: string | null
  uploaded_by: string | null
  uploaded_at: string
  uploader?: { id: string; name: string } | null
}

export interface ProjectFileItem extends ProjectFile {
  parent_id: string | null
  content_type: ContentType
  content: unknown | null
  position: number
  children?: ProjectFileItem[]
}

export interface CreateFolderInput {
  project_id: string
  name: string
  parent_id?: string | null
  visibility?: FileVisibility
}

export interface CreateDocumentInput {
  project_id: string
  name: string
  parent_id?: string | null
  visibility?: FileVisibility
  content?: unknown
}

export interface CreateWhiteboardInput {
  project_id: string
  name: string
  parent_id?: string | null
  visibility?: FileVisibility
}

// ============================================
// Server Functions
// ============================================

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_files')
    .select(`
      id,
      project_id,
      file_name,
      file_path,
      file_size,
      file_type,
      visibility,
      description,
      uploaded_by,
      uploaded_at,
      uploader:profiles!uploaded_by(id, name)
    `)
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch project files:', error)
    throw new Error('Failed to fetch project files')
  }

  return (data || []) as unknown as ProjectFile[]
}

export async function getDownloadUrl(filePath: string): Promise<string> {
  const supabase = await createClient()

  // Extract storage path from public URL
  const url = new URL(filePath)
  const storagePath = url.pathname.split('/storage/v1/object/public/general-purpose/')[1]

  if (!storagePath) {
    throw new Error('Invalid file path')
  }

  const { data, error } = await supabase.storage
    .from('general-purpose')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate download URL')
  }

  return data.signedUrl
}

// ============================================
// Tree Functions
// ============================================

export async function getProjectFileTree(projectId: string): Promise<ProjectFileItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_files')
    .select(`
      id,
      project_id,
      parent_id,
      file_name,
      file_path,
      file_size,
      file_type,
      content_type,
      content,
      visibility,
      description,
      position,
      uploaded_by,
      uploaded_at,
      uploader:profiles!uploaded_by(id, name)
    `)
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Failed to fetch project file tree:', error)
    throw new Error('Failed to fetch project file tree')
  }

  return (data || []) as unknown as ProjectFileItem[]
}

// Build tree structure from flat array (client-side utility)
export function buildFileTree(items: ProjectFileItem[]): ProjectFileItem[] {
  const map = new Map<string, ProjectFileItem>()
  const roots: ProjectFileItem[] = []

  // Create nodes with empty children arrays
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  // Build hierarchy
  items.forEach(item => {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node)
    } else if (!item.parent_id) {
      roots.push(node)
    }
  })

  // Sort children by position
  const sortByPosition = (nodes: ProjectFileItem[]) => {
    nodes.sort((a, b) => a.position - b.position)
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortByPosition(node.children)
      }
    })
  }
  sortByPosition(roots)

  return roots
}

// ============================================
// Folder Functions
// ============================================

export async function createFolder(input: CreateFolderInput): Promise<ProjectFileItem> {
  const supabase = await createClient()

  // Get max position for siblings
  const { data: siblings } = await supabase
    .from('project_files')
    .select('position')
    .eq('project_id', input.project_id)
    .is('parent_id', input.parent_id ?? null)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (siblings?.[0]?.position ?? -1) + 1

  // If parent_id is provided, inherit visibility from parent
  let visibility = input.visibility ?? 'workspace'
  if (input.parent_id && !input.visibility) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', input.parent_id)
      .single()
    if (parent?.visibility) {
      visibility = parent.visibility as FileVisibility
    }
  }

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: input.project_id,
      parent_id: input.parent_id ?? null,
      file_name: input.name,
      file_path: '',
      content_type: 'folder',
      visibility,
      position: nextPosition,
    })
    .select(`
      id,
      project_id,
      parent_id,
      file_name,
      file_path,
      file_size,
      file_type,
      content_type,
      content,
      visibility,
      description,
      position,
      uploaded_by,
      uploaded_at
    `)
    .single()

  if (error) {
    console.error('Failed to create folder:', error)
    throw new Error('Failed to create folder')
  }

  return data as unknown as ProjectFileItem
}

// ============================================
// Document Functions
// ============================================

export async function createDocument(input: CreateDocumentInput): Promise<ProjectFileItem> {
  const supabase = await createClient()

  // Get max position for siblings
  const { data: siblings } = await supabase
    .from('project_files')
    .select('position')
    .eq('project_id', input.project_id)
    .is('parent_id', input.parent_id ?? null)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (siblings?.[0]?.position ?? -1) + 1

  // Inherit visibility from parent if not specified
  let visibility = input.visibility ?? 'workspace'
  if (input.parent_id && !input.visibility) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', input.parent_id)
      .single()
    if (parent?.visibility) {
      visibility = parent.visibility as FileVisibility
    }
  }

  // Default Plate.js empty document
  const defaultContent = input.content ?? [
    { type: 'p', children: [{ text: '' }] }
  ]

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: input.project_id,
      parent_id: input.parent_id ?? null,
      file_name: input.name,
      file_path: '',
      content_type: 'document',
      content: defaultContent,
      visibility,
      position: nextPosition,
    })
    .select(`
      id,
      project_id,
      parent_id,
      file_name,
      file_path,
      file_size,
      file_type,
      content_type,
      content,
      visibility,
      description,
      position,
      uploaded_by,
      uploaded_at
    `)
    .single()

  if (error) {
    console.error('Failed to create document:', error)
    throw new Error('Failed to create document')
  }

  return data as unknown as ProjectFileItem
}

export async function getFileContent(itemId: string): Promise<unknown> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_files')
    .select('content')
    .eq('id', itemId)
    .single()

  if (error) {
    console.error('Failed to get file content:', error)
    throw new Error('Failed to get file content')
  }

  return data?.content
}

export async function updateFileContent(itemId: string, content: unknown): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_files')
    .update({ content })
    .eq('id', itemId)

  if (error) {
    console.error('Failed to update file content:', error)
    throw new Error('Failed to update file content')
  }
}

// ============================================
// Whiteboard Functions
// ============================================

export async function createWhiteboard(input: CreateWhiteboardInput): Promise<ProjectFileItem> {
  const supabase = await createClient()

  // Get max position for siblings
  const { data: siblings } = await supabase
    .from('project_files')
    .select('position')
    .eq('project_id', input.project_id)
    .is('parent_id', input.parent_id ?? null)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (siblings?.[0]?.position ?? -1) + 1

  // Inherit visibility from parent if not specified
  let visibility = input.visibility ?? 'workspace'
  if (input.parent_id && !input.visibility) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', input.parent_id)
      .single()
    if (parent?.visibility) {
      visibility = parent.visibility as FileVisibility
    }
  }

  // Default Excalidraw empty state
  const defaultContent = {
    elements: [],
    appState: {},
    files: {}
  }

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: input.project_id,
      parent_id: input.parent_id ?? null,
      file_name: input.name,
      file_path: '',
      content_type: 'whiteboard',
      content: defaultContent,
      visibility,
      position: nextPosition,
    })
    .select(`
      id,
      project_id,
      parent_id,
      file_name,
      file_path,
      file_size,
      file_type,
      content_type,
      content,
      visibility,
      description,
      position,
      uploaded_by,
      uploaded_at
    `)
    .single()

  if (error) {
    console.error('Failed to create whiteboard:', error)
    throw new Error('Failed to create whiteboard')
  }

  return data as unknown as ProjectFileItem
}

// ============================================
// Common Item Functions
// ============================================

export async function renameItem(itemId: string, newName: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_files')
    .update({ file_name: newName })
    .eq('id', itemId)

  if (error) {
    console.error('Failed to rename item:', error)
    throw new Error('Failed to rename item')
  }
}

export async function moveItem(itemId: string, newParentId: string | null): Promise<void> {
  const supabase = await createClient()

  // Get the item's project_id
  const { data: item } = await supabase
    .from('project_files')
    .select('project_id')
    .eq('id', itemId)
    .single()

  if (!item) {
    throw new Error('Item not found')
  }

  // Get the new parent's visibility (or default to workspace if moving to root)
  let newVisibility: FileVisibility = 'workspace'
  if (newParentId) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', newParentId)
      .single()
    if (parent?.visibility) {
      newVisibility = parent.visibility as FileVisibility
    }
  }

  // Get max position in new parent
  const { data: siblings } = await supabase
    .from('project_files')
    .select('position')
    .eq('project_id', item.project_id)
    .is('parent_id', newParentId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (siblings?.[0]?.position ?? -1) + 1

  // Update the item
  const { error } = await supabase
    .from('project_files')
    .update({
      parent_id: newParentId,
      visibility: newVisibility,
      position: nextPosition,
    })
    .eq('id', itemId)

  if (error) {
    console.error('Failed to move item:', error)
    throw new Error('Failed to move item')
  }

  // If moving a folder, recursively update children's visibility
  await updateChildrenVisibility(itemId, newVisibility)
}

async function updateChildrenVisibility(parentId: string, visibility: FileVisibility): Promise<void> {
  const supabase = await createClient()

  // Get all direct children
  const { data: children } = await supabase
    .from('project_files')
    .select('id, content_type')
    .eq('parent_id', parentId)

  if (!children || children.length === 0) return

  // Update visibility for all children
  const childIds = children.map(c => c.id)
  await supabase
    .from('project_files')
    .update({ visibility })
    .in('id', childIds)

  // Recursively update folders
  for (const child of children) {
    if (child.content_type === 'folder') {
      await updateChildrenVisibility(child.id, visibility)
    }
  }
}

export async function reorderItems(
  projectId: string,
  parentId: string | null,
  itemIds: string[]
): Promise<void> {
  const supabase = await createClient()

  // Update position for each item
  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await supabase
      .from('project_files')
      .update({ position: i })
      .eq('id', itemIds[i])
      .eq('project_id', projectId)

    if (error) {
      console.error('Failed to reorder items:', error)
      throw new Error('Failed to reorder items')
    }
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  // Get item info to check if it's a file with storage
  const { data: item } = await supabase
    .from('project_files')
    .select('content_type, file_path')
    .eq('id', itemId)
    .single()

  if (!item) {
    throw new Error('Item not found')
  }

  // If it's a file with storage path, delete from storage
  if (item.content_type === 'file' && item.file_path) {
    try {
      const url = new URL(item.file_path)
      const storagePath = url.pathname.split('/storage/v1/object/public/general-purpose/')[1]
      if (storagePath) {
        await supabase.storage.from('general-purpose').remove([storagePath])
      }
    } catch {
      // Ignore storage deletion errors
    }
  }

  // Delete the record (CASCADE will handle children)
  const { error } = await supabase
    .from('project_files')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Failed to delete item:', error)
    throw new Error('Failed to delete item')
  }
}

// ============================================
// Proposal Whiteboard Functions
// ============================================

export async function getProposalWhiteboard(inquiryId: string): Promise<unknown> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('proposal_whiteboard')
    .eq('id', inquiryId)
    .single()

  if (error) {
    console.error('Failed to get proposal whiteboard:', error)
    throw new Error('Failed to get proposal whiteboard')
  }

  return data?.proposal_whiteboard
}

export async function updateProposalWhiteboard(inquiryId: string, content: unknown): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ proposal_whiteboard: content })
    .eq('id', inquiryId)

  if (error) {
    console.error('Failed to update proposal whiteboard:', error)
    throw new Error('Failed to update proposal whiteboard')
  }
}
