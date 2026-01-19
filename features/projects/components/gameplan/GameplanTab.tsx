'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, History, FileText } from 'lucide-react'
import { GameplanEditor } from './GameplanEditor'
import { DocumentTabs } from './DocumentTabs'
import { VersionHistoryPanel } from './VersionHistoryPanel'
import { NewDocumentDialog } from './NewDocumentDialog'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectMentionables } from '@/lib/api/mentionables'
import type { UserRole } from '@/lib/auth/types'

interface GameplanTabProps {
  projectId: string
  documents: ProjectDocument[]
  mentionables: ProjectMentionables
  userRole: UserRole
  isAdmin: boolean
}

export function GameplanTab({
  projectId,
  documents,
  mentionables,
  userRole,
  isAdmin,
}: GameplanTabProps) {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    documents.find((d) => d.slug === 'gameplan')?.id || documents[0]?.id || null
  )
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showNewDocDialog, setShowNewDocDialog] = useState(false)
  const [localDocuments, setLocalDocuments] = useState(documents)

  // Update local documents when props change
  useEffect(() => {
    setLocalDocuments(documents)
    // If active document was deleted, switch to first
    if (activeDocumentId && !documents.find((d) => d.id === activeDocumentId)) {
      setActiveDocumentId(documents[0]?.id || null)
    }
  }, [documents, activeDocumentId])

  const activeDocument = localDocuments.find((d) => d.id === activeDocumentId)
  const canEdit = userRole === 'admin' || userRole === 'internal' || userRole === 'dev'
  const canDelete = userRole === 'admin' || userRole === 'internal'

  const handleDocumentCreated = (newDocId: string) => {
    setActiveDocumentId(newDocId)
    setShowNewDocDialog(false)
  }

  const handleDocumentDeleted = () => {
    // Switch to first available document
    const remaining = localDocuments.filter((d) => d.id !== activeDocumentId)
    setActiveDocumentId(remaining[0]?.id || null)
  }

  if (!activeDocument && localDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a gameplan to organize your project planning.
        </p>
        {canEdit && (
          <Button onClick={() => setShowNewDocDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Document
          </Button>
        )}
        <NewDocumentDialog
          open={showNewDocDialog}
          onOpenChange={setShowNewDocDialog}
          projectId={projectId}
          onDocumentCreated={handleDocumentCreated}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Document tabs header */}
      <div className="flex items-center justify-between border-b pb-2 mb-4">
        <DocumentTabs
          documents={localDocuments}
          activeDocumentId={activeDocumentId}
          onDocumentSelect={setActiveDocumentId}
          onNewDocument={() => setShowNewDocDialog(true)}
          canEdit={canEdit}
        />

        <div className="flex items-center gap-2">
          {activeDocument && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="text-muted-foreground"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          )}
        </div>
      </div>

      {/* Editor + Version History */}
      <div className="flex-1 flex gap-4">
        {/* Main editor area */}
        <div className="flex-1">
          {activeDocument && (
            <GameplanEditor
              key={activeDocument.id}
              document={activeDocument}
              projectId={projectId}
              mentionables={mentionables}
              canEdit={canEdit}
              canDelete={canDelete && activeDocument.slug !== 'gameplan'}
              onDeleted={handleDocumentDeleted}
            />
          )}
        </div>

        {/* Version history sidebar */}
        {showVersionHistory && activeDocument && (
          <VersionHistoryPanel
            documentId={activeDocument.id}
            projectId={projectId}
            onClose={() => setShowVersionHistory(false)}
          />
        )}
      </div>

      {/* New document dialog */}
      <NewDocumentDialog
        open={showNewDocDialog}
        onOpenChange={setShowNewDocDialog}
        projectId={projectId}
        onDocumentCreated={handleDocumentCreated}
      />
    </div>
  )
}
