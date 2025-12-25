'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, File, FileText, Image, Download, Trash2, Loader2 } from 'lucide-react'
import type { UserRole } from '@/lib/auth/types'
import { uploadProjectFileAction, deleteProjectFileAction } from '../../actions/fileActions'

interface ProjectFile {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

interface FilesTabProps {
  projectId: string
  files: ProjectFile[]
  userRole: UserRole
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="h-5 w-5" />
  if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />
  if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}

export function FilesTab({ projectId, files, userRole }: FilesTabProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
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

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
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
                <p className="mt-2 text-sm text-muted-foreground">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload a file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports documents, images, and PDFs
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Project Files</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No files uploaded yet.
            </p>
          ) : (
            <div className="divide-y">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(file.file_type)}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={file.file_path} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
