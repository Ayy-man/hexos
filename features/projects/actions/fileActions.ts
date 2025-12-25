'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function uploadProjectFileAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string

  if (!file || !projectId) {
    throw new Error('Missing file or project ID')
  }

  // Upload to storage
  const fileExt = file.name.split('.').pop()?.toLowerCase()
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

  // Create file record
  await supabase.from('project_files').insert({
    project_id: projectId,
    file_name: file.name,
    file_path: urlData.publicUrl,
    file_size: file.size,
    file_type: file.type,
    uploaded_by: user.id,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'file_uploaded',
    details: { file_name: file.name },
  })

  revalidatePath(`/projects/${projectId}`)
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
