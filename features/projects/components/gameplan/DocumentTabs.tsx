'use client'

import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectDocument } from '@/lib/api/project-documents'

interface DocumentTabsProps {
  documents: ProjectDocument[]
  activeDocumentId: string | null
  onDocumentSelect: (id: string) => void
  onNewDocument: () => void
  canEdit: boolean
}

export function DocumentTabs({
  documents,
  activeDocumentId,
  onDocumentSelect,
  onNewDocument,
  canEdit,
}: DocumentTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {documents.map((doc) => (
        <Button
          key={doc.id}
          variant="ghost"
          size="sm"
          onClick={() => onDocumentSelect(doc.id)}
          className={cn(
            'gap-2 px-3 py-1.5 h-auto font-normal',
            activeDocumentId === doc.id
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-4 w-4" />
          {doc.title}
        </Button>
      ))}

      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewDocument}
          className="gap-2 px-3 py-1.5 h-auto text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      )}
    </div>
  )
}
