'use client'

import { useState, useMemo } from 'react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
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
  PenTool,
  Pencil,
} from 'lucide-react'
import type { UserRole } from '@/lib/auth/types'
import type { ProjectFileItem, FileVisibility } from '@/lib/api/project-files.shared'
import { buildFileTree } from '@/lib/api/project-files.shared'
import { DraggableFileTree, type DraggableFileTreeItem } from '@/components/ui/draggable-file-tree'
import {
  deleteItemAction,
  updateProjectFileAction,
  renameItemAction,
  moveItemAction,
} from '../../actions/fileActions'
import { NewItemDropdown } from '../files/NewItemDropdown'
import { DocumentEditor } from '../files/DocumentEditor'
import { WhiteboardEditor } from '../files/WhiteboardEditor'
import { FileViewerModal } from '../files/FileViewerModal'

// ============================================
// Types
// ============================================

interface FilesTabProps {
  projectId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: any[] // Will be cast to ProjectFileItem[] - types regenerated after migration
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

function getFileIcon(item: ProjectFileItem) {
  switch (item.content_type) {
    case 'folder':
      return item.visibility === 'portal' ? (
        <FolderOpen className="h-4 w-4 text-green-500" />
      ) : (
        <FolderLock className="h-4 w-4 text-amber-500" />
      )
    case 'document':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'whiteboard':
      return <PenTool className="h-4 w-4 text-purple-500" />
    case 'file':
    default:
      if (!item.file_type) return <File className="h-4 w-4 text-muted-foreground" />
      if (item.file_type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
      if (item.file_type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
      return <File className="h-4 w-4 text-muted-foreground" />
  }
}

function canChangeVisibility(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'internal'
}

function canDeleteItem(
  userRole: UserRole,
  itemUploaderId: string | null,
  currentUserId: string
): boolean {
  if (userRole === 'admin' || userRole === 'internal') return true
  return itemUploaderId === currentUserId
}

function isRootFolder(item: ProjectFileItem): boolean {
  return (
    item.content_type === 'folder' &&
    !item.parent_id &&
    (item.file_name === 'Internal Files' || item.file_name === 'Shared with Client')
  )
}

// ============================================
// Component
// ============================================

export function FilesTab({ projectId, files, userRole, currentUserId }: FilesTabProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ProjectFileItem | null>(null)
  const [renameItem, setRenameItem] = useState<ProjectFileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [editingDocument, setEditingDocument] = useState<ProjectFileItem | null>(null)
  const [editingWhiteboard, setEditingWhiteboard] = useState<ProjectFileItem | null>(null)
  const [viewingFile, setViewingFile] = useState<ProjectFileItem | null>(null)

  // Role-based visibility: DFY/Client only see portal files
  const canSeeInternalFiles = userRole === 'admin' || userRole === 'internal' || userRole === 'dev'

  // Filter files based on role
  const visibleFiles = useMemo(() => {
    if (canSeeInternalFiles) return files
    return files.filter((f) => f.visibility === 'portal')
  }, [files, canSeeInternalFiles])

  // Build tree structure
  const treeItems = useMemo(() => {
    const tree = buildFileTree(visibleFiles)
    return tree
  }, [visibleFiles])

  const handleDelete = async (item: ProjectFileItem) => {
    setDeletingId(item.id)
    try {
      await deleteItemAction(item.id)
    } catch (error) {
      console.error('Failed to delete item:', error)
    } finally {
      setDeletingId(null)
      setDeleteConfirmItem(null)
    }
  }

  const handleToggleVisibility = async (item: ProjectFileItem) => {
    setTogglingId(item.id)
    const newVisibility: FileVisibility = item.visibility === 'workspace' ? 'portal' : 'workspace'
    try {
      await updateProjectFileAction(item.id, { visibility: newVisibility })
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

  const handleRename = async () => {
    if (!renameItem || !renameValue.trim()) return
    try {
      await renameItemAction(renameItem.id, renameValue.trim())
    } catch (error) {
      console.error('Failed to rename item:', error)
    } finally {
      setRenameItem(null)
      setRenameValue('')
    }
  }

  const handleItemClick = (item: ProjectFileItem) => {
    switch (item.content_type) {
      case 'document':
        setEditingDocument(item)
        break
      case 'whiteboard':
        setEditingWhiteboard(item)
        break
      case 'file':
        // Open file in viewer modal
        if (item.file_path) {
          setViewingFile(item)
        }
        break
      // Folders are handled by the tree expansion
    }
  }

  const handleMove = async (itemId: string, newParentId: string | null, _newIndex: number) => {
    try {
      await moveItemAction(itemId, newParentId)
    } catch (error) {
      console.error('Failed to move item:', error)
    }
  }

  // Convert ProjectFileItem to DraggableFileTreeItem
  const convertToTreeItem = (item: ProjectFileItem): DraggableFileTreeItem => ({
    id: item.id,
    name: item.file_name,
    type: item.content_type === 'folder' ? 'folder' : 'file',
    icon: getFileIcon(item),
    children: item.children?.map(convertToTreeItem),
    data: item,
  })

  const fileTreeItems = treeItems.map(convertToTreeItem)

  const renderFileActions = (treeItem: DraggableFileTreeItem) => {
    const item = treeItem.data as ProjectFileItem
    if (!item) return null

    const isDeleting = deletingId === item.id
    const isToggling = togglingId === item.id
    const showVisibilityToggle = canChangeVisibility(userRole) && !isRootFolder(item)
    const showDelete = canDeleteItem(userRole, item.uploaded_by, currentUserId) && !isRootFolder(item)
    const isFile = item.content_type === 'file'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isFile && item.file_path && (
            <>
              <DropdownMenuItem asChild>
                <a href={item.file_path} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyLink(item.file_path)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {!isRootFolder(item) && (
            <DropdownMenuItem
              onClick={() => {
                setRenameItem(item)
                setRenameValue(item.file_name)
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
          )}

          {showVisibilityToggle && (
            <DropdownMenuItem
              onClick={() => handleToggleVisibility(item)}
              disabled={isToggling}
            >
              {item.visibility === 'workspace' ? (
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
          )}

          {showDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteConfirmItem(item)}
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

  // Determine default parent for new items
  const getDefaultParent = () => {
    // Find the Internal Files folder for new items
    const internalFolder = treeItems.find(
      (f) => f.content_type === 'folder' && f.file_name === 'Internal Files'
    )
    return internalFolder?.id
  }

  // Get current visibility context
  const getDefaultVisibility = (): FileVisibility => {
    return canSeeInternalFiles ? 'workspace' : 'portal'
  }

  return (
    <div className="space-y-6">
      {/* Header with New button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Files</h3>
        <NewItemDropdown
          projectId={projectId}
          parentId={getDefaultParent()}
          visibility={getDefaultVisibility()}
          onItemCreated={(id, type) => {
            if (type === 'document') {
              // Find the created document and open it
              const doc = files.find((f) => f.id === id)
              if (doc) setEditingDocument(doc)
            } else if (type === 'whiteboard') {
              const wb = files.find((f) => f.id === id)
              if (wb) setEditingWhiteboard(wb)
            }
          }}
        />
      </div>

      {/* Files Tree */}
      <Card>
        <CardContent className="pt-6">
          {fileTreeItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No files yet. Click "New" to get started.
            </p>
          ) : (
            <DraggableFileTree
              items={fileTreeItems}
              onFileClick={(item) => handleItemClick(item.data as ProjectFileItem)}
              onMove={handleMove}
              renderFileActions={renderFileActions}
              renderFolderActions={renderFileActions}
              defaultExpanded
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={() => setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirmItem?.content_type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmItem?.content_type === 'folder' ? (
                <>
                  This will permanently delete the folder "{deleteConfirmItem?.file_name}" and all its contents.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete "{deleteConfirmItem?.file_name}".
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmItem && handleDelete(deleteConfirmItem)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameItem} onOpenChange={() => setRenameItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename">Name</Label>
              <Input
                id="rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Editor Modal */}
      {editingDocument && (
        <DocumentEditor
          documentId={editingDocument.id}
          projectId={projectId}
          initialTitle={editingDocument.file_name}
          initialContent={editingDocument.content}
          onClose={() => setEditingDocument(null)}
        />
      )}

      {/* Whiteboard Editor Modal */}
      {editingWhiteboard && (
        <WhiteboardEditor
          whiteboardId={editingWhiteboard.id}
          projectId={projectId}
          initialTitle={editingWhiteboard.file_name}
          initialContent={editingWhiteboard.content}
          onClose={() => setEditingWhiteboard(null)}
        />
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  )
}
