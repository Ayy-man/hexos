import { createClient } from '@/lib/supabase/server'

// Re-export types and utilities from shared module
export type {
  FileView,
  FileVisibility,
  SharedTo,
  ContentType,
  ProjectFile,
  ProjectFileItem,
  CreateFolderInput,
  CreateDocumentInput,
  CreateWhiteboardInput,
} from './project-files.shared'

export {
  buildFileTree,
  isSharedItem,
  getItemViews,
  isVisibleInView,
} from './project-files.shared'

import type {
  FileView,
  ProjectFile,
  ProjectFileItem,
  CreateFolderInput,
  CreateDocumentInput,
  CreateWhiteboardInput,
} from './project-files.shared'

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
      shared_to,
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
      shared_to,
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
  let visibility: FileView = input.visibility ?? 'internal'
  if (input.parent_id && !input.visibility) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', input.parent_id)
      .single()
    if (parent?.visibility) {
      visibility = parent.visibility as FileView
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
  let visibility: FileView = input.visibility ?? 'internal'
  if (input.parent_id && !input.visibility) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', input.parent_id)
      .single()
    if (parent?.visibility) {
      visibility = parent.visibility as FileView
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
  let visibility: FileView = input.visibility ?? 'internal'
  if (input.parent_id && !input.visibility) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', input.parent_id)
      .single()
    if (parent?.visibility) {
      visibility = parent.visibility as FileView
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

  // Get the new parent's visibility (or default to internal if moving to root)
  let newVisibility: FileView = 'internal'
  if (newParentId) {
    const { data: parent } = await supabase
      .from('project_files')
      .select('visibility')
      .eq('id', newParentId)
      .single()
    if (parent?.visibility) {
      newVisibility = parent.visibility as FileView
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

async function updateChildrenVisibility(parentId: string, visibility: FileView): Promise<void> {
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

// ============================================
// Two Workspaces: View-Based Functions
// ============================================

/**
 * Get files filtered by view (visibility or shared_to)
 */
export async function getProjectFilesForView(
  projectId: string,
  view: FileView
): Promise<ProjectFileItem[]> {
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
      shared_to,
      description,
      position,
      uploaded_by,
      uploaded_at,
      uploader:profiles!uploaded_by(id, name)
    `)
    .eq('project_id', projectId)
    .or(`visibility.eq.${view},shared_to.eq.${view}`)
    .order('position', { ascending: true })

  if (error) {
    console.error('Failed to fetch project files for view:', error)
    throw new Error('Failed to fetch project files for view')
  }

  return (data || []) as unknown as ProjectFileItem[]
}

/**
 * Share an item to another view (makes it visible in both views)
 */
export async function shareItem(itemId: string, targetView: FileView): Promise<void> {
  const supabase = await createClient()

  // Update the item's shared_to
  const { error } = await supabase
    .from('project_files')
    .update({ shared_to: targetView })
    .eq('id', itemId)

  if (error) {
    console.error('Failed to share item:', error)
    throw new Error('Failed to share item')
  }

  // Recursively share children if it's a folder
  await shareChildrenRecursively(itemId, targetView)
}

async function shareChildrenRecursively(parentId: string, targetView: FileView): Promise<void> {
  const supabase = await createClient()

  const { data: children } = await supabase
    .from('project_files')
    .select('id, content_type')
    .eq('parent_id', parentId)

  if (!children || children.length === 0) return

  const childIds = children.map(c => c.id)
  await supabase
    .from('project_files')
    .update({ shared_to: targetView })
    .in('id', childIds)

  for (const child of children) {
    if (child.content_type === 'folder') {
      await shareChildrenRecursively(child.id, targetView)
    }
  }
}

/**
 * Unshare an item (removes from secondary view)
 */
export async function unshareItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_files')
    .update({ shared_to: null })
    .eq('id', itemId)

  if (error) {
    console.error('Failed to unshare item:', error)
    throw new Error('Failed to unshare item')
  }

  // Recursively unshare children
  await unshareChildrenRecursively(itemId)
}

async function unshareChildrenRecursively(parentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: children } = await supabase
    .from('project_files')
    .select('id, content_type')
    .eq('parent_id', parentId)

  if (!children || children.length === 0) return

  const childIds = children.map(c => c.id)
  await supabase
    .from('project_files')
    .update({ shared_to: null })
    .in('id', childIds)

  for (const child of children) {
    if (child.content_type === 'folder') {
      await unshareChildrenRecursively(child.id)
    }
  }
}

/**
 * Move an item to a different view (relocates exclusively, not shared)
 */
export async function moveItemToView(itemId: string, targetView: FileView): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_files')
    .update({ visibility: targetView, shared_to: null })
    .eq('id', itemId)

  if (error) {
    console.error('Failed to move item to view:', error)
    throw new Error('Failed to move item to view')
  }

  // Recursively update children
  await moveChildrenToViewRecursively(itemId, targetView)
}

async function moveChildrenToViewRecursively(parentId: string, targetView: FileView): Promise<void> {
  const supabase = await createClient()

  const { data: children } = await supabase
    .from('project_files')
    .select('id, content_type')
    .eq('parent_id', parentId)

  if (!children || children.length === 0) return

  const childIds = children.map(c => c.id)
  await supabase
    .from('project_files')
    .update({ visibility: targetView, shared_to: null })
    .in('id', childIds)

  for (const child of children) {
    if (child.content_type === 'folder') {
      await moveChildrenToViewRecursively(child.id, targetView)
    }
  }
}

// ============================================
// Main Project Whiteboard Functions
// ============================================

export async function getMainWhiteboard(projectId: string): Promise<unknown> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('main_whiteboard')
    .eq('id', projectId)
    .single()

  if (error) {
    console.error('Failed to get main whiteboard:', error)
    throw new Error('Failed to get main whiteboard')
  }

  return data?.main_whiteboard ?? { elements: [], appState: {}, files: {} }
}

export async function updateMainWhiteboard(projectId: string, content: unknown): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({ main_whiteboard: content })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to update main whiteboard:', error)
    throw new Error('Failed to update main whiteboard')
  }
}
