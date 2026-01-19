'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { createDocumentAction } from '../../actions/documentActions'

interface NewDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onDocumentCreated: (documentId: string) => void
  defaultVisibility?: 'internal' | 'client'
}

export function NewDocumentDialog({
  open,
  onOpenChange,
  projectId,
  onDocumentCreated,
  defaultVisibility = 'internal',
}: NewDocumentDialogProps) {
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setError(null)
    const slug = generateSlug(title)

    startTransition(async () => {
      try {
        const documentId = await createDocumentAction(projectId, title.trim(), slug, defaultVisibility)
        setTitle('')
        onDocumentCreated(documentId)
      } catch (err) {
        console.error('Failed to create document:', err)
        setError(err instanceof Error ? err.message : 'Failed to create document')
      }
    })
  }

  const handleClose = () => {
    setTitle('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Add a new document to your project for notes, specs, or planning.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Technical Spec, Meeting Notes"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
