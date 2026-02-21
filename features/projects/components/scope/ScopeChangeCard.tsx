'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  ChevronDown,
  ChevronRight,
  Check,
  X,
  MessageSquare,
  Clock,
  User,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScopeChangeStatusBadge } from './ScopeChangeStatusBadge'
import { ScopeChangeTypeBadge } from './ScopeChangeTypeBadge'
import type { ScopeChangeWithRelations } from '@/lib/types/scope-monitoring'
import { formatHoursDelta, formatTimelineDelta } from '@/lib/types/scope-monitoring'
import { approveScopeChangeAction, rejectScopeChangeAction } from '../../actions/scopeActions'

interface ScopeChangeCardProps {
  scopeChange: ScopeChangeWithRelations
  projectId: string
  isAdmin: boolean
  onUpdate?: () => void
}

export function ScopeChangeCard({
  scopeChange,
  projectId,
  isAdmin,
  onUpdate,
}: ScopeChangeCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPending = scopeChange.status === 'pending_review' || scopeChange.status === 'detected'
  const canApprove = isAdmin && isPending

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await approveScopeChangeAction(scopeChange.id, projectId)
      toast.success('Scope change approved')
      onUpdate?.()
    } catch (error) {
      console.error('Failed to approve scope change:', error)
      toast.error('Failed to approve scope change')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setIsRejecting(true)
    try {
      await rejectScopeChangeAction(scopeChange.id, projectId, rejectReason)
      toast.success('Scope change rejected')
      setShowRejectDialog(false)
      setRejectReason('')
      onUpdate?.()
    } catch (error) {
      console.error('Failed to reject scope change:', error)
      toast.error('Failed to reject scope change')
    } finally {
      setIsRejecting(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ScopeChangeStatusBadge status={scopeChange.status} />
                      {scopeChange.request_type && (
                        <ScopeChangeTypeBadge type={scopeChange.request_type} variant="request" />
                      )}
                      <ScopeChangeTypeBadge type={scopeChange.trigger_type} variant="trigger" />
                    </div>
                    <p className="text-sm line-clamp-2">{scopeChange.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(scopeChange.created_at)}
                      </span>
                      {scopeChange.requester && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {scopeChange.requester.name || scopeChange.requester.email}
                        </span>
                      )}
                      {scopeChange.affected_deliverable && (
                        <span className="truncate">
                          Re: {scopeChange.affected_deliverable.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canApprove && (
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                    >
                      {isApproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isApproving || isRejecting}
                    >
                      <X className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Reject</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 border-t">
              <div className="space-y-4 pt-4">
                {/* Change Delta */}
                {scopeChange.change_delta && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Change Details</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {scopeChange.change_delta.field}:
                      </span>
                      <span className="line-through text-red-600">
                        {String(scopeChange.change_delta.before || 'none')}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-green-600">
                        {String(scopeChange.change_delta.after || 'none')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Impact */}
                {(scopeChange.hours_delta || scopeChange.timeline_delta_days || scopeChange.cost_delta) && (
                  <div className="grid grid-cols-3 gap-4">
                    {scopeChange.hours_delta !== null && scopeChange.hours_delta !== 0 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Hours Impact</p>
                        <p className={`text-lg font-medium ${scopeChange.hours_delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatHoursDelta(scopeChange.hours_delta)}
                        </p>
                      </div>
                    )}
                    {scopeChange.timeline_delta_days !== null && scopeChange.timeline_delta_days !== 0 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Timeline Impact</p>
                        <p className={`text-lg font-medium ${scopeChange.timeline_delta_days > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatTimelineDelta(scopeChange.timeline_delta_days)}
                        </p>
                      </div>
                    )}
                    {scopeChange.cost_delta !== null && scopeChange.cost_delta !== 0 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Cost Impact</p>
                        <p className={`text-lg font-medium ${scopeChange.cost_delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {scopeChange.cost_delta > 0 ? '+' : ''}${scopeChange.cost_delta}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resolution Info */}
                {(scopeChange.approved_at || scopeChange.rejected_at) && (
                  <div className="border-t pt-4">
                    {scopeChange.approved_at && scopeChange.approver && (
                      <p className="text-sm text-green-600">
                        Approved by {scopeChange.approver.name || scopeChange.approver.email} on{' '}
                        {formatDate(scopeChange.approved_at)}
                      </p>
                    )}
                    {scopeChange.rejected_at && scopeChange.rejecter && (
                      <div>
                        <p className="text-sm text-red-600">
                          Rejected by {scopeChange.rejecter.name || scopeChange.rejecter.email} on{' '}
                          {formatDate(scopeChange.rejected_at)}
                        </p>
                        {scopeChange.rejection_reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {scopeChange.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Scope Change</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this scope change. The requester will be
              notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
