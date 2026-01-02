import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type FileVisibility = 'workspace' | 'portal'

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
