import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface RequirementAttachment {
  id: string
  requirement_id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface UploadAttachmentInput {
  requirement_id: string
  file: File
}

// Storage bucket and path configuration
const STORAGE_BUCKET = 'requirement-attachments'

// ============================================
// Query Functions
// ============================================

export async function getRequirementAttachments(
  requirementId: string
): Promise<RequirementAttachment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_attachments')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('uploaded_at', { ascending: false })

  if (error) throw error
  return (data || []) as RequirementAttachment[]
}

export async function getAttachment(
  id: string
): Promise<RequirementAttachment | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_attachments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as RequirementAttachment
}

// ============================================
// Upload Operations
// ============================================

export async function uploadRequirementAttachment(
  requirementId: string,
  file: File,
  projectId: string
): Promise<RequirementAttachment> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  // Generate unique file path: projects/{projectId}/requirements/{requirementId}/{timestamp}_{filename}
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `projects/${projectId}/requirements/${requirementId}/${timestamp}_${sanitizedName}`

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
    .from('requirement_attachments')
    .insert({
      requirement_id: requirementId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type || null,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    // Try to clean up uploaded file if record creation fails
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath])
    throw insertError
  }

  return data as RequirementAttachment
}

// ============================================
// Delete Operations
// ============================================

export async function deleteRequirementAttachment(id: string): Promise<void> {
  const supabase = await createClient()

  // Get the attachment first to get the file path
  const { data: attachment, error: fetchError } = await supabase
    .from('requirement_attachments')
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
    .from('requirement_attachments')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError
}

// ============================================
// URL Generation
// ============================================

export async function getAttachmentUrl(
  filePath: string
): Promise<string> {
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
