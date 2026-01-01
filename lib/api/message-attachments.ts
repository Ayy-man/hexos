import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface MessageAttachment {
  id: string
  message_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}

// Storage bucket configuration
const STORAGE_BUCKET = 'message-attachments'

// ============================================
// Query Functions
// ============================================

export async function getMessageAttachments(
  messageId: string
): Promise<MessageAttachment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('message_attachments')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as MessageAttachment[]
}

export async function getAttachment(
  id: string
): Promise<MessageAttachment | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('message_attachments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as MessageAttachment
}

// ============================================
// Upload Operations
// ============================================

export async function uploadMessageAttachment(
  messageId: string,
  conversationId: string,
  file: File
): Promise<MessageAttachment> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  // Generate unique file path: conversations/{conversationId}/{timestamp}_{filename}
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `conversations/${conversationId}/${timestamp}_${sanitizedName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Create attachment record
  const { data, error: insertError } = await supabase
    .from('message_attachments')
    .insert({
      message_id: messageId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
    })
    .select()
    .single()

  if (insertError) {
    // Try to clean up uploaded file if record creation fails
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath])
    throw insertError
  }

  return data as MessageAttachment
}

/**
 * Upload multiple attachments for a message
 */
export async function uploadMessageAttachments(
  messageId: string,
  conversationId: string,
  files: File[]
): Promise<MessageAttachment[]> {
  const attachments: MessageAttachment[] = []

  for (const file of files) {
    const attachment = await uploadMessageAttachment(messageId, conversationId, file)
    attachments.push(attachment)
  }

  return attachments
}

// ============================================
// Delete Operations
// ============================================

export async function deleteMessageAttachment(id: string): Promise<void> {
  const supabase = await createClient()

  // Get the attachment first to get the file path
  const { data: attachment, error: fetchError } = await supabase
    .from('message_attachments')
    .select('file_path')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError
  if (!attachment) throw new Error('Attachment not found')

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([attachment.file_path])

  if (storageError) {
    console.error('Storage delete error:', storageError)
    // Continue to delete the record even if storage delete fails
  }

  // Delete the record
  const { error: deleteError } = await supabase
    .from('message_attachments')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError
}

// ============================================
// URL Generation
// ============================================

export async function getAttachmentPublicUrl(filePath: string): Promise<string> {
  const supabase = await createClient()

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function getAttachmentSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

// ============================================
// Utility
// ============================================

/**
 * Check if a file type is an image
 */
export function isImageType(fileType: string): boolean {
  return fileType.startsWith('image/')
}

/**
 * Check if a file type is a video
 */
export function isVideoType(fileType: string): boolean {
  return fileType.startsWith('video/')
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}
