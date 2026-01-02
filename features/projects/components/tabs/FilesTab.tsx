'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Upload,
  File,
  FileText,
  Image,
  Download,
  Trash2,
  Loader2,
  Lock,
  Globe,
  MoreHorizontal,
  Copy,
  FolderLock,
  FolderOpen,
} from 'lucide-react'
import type { UserRole } from '@/lib/auth/types'
import type { ProjectFile, FileVisibility } from '@/lib/api/project-files'
import { FileTree, type FileTreeItem } from '@/components/ui/file-tree'
import {
  uploadProjectFileAction,
  deleteProjectFileAction,
  updateProjectFileAction,
} from '../../actions/fileActions'

// ============================================
// Types
// ============================================

interface FilesTabProps {
  projectId: string
  files: ProjectFile[]
  userRole: UserRole
  currentUserId: string
}

// ============================================
// Helper Functions
// ============================================

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="h-4 w-4 text-muted-foreground" />
  if (fileType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
  if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

function canChangeVisibility(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'internal'
}

function canDeleteFile(
  userRole: UserRole,
  fileUploaderId: string | null,
  currentUserId: string
): boolean {
  if (userRole === 'admin' || userRole === 'internal') return true
  return fileUploaderId === currentUserId
}

// ============================================
// Component
// ============================================

export function FilesTab({ projectId, files, userRole, currentUserId }: FilesTabProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadVisibility, setUploadVisibility] = useState<FileVisibility>('workspace')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Role-based visibility: DFY/Client only see portal files
  const canSeeInternalFiles = userRole === 'admin' || userRole === 'internal' || userRole === 'dev'

  // Filter files based on role
  const visibleFiles = canSeeInternalFiles
    ? files
    : files.filter((f) => f.visibility === 'portal')

  // Group files by visibility
  const workspaceFiles = visibleFiles.filter((f) => f.visibility === 'workspace')
  const portalFiles = visibleFiles.filter((f) => f.visibility === 'portal')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds 50MB limit')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('visibility', uploadVisibility)
      await uploadProjectFileAction(formData)
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId)
    try {
      await deleteProjectFileAction(fileId)
    } catch (error) {
      console.error('Failed to delete file:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleVisibility = async (file: ProjectFile) => {
    setTogglingId(file.id)
    const newVisibility: FileVisibility = file.visibility === 'workspace' ? 'portal' : 'workspace'
    try {
      await updateProjectFileAction(file.id, { visibility: newVisibility })
    } catch (error) {
      console.error('Failed to update visibility:', error)
    } finally {
      setTogglingId(null)
    }
  }

  const handleCopyLink = async (filePath: string) => {
    try {
      await navigator.clipboard.writeText(filePath)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  // Convert files to tree structure
  const buildTree = (): FileTreeItem[] => {
    const tree: FileTreeItem[] = []

    // Only show internal folder if user can see internal files
    if (canSeeInternalFiles) {
      tree.push({
        id: 'folder-workspace',
        name: 'Internal Files',
        type: 'folder',
        icon: <FolderLock className="h-4 w-4 text-amber-500" />,
        children: workspaceFiles.map((file) => ({
          id: file.id,
          name: file.file_name,
          type: 'file' as const,
          icon: getFileIcon(file.file_type),
          data: file,
        })),
      })
    }

    // Always show shared folder
    tree.push({
      id: 'folder-portal',
      name: 'Shared with Client',
      type: 'folder',
      icon: <FolderOpen className="h-4 w-4 text-green-500" />,
      children: portalFiles.map((file) => ({
        id: file.id,
        name: file.file_name,
        type: 'file' as const,
        icon: getFileIcon(file.file_type),
        data: file,
      })),
    })

    return tree
  }

  const renderFileActions = (item: FileTreeItem) => {
    const file = item.data as ProjectFile
    if (!file) return null

    const isDeleting = deletingId === file.id
    const isToggling = togglingId === file.id
    const showVisibilityToggle = canChangeVisibility(userRole)
    const showDelete = canDeleteFile(userRole, file.uploaded_by, currentUserId)

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <a href={file.file_path} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCopyLink(file.file_path)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>

          {showVisibilityToggle && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleToggleVisibility(file)}
                disabled={isToggling}
              >
                {file.visibility === 'workspace' ? (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Share with Client
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Make Internal Only
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}

          {showDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(file.id)}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const treeItems = buildTree()

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            {canSeeInternalFiles && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Upload as:</span>
                <div className="flex rounded-md border">
                  <Button
                    variant={uploadVisibility === 'workspace' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-r-none"
                    onClick={() => setUploadVisibility('workspace')}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    Internal
                  </Button>
                  <Button
                    variant={uploadVisibility === 'portal' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-l-none border-l"
                    onClick={() => setUploadVisibility('portal')}
                  >
                    <Globe className="h-3.5 w-3.5 mr-1.5" />
                    Shared
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
                <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload a file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports documents, images, and PDFs (max 50MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files Tree */}
      <Card>
        <CardContent className="pt-6">
          {visibleFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No files uploaded yet.
            </p>
          ) : (
            <FileTree
              items={treeItems}
              renderFileActions={renderFileActions}
              defaultExpanded
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
