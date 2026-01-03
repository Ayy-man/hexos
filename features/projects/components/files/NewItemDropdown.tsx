'use client'

import { useState, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Folder, Upload, FileText, Loader2 } from 'lucide-react'
import type { FileView } from '@/lib/api/project-files.shared'
import {
  createFolderAction,
  createDocumentAction,
  uploadProjectFileAction,
} from '../../actions/fileActions'

interface NewItemDropdownProps {
  projectId: string
  parentId?: string | null
  visibility: FileView
  onItemCreated?: (id: string, type: 'folder' | 'document') => void
  disabled?: boolean
}

type DialogType = 'folder' | 'document' | null

export function NewItemDropdown({
  projectId,
  parentId,
  visibility,
  onItemCreated,
  disabled,
}: NewItemDropdownProps) {
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = async () => {
    if (!name.trim()) return

    setIsCreating(true)
    try {
      let result: { id: string } | undefined

      switch (dialogType) {
        case 'folder':
          result = await createFolderAction(projectId, name.trim(), parentId, visibility)
          break
        case 'document':
          result = await createDocumentAction(projectId, name.trim(), parentId, visibility)
          break
      }

      if (result && onItemCreated && dialogType) {
        onItemCreated(result.id, dialogType)
      }

      setDialogType(null)
      setName('')
    } catch (error) {
      console.error('Failed to create item:', error)
    } finally {
      setIsCreating(false)
    }
  }

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
      formData.append('visibility', visibility)
      if (parentId) {
        formData.append('parentId', parentId)
      }
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

  const getDialogTitle = () => {
    switch (dialogType) {
      case 'folder':
        return 'New Folder'
      case 'document':
        return 'New Document'
      default:
        return ''
    }
  }

  const getPlaceholder = () => {
    switch (dialogType) {
      case 'folder':
        return 'Folder name'
      case 'document':
        return 'Document title'
      default:
        return ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled || isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setDialogType('folder')}>
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialogType('document')}>
            <FileText className="h-4 w-4 mr-2 text-blue-500" />
            New Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              Enter a name for your new {dialogType}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={getPlaceholder()}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
