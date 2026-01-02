// ============================================
// Types (Client-safe, no server imports)
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
// Client-Safe Utilities
// ============================================

/**
 * Build tree structure from flat array (client-side utility)
 * This function is safe to use in client components
 */
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
