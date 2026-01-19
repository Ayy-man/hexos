'use client'

import { useState, useEffect, useRef } from 'react'
import { FileSidebar } from './FileSidebar'
import { DocumentEditorFullscreen } from './DocumentEditorFullscreen'
import { FileViewerModal } from '../files/FileViewerModal'
import { NewDocumentDialog } from '../gameplan/NewDocumentDialog'
import { useFilesTabState } from './useFilesTabState'
import { getProjectDocumentsAction } from '../../actions/documentActions'
import { getProjectFilesAction, uploadProjectFileAction } from '../../actions/fileActions'
import { FileText } from 'lucide-react'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectFileItem } from '@/lib/api/project-files.shared'
import type { ProjectMentionables } from '@/lib/api/mentionables'
import type { UserRole } from '@/lib/auth/types'
import type { PreloadedProjectData } from '@/hooks/use-project-preload'

interface FilesTabContainerProps {
  projectId: string
  userRole: UserRole
  isExpanded: boolean
  preloadedData?: PreloadedProjectData | null
}

export function FilesTabContainer({
  projectId,
  userRole,
  isExpanded,
  preloadedData,
}: FilesTabContainerProps) {
  // Use preloaded data if available, otherwise initialize empty
  const [documents, setDocuments] = useState<ProjectDocument[]>(
    preloadedData?.documents || []
  )
  const [files, setFiles] = useState<ProjectFileItem[]>(
    preloadedData?.files || []
  )
  const [mentionables, setMentionables] = useState<ProjectMentionables>(
    preloadedData?.mentionables || { users: [], deliverables: [] }
  )
  const [showNewDocDialog, setShowNewDocDialog] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update state when preloaded data arrives
  useEffect(() => {
    if (preloadedData) {
      setDocuments(preloadedData.documents)
      setFiles(preloadedData.files)
      setMentionables(preloadedData.mentionables)
    }
  }, [preloadedData])

  const {
    selectedFileId,
    selectedFileType,
    visibility,
    selectedDocument,
    selectedUpload,
    selectDocument,
    selectFile,
    setVisibility,
    canToggleVisibility,
  } = useFilesTabState({ userRole, documents, files })

  const handleNewDocument = () => {
    setShowNewDocDialog(true)
  }

  const handleDocumentCreated = async (docId: string) => {
    // Refresh documents and select the new one
    const result = await getProjectDocumentsAction(projectId)
    if (!result.error) {
      setDocuments(result.documents)
      selectDocument(docId)
    }
    setShowNewDocDialog(false)
  }

  const handleUploadFile = () => {
    fileInputRef.current?.click()
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
      await uploadProjectFileAction(formData)

      // Refresh files list
      const result = await getProjectFilesAction(projectId)
      if (!result.error) {
        setFiles(result.files)
      }
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Determine edit permissions
  const canEdit = (() => {
    if (visibility === 'internal') {
      return ['admin', 'internal', 'dev'].includes(userRole)
    } else {
      // Client visibility - admin/internal can write, dfy is read-only for docs
      return ['admin', 'internal'].includes(userRole)
    }
  })()

  return (
    <div className="flex h-full w-full">
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {/* Sidebar */}
      <FileSidebar
        isExpanded={isExpanded}
        documents={documents}
        files={files}
        visibility={visibility}
        selectedFileId={selectedFileId}
        selectedFileType={selectedFileType}
        canToggleVisibility={canToggleVisibility}
        userRole={userRole}
        onVisibilityChange={setVisibility}
        onDocumentSelect={selectDocument}
        onFileSelect={selectFile}
        onNewDocument={handleNewDocument}
        onUploadFile={handleUploadFile}
      />

      {/* Main content area */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedDocument ? (
          <DocumentEditorFullscreen
            key={selectedDocument.id}
            document={selectedDocument}
            projectId={projectId}
            mentionables={mentionables}
            canEdit={canEdit}
          />
        ) : selectedUpload ? (
          <FileViewerModal
            file={selectedUpload}
            onClose={() => selectDocument(documents[0]?.id || '')}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No document selected</h3>
            <p className="text-sm text-muted-foreground">
              Select a document from the sidebar to view or edit it.
            </p>
          </div>
        )}
      </div>

      {/* New Document Dialog */}
      <NewDocumentDialog
        open={showNewDocDialog}
        onOpenChange={setShowNewDocDialog}
        projectId={projectId}
        onDocumentCreated={handleDocumentCreated}
        defaultVisibility={visibility}
      />
    </div>
  )
}
