'use client'

import * as React from 'react'
import { useCallback, useState, useMemo, useRef, useEffect, useTransition } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Lock,
  Save,
  CheckCircle,
  Clock,
  Copy,
  ShieldAlert,
} from 'lucide-react'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { toast } from 'sonner'

interface MyVersionTabProps {
  inquiryId: string
  initialContent: unknown
  proposalContent: unknown // To copy from
  proposalSubmittedAt: string | null // Must be submitted to enable
  saveContent: (content: unknown) => Promise<void>
  copyFromProposal: () => Promise<void>
}

export function MyVersionTab({
  inquiryId,
  initialContent,
  proposalContent,
  proposalSubmittedAt,
  saveContent,
  copyFromProposal,
}: MyVersionTabProps) {
  const isProposalSubmitted = !!proposalSubmittedAt
  const hasExistingContent = initialContent && Array.isArray(initialContent) && initialContent.length > 0
  const hasProposalContent = proposalContent && Array.isArray(proposalContent) && proposalContent.length > 0

  // Not available if proposal not submitted
  if (!isProposalSubmitted) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Not Available Yet</h3>
              <p className="text-muted-foreground mt-1">
                You can create your version after the proposal is submitted.<br />
                Check back once the team has shared the proposal with you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Privacy Disclaimer */}
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>This is your private workspace.</strong> Only you can see this tab.
          Admins and other team members do not have access to your version.
          Use this space to customize the proposal for your client.
        </AlertDescription>
      </Alert>

      {/* Editor */}
      <MyVersionEditor
        initialContent={initialContent}
        proposalContent={proposalContent}
        hasExistingContent={!!hasExistingContent}
        hasProposalContent={!!hasProposalContent}
        onSave={saveContent}
        onCopyFromProposal={copyFromProposal}
      />
    </div>
  )
}

// ============================================
// My Version Editor Component
// ============================================

interface MyVersionEditorProps {
  initialContent: unknown
  proposalContent: unknown
  hasExistingContent: boolean
  hasProposalContent: boolean
  onSave: (content: unknown) => Promise<void>
  onCopyFromProposal: () => Promise<void>
}

function MyVersionEditor({
  initialContent,
  proposalContent,
  hasExistingContent,
  hasProposalContent,
  onSave,
  onCopyFromProposal,
}: MyVersionEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isPending, startTransition] = useTransition()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const parsedInitialContent = useMemo(() => {
    if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
      return initialContent
    }
    return [{ type: 'p', children: [{ text: 'Start customizing your proposal here...' }] }]
  }, [initialContent])

  const editor = usePlateEditor({
    plugins: BlueprintEditorPlugins,
    value: parsedInitialContent,
  })

  // Debounced auto-save
  const debouncedSave = useCallback(
    async (content: unknown) => {
      setIsSaving(true)
      try {
        await onSave(content)
        setLastSaved(new Date())
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to save:', error)
        toast.error('Failed to save changes')
      } finally {
        setIsSaving(false)
      }
    },
    [onSave]
  )

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      setHasChanges(true)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(value.value)
      }, 1500)
    },
    [debouncedSave]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleCopyFromProposal = useCallback(async () => {
    startTransition(async () => {
      try {
        await onCopyFromProposal()
        toast.success('Proposal copied to your version')
        // Reload the page to get fresh content
        window.location.reload()
      } catch (error) {
        console.error('Failed to copy proposal:', error)
        toast.error('Failed to copy proposal')
      }
    })
  }, [onCopyFromProposal])

  const SaveStatus = () => {
    if (isSaving) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Save className="h-3 w-3 animate-pulse" />
          Saving...
        </span>
      )
    }
    if (lastSaved) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Saved
        </span>
      )
    }
    if (hasChanges) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Unsaved changes
        </span>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            My Version
            <span className="text-xs font-normal text-muted-foreground">
              (Private)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <SaveStatus />
            {hasProposalContent && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy from Proposal
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Copy from Proposal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {hasExistingContent
                        ? 'This will replace your current version with the official proposal. Any changes you\'ve made will be lost.'
                        : 'This will copy the official proposal to your version. You can then customize it for your client.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCopyFromProposal}>
                      {hasExistingContent ? 'Replace' : 'Copy'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Plate
          editor={editor}
          onChange={handleChange}
        >
          <EditorContainer className="min-h-[500px] rounded-lg border bg-background">
            <Editor
              placeholder="Start customizing your proposal here..."
              variant="fullWidth"
              className="px-6 py-4"
            />
          </EditorContainer>

          <FloatingToolbar>
            <FloatingToolbarButtons />
          </FloatingToolbar>
        </Plate>
      </CardContent>
    </Card>
  )
}
