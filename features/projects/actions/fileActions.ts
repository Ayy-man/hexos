'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FileVisibility } from '@/lib/api/project-files'
import {
  createFolder,
  createDocument,
  createWhiteboard,
  renameItem,
  moveItem,
  reorderItems,
  deleteItem,
  updateFileContent,
} from '@/lib/api/project-files'

export async function uploadProjectFileAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string
  const visibility = (formData.get('visibility') as FileVisibility) || 'workspace'

  if (!file || !projectId) {
    throw new Error('Missing file or project ID')
  }

  // Validate file size (50MB max)
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 50MB limit')
  }

  // Upload to storage
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `project-files/${projectId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('general-purpose')
    .upload(filePath, file, { cacheControl: '3600' })

  if (uploadError) throw new Error('Failed to upload file')

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('general-purpose')
    .getPublicUrl(filePath)

  // Create file record with visibility
  await supabase.from('project_files').insert({
    project_id: projectId,
    file_name: file.name,
    file_path: urlData.publicUrl,
    file_size: file.size,
    file_type: file.type,
    uploaded_by: user.id,
    visibility,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'file_uploaded',
    details: { file_name: file.name, visibility },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function updateProjectFileAction(
  fileId: string,
  updates: { visibility?: FileVisibility; description?: string }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get file info first to get project ID
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id, file_name')
    .eq('id', fileId)
    .single()

  if (!file) throw new Error('File not found')

  // Update file
  const { error } = await supabase
    .from('project_files')
    .update(updates)
    .eq('id', fileId)

  if (error) throw new Error('Failed to update file')

  // Log activity if visibility changed
  if (updates.visibility) {
    await supabase.from('activity_log').insert({
      project_id: file.project_id,
      user_id: user.id,
      action: 'file_visibility_changed',
      details: { file_name: file.file_name, visibility: updates.visibility },
    })
  }

  revalidatePath(`/projects/${file.project_id}`)
}

export async function deleteProjectFileAction(fileId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get file info
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id, file_path, file_name')
    .eq('id', fileId)
    .single()

  if (!file) throw new Error('File not found')

  // Extract storage path from URL
  const url = new URL(file.file_path)
  const storagePath = url.pathname.split('/storage/v1/object/public/general-purpose/')[1]

  if (storagePath) {
    // Delete from storage
    await supabase.storage
      .from('general-purpose')
      .remove([storagePath])
  }

  // Delete record
  await supabase.from('project_files').delete().eq('id', fileId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: file.project_id,
    user_id: user.id,
    action: 'file_deleted',
    details: { file_name: file.file_name },
  })

  revalidatePath(`/projects/${file.project_id}`)
}

// ============================================
// Folder Actions
// ============================================

export async function createFolderAction(
  projectId: string,
  name: string,
  parentId?: string | null,
  visibility?: FileVisibility
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const folder = await createFolder({
    project_id: projectId,
    name,
    parent_id: parentId,
    visibility,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'folder_created',
    details: { folder_name: name },
  })

  revalidatePath(`/projects/${projectId}`)
  return { id: folder.id }
}

// ============================================
// Document Actions
// ============================================

export async function createDocumentAction(
  projectId: string,
  name: string,
  parentId?: string | null,
  visibility?: FileVisibility
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const doc = await createDocument({
    project_id: projectId,
    name,
    parent_id: parentId,
    visibility,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'document_created',
    details: { document_name: name },
  })

  revalidatePath(`/projects/${projectId}`)
  return { id: doc.id }
}

export async function updateDocumentContentAction(
  itemId: string,
  content: unknown
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get project ID for revalidation
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id')
    .eq('id', itemId)
    .single()

  await updateFileContent(itemId, content)

  if (file) {
    revalidatePath(`/projects/${file.project_id}`)
  }
}

// ============================================
// Whiteboard Actions
// ============================================

export async function createWhiteboardAction(
  projectId: string,
  name: string,
  parentId?: string | null,
  visibility?: FileVisibility
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const whiteboard = await createWhiteboard({
    project_id: projectId,
    name,
    parent_id: parentId,
    visibility,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'whiteboard_created',
    details: { whiteboard_name: name },
  })

  revalidatePath(`/projects/${projectId}`)
  return { id: whiteboard.id }
}

export async function updateWhiteboardContentAction(
  itemId: string,
  content: unknown
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get project ID for revalidation
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id')
    .eq('id', itemId)
    .single()

  await updateFileContent(itemId, content)

  if (file) {
    revalidatePath(`/projects/${file.project_id}`)
  }
}

// ============================================
// Common Item Actions
// ============================================

export async function renameItemAction(
  itemId: string,
  newName: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get project ID for revalidation
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id, file_name')
    .eq('id', itemId)
    .single()

  if (!file) throw new Error('Item not found')

  await renameItem(itemId, newName)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: file.project_id,
    user_id: user.id,
    action: 'item_renamed',
    details: { old_name: file.file_name, new_name: newName },
  })

  revalidatePath(`/projects/${file.project_id}`)
}

export async function moveItemAction(
  itemId: string,
  newParentId: string | null
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get project ID for revalidation
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id, file_name')
    .eq('id', itemId)
    .single()

  if (!file) throw new Error('Item not found')

  await moveItem(itemId, newParentId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: file.project_id,
    user_id: user.id,
    action: 'item_moved',
    details: { item_name: file.file_name },
  })

  revalidatePath(`/projects/${file.project_id}`)
}

export async function reorderItemsAction(
  projectId: string,
  parentId: string | null,
  itemIds: string[]
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await reorderItems(projectId, parentId, itemIds)

  revalidatePath(`/projects/${projectId}`)
}

export async function deleteItemAction(
  itemId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get item info for logging
  const { data: file } = await supabase
    .from('project_files')
    .select('project_id, file_name, content_type')
    .eq('id', itemId)
    .single()

  if (!file) throw new Error('Item not found')

  await deleteItem(itemId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: file.project_id,
    user_id: user.id,
    action: `${file.content_type}_deleted`,
    details: { name: file.file_name },
  })

  revalidatePath(`/projects/${file.project_id}`)
}
