'use client'

import * as React from 'react'
import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import {
  FileText,
  Save,
  CheckCircle,
  CheckCircle2,
  Clock,
  SendHorizontal,
  Undo2,
  Eye,
  Copy,
  Check,
} from 'lucide-react'
import { createInquiryDocumentPlugins, type DiscussionUser, type TDiscussion } from './editor/plugins'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { discussionPlugin } from '@/components/editor/plugins/discussion-kit'
import type { DeliverablesNegotiationStatus, ProposalStage } from '@/lib/api/inquiries'
import { SuggestChangesButton } from './SuggestChangesButton'
import { editorToMarkdown } from '../utils/editorToMarkdown'
import { toast } from 'sonner'

interface ProposalTabProps {
  inquiryId: string
  initialContent: unknown
  initialDiscussions?: TDiscussion[]
  proposalSubmittedAt: string | null
  proposalStage: ProposalStage
  isAdmin: boolean // admin/internal
  isDfyOwner: boolean // DFY who submitted the inquiry
  currentUser?: DiscussionUser
  deliverablesStatus?: DeliverablesNegotiationStatus
  saveProposal: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  submitProposal: () => Promise<void>
  unsubmitProposal?: () => Promise<void> // Undo send - admin only
  submitForReview?: () => Promise<void> // Submit for internal review
  approveProposal?: () => Promise<void> // Approve proposal (final_review -> ready)
  onStartNegotiation?: () => Promise<{ deliverables?: unknown[]; error?: string }>
}

export function ProposalTab({
  inquiryId,
  initialContent,
  initialDiscussions,
  proposalSubmittedAt,
  proposalStage,
  isAdmin,
  isDfyOwner,
  currentUser,
  deliverablesStatus = 'none',
  saveProposal,
  submitProposal,
  unsubmitProposal,
  submitForReview,
  approveProposal,
  onStartNegotiation,
}: ProposalTabProps) {
  const isSubmitted = !!proposalSubmittedAt

  // Show suggest changes button for DFY when proposal is submitted and no negotiation started
  const canSuggestChanges = isDfyOwner && isSubmitted && deliverablesStatus === 'none' && onStartNegotiation

  // DFY who hasn't had proposal submitted yet
  if (isDfyOwner && !isSubmitted) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Proposal Not Yet Available</h3>
              <p className="text-muted-foreground mt-1">
                The team is still working on your proposal.<br />
                You&apos;ll be able to view it here once it&apos;s ready.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSubmitProposal = useCallback(async () => {
    try {
      await submitProposal()
      toast.success('Proposal submitted to partner')
    } catch (error) {
      console.error('Failed to submit proposal:', error)
      toast.error('Failed to submit proposal')
    }
  }, [submitProposal])

  const handleUnsubmitProposal = useCallback(async () => {
    if (!unsubmitProposal) return
    try {
      await unsubmitProposal()
      toast.success('Proposal submission undone')
    } catch (error) {
      console.error('Failed to unsubmit proposal:', error)
      toast.error('Failed to undo submission')
    }
  }, [unsubmitProposal])

  const handleSubmitForReview = useCallback(async () => {
    if (!submitForReview) return
    try {
      await submitForReview()
      toast.success('Proposal submitted for review')
    } catch (error) {
      console.error('Failed to submit for review:', error)
      toast.error('Failed to submit for review')
    }
  }, [submitForReview])

  const handleApproveProposal = useCallback(async () => {
    if (!approveProposal) return
    try {
      await approveProposal()
      toast.success('Proposal approved')
    } catch (error) {
      console.error('Failed to approve proposal:', error)
      toast.error('Failed to approve proposal')
    }
  }, [approveProposal])

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Proposal Editor */}
      <div className="md:col-span-2">
        <ProposalEditor
          initialContent={initialContent}
          initialDiscussions={initialDiscussions}
          readOnly={!isAdmin}
          currentUser={currentUser}
          isSubmitted={isSubmitted}
          proposalStage={proposalStage}
          onSave={isAdmin ? saveProposal : undefined}
          onSubmit={isAdmin && proposalStage === 'ready' && !isSubmitted ? handleSubmitProposal : undefined}
          onUnsubmit={isAdmin && isSubmitted && unsubmitProposal ? handleUnsubmitProposal : undefined}
          onSubmitForReview={isAdmin && !['final_review', 'ready', 'sent', 'closed', 'lost'].includes(proposalStage) ? handleSubmitForReview : undefined}
          onApprove={isAdmin && proposalStage === 'final_review' ? handleApproveProposal : undefined}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Suggest Changes Card for DFY */}
        {canSuggestChanges && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Want to suggest changes to the deliverables or pricing?
              </p>
              <SuggestChangesButton
                inquiryId={inquiryId}
                onStartNegotiation={onStartNegotiation!}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ============================================
// Proposal Editor Component
// ============================================

interface ProposalEditorProps {
  initialContent: unknown
  initialDiscussions?: TDiscussion[]
  readOnly: boolean
  currentUser?: DiscussionUser
  isSubmitted: boolean
  proposalStage: ProposalStage
  onSave?: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  onSubmit?: () => Promise<void>
  onUnsubmit?: () => Promise<void>
  onSubmitForReview?: () => Promise<void>
  onApprove?: () => Promise<void>
}

function ProposalEditor({
  initialContent,
  initialDiscussions,
  readOnly,
  currentUser,
  isSubmitted,
  proposalStage,
  onSave,
  onSubmit,
  onUnsubmit,
  onSubmitForReview,
  onApprove,
}: ProposalEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [copied, setCopied] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<ReturnType<typeof usePlateEditor> | null>(null)

  // Sanitize content for read-only view by stripping plugin-specific marks
  // This prevents errors when content saved with full plugins is rendered with simpler plugins
  const sanitizeContentForReadOnly = useCallback((content: unknown[]): unknown[] => {
    const sanitizeNode = (node: Record<string, unknown>): Record<string, unknown> => {
      const sanitized: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(node)) {
        // Skip comment, suggestion, and discussion-related keys
        if (
          key.startsWith('comment') ||
          key.startsWith('suggestion') ||
          key.startsWith('discussion') ||
          key === 'suggestionId' ||
          key === 'suggestionDeletion' ||
          key === 'commentId'
        ) {
          continue
        }

        // Recursively sanitize children
        if (key === 'children' && Array.isArray(value)) {
          sanitized.children = value.map((child: Record<string, unknown>) => sanitizeNode(child))
        } else {
          sanitized[key] = value
        }
      }

      return sanitized
    }

    return content.map((node) => sanitizeNode(node as Record<string, unknown>))
  }, [])

  const parsedInitialContent = useMemo(() => {
    if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
      // Sanitize content for read-only mode to remove plugin-specific marks
      if (readOnly) {
        return sanitizeContentForReadOnly(initialContent as unknown[])
      }
      return initialContent
    }
    return [{ type: 'p', children: [{ text: 'Start writing your proposal...' }] }]
  }, [initialContent, readOnly, sanitizeContentForReadOnly])

  // Use simpler plugins for read-only view (DFY) to avoid complex discussion plugin issues
  // Full discussion plugins only for admin edit mode
  const plugins = useMemo(() => {
    if (readOnly) {
      // Simpler plugins for read-only - no discussion/suggestion/comment plugins
      return BlueprintEditorPlugins
    }
    // Ensure discussions are valid arrays with proper structure
    const safeDiscussions = initialDiscussions && Array.isArray(initialDiscussions)
      ? initialDiscussions.filter(
          (d): d is TDiscussion =>
            d &&
            typeof d === 'object' &&
            typeof d.id === 'string' &&
            Array.isArray(d.comments)
        )
      : []
    return createInquiryDocumentPlugins(currentUser, safeDiscussions)
  }, [readOnly, currentUser, initialDiscussions])

  const editor = usePlateEditor({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: plugins as any,
    value: parsedInitialContent,
  })
  editorRef.current = editor

  // Debounced auto-save
  const debouncedSave = useCallback(
    async (content: unknown) => {
      if (!onSave || readOnly) return

      setIsSaving(true)
      try {
        const currentEditor = editorRef.current
        const discussions = currentEditor
          ? (currentEditor.getOption(discussionPlugin, 'discussions') as TDiscussion[])
          : []
        await onSave(content, discussions)
        setLastSaved(new Date())
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to save proposal:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [onSave, readOnly]
  )

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (readOnly) return
      setHasChanges(true)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(value.value)
      }, 1500)
    },
    [debouncedSave, readOnly]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Copy content as markdown
  const handleCopy = useCallback(async () => {
    try {
      const content = editorRef.current?.children || parsedInitialContent
      const markdown = editorToMarkdown(content)
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [parsedInitialContent])

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
            <FileText className="h-4 w-4" />
            Proposal
            {readOnly && (
              <span className="text-xs font-normal text-muted-foreground">
                (Read Only)
              </span>
            )}
            {isSubmitted && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!readOnly && <SaveStatus />}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8"
              title="Copy as markdown"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>

            {/* Submit for Review - yellow, shows when NOT in final_review/ready/sent/closed/lost */}
            {onSubmitForReview && (
              <ButtonHoldAndRelease
                holdDuration={2000}
                onHoldComplete={onSubmitForReview}
                icon={<Eye className="h-4 w-4" />}
                defaultText="Submit for Review"
                holdingText="Submitting..."
                variant="default"
                className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-700"
              />
            )}

            {/* Approve - green, shows when in final_review */}
            {onApprove && (
              <ButtonHoldAndRelease
                holdDuration={2000}
                onHoldComplete={onApprove}
                icon={<CheckCircle2 className="h-4 w-4" />}
                defaultText="Approve"
                holdingText="Approving..."
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white border-green-700"
              />
            )}

            {/* Submit to Partner - cyan, shows when in ready and not submitted */}
            {onSubmit && (
              <ButtonHoldAndRelease
                holdDuration={2000}
                onHoldComplete={onSubmit}
                icon={<SendHorizontal className="h-4 w-4" />}
                defaultText="Submit to Partner"
                holdingText="Submitting..."
                variant="default"
                className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700"
              />
            )}

            {/* Undo Send - shows when submitted */}
            {onUnsubmit && isSubmitted && (
              <ButtonHoldAndRelease
                holdDuration={2000}
                onHoldComplete={onUnsubmit}
                icon={<Undo2 className="h-4 w-4" />}
                defaultText="Undo Send"
                holdingText="Undoing..."
                variant="default"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Plate
          editor={editor}
          onChange={handleChange}
          readOnly={readOnly}
        >
          <EditorContainer className="min-h-[400px] rounded-lg border bg-background">
            <Editor
              placeholder="Start writing your proposal..."
              variant="fullWidth"
              className="px-6 py-4"
            />
          </EditorContainer>

          {!readOnly && (
            <FloatingToolbar>
              <FloatingToolbarButtons />
            </FloatingToolbar>
          )}
        </Plate>
      </CardContent>
    </Card>
  )
}
