'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Calendar, Check, X, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { approveExtensionAction, rejectExtensionAction } from '../../actions/extensionActions'
import type { ProjectExtension } from '@/lib/api/project-extensions'

interface ExtensionApprovalCardProps {
  extension: ProjectExtension
  projectId: string
  onAction?: () => void
}

export function ExtensionApprovalCard({
  extension,
  projectId,
  onAction,
}: ExtensionApprovalCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [notes, setNotes] = useState('')

  const handleApprove = () => {
    startTransition(async () => {
      await approveExtensionAction(extension.id, projectId, notes || undefined)
      setShowApproveDialog(false)
      setNotes('')
      onAction?.()
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      await rejectExtensionAction(extension.id, projectId, notes || undefined)
      setShowRejectDialog(false)
      setNotes('')
      onAction?.()
    })
  }

  const isPending_ = extension.status === 'pending'

  return (
    <>
      <Card className={isPending_ ? 'border-amber-200 dark:border-amber-800' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Extension Request
            </CardTitle>
            <Badge
              variant={
                extension.status === 'approved'
                  ? 'default'
                  : extension.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {extension.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Original</div>
              <div className="font-medium">
                {new Date(extension.original_deadline).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Requested</div>
              <div className="font-medium">
                {new Date(extension.requested_deadline).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Extension Breakdown</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-muted-foreground">Client delays:</span>
                <span className="font-medium">{extension.client_delay_days} days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span className="text-muted-foreground">Additional:</span>
                <span className="font-medium">{extension.additional_days} days</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Reason</div>
            <p className="text-sm">{extension.reason}</p>
          </div>

          {/* Requester info */}
          <div className="text-xs text-muted-foreground">
            Requested by {extension.requester?.name || 'Unknown'}{' '}
            {formatDistanceToNow(new Date(extension.requested_at), { addSuffix: true })}
          </div>

          {/* Review notes (if reviewed) */}
          {extension.reviewed_at && extension.review_notes && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Review Notes</div>
              <p className="text-sm">{extension.review_notes}</p>
              <div className="text-xs text-muted-foreground mt-1">
                Reviewed by {extension.reviewer?.name || 'Unknown'}{' '}
                {formatDistanceToNow(new Date(extension.reviewed_at), { addSuffix: true })}
              </div>
            </div>
          )}

          {/* Actions for pending */}
          {isPending_ && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowRejectDialog(true)}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => setShowApproveDialog(true)}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Extension</AlertDialogTitle>
            <AlertDialogDescription>
              This will extend the deadline to{' '}
              {new Date(extension.requested_deadline).toLocaleDateString()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="approveNotes">Notes (optional)</Label>
            <Textarea
              id="approveNotes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleApprove} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Approve
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Extension</AlertDialogTitle>
            <AlertDialogDescription>
              The deadline will remain at{' '}
              {new Date(extension.original_deadline).toLocaleDateString()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rejectNotes">Reason for rejection</Label>
            <Textarea
              id="rejectNotes"
              placeholder="Explain why..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
