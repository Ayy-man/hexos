'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Heart, HeartHandshake, HeartOff, X, Loader2 } from 'lucide-react'
import { setCommitmentStatusAction, removeCommitmentAction } from '../actions/preCommitmentActions'
import { CommitmentStatusBadge } from './CommitmentStatusBadge'
import { formatDistanceToNow } from 'date-fns'
import type { CommitmentStatus } from '@/lib/api/project-invitations'

interface PreCommitmentTabProps {
  opportunityId: string
  currentStatus: CommitmentStatus
  currentNote: string | null
  committedAt: string | null
  onUpdate?: (status: CommitmentStatus) => void
}

type SelectableStatus = 'interested' | 'committed' | 'declined'

export function PreCommitmentTab({
  opportunityId,
  currentStatus,
  currentNote,
  committedAt,
  onUpdate,
}: PreCommitmentTabProps) {
  const [selectedStatus, setSelectedStatus] = useState<SelectableStatus | null>(
    currentStatus as SelectableStatus | null
  )
  const [note, setNote] = useState(currentNote || '')
  const [isPending, startTransition] = useTransition()

  const hasChanges = selectedStatus !== currentStatus || note !== (currentNote || '')
  const showNoteField = selectedStatus === 'interested' || selectedStatus === 'committed'

  const handleUpdate = () => {
    if (!selectedStatus) return

    startTransition(async () => {
      const result = await setCommitmentStatusAction({
        opportunityId,
        status: selectedStatus,
        note: showNoteField ? note : undefined,
      })

      if (result.success) {
        toast.success(`Status updated to ${selectedStatus}`)
        onUpdate?.(selectedStatus)
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleClear = () => {
    startTransition(async () => {
      const result = await removeCommitmentAction(opportunityId)

      if (result.success) {
        setSelectedStatus(null)
        setNote('')
        toast.success('Commitment cleared')
        onUpdate?.(null)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Pre-commitment</CardTitle>
            <CardDescription className="text-sm">
              Signal your interest before bidding opens
            </CardDescription>
          </div>
          {currentStatus && (
            <CommitmentStatusBadge status={currentStatus} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status info */}
        {currentStatus === 'committed' && committedAt && (
          <p className="text-sm text-muted-foreground">
            Committed {formatDistanceToNow(new Date(committedAt), { addSuffix: true })}
          </p>
        )}
        {currentNote && currentStatus && (
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">{currentNote}</p>
          </div>
        )}

        {/* Status selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Your interest level</Label>
          <RadioGroup
            value={selectedStatus || ''}
            onValueChange={(value) => setSelectedStatus(value as SelectableStatus)}
            className="grid gap-2"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="interested" id="interested" />
              <Label
                htmlFor="interested"
                className="flex items-center gap-2 cursor-pointer font-normal flex-1"
              >
                <Heart className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Interested</p>
                  <p className="text-xs text-muted-foreground">
                    I want to be notified when bidding opens
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="committed" id="committed" />
              <Label
                htmlFor="committed"
                className="flex items-center gap-2 cursor-pointer font-normal flex-1"
              >
                <HeartHandshake className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Committed</p>
                  <p className="text-xs text-muted-foreground">
                    I'm planning to bid on this project
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="declined" id="declined" />
              <Label
                htmlFor="declined"
                className="flex items-center gap-2 cursor-pointer font-normal flex-1"
              >
                <HeartOff className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium text-sm">Not Interested</p>
                  <p className="text-xs text-muted-foreground">
                    Hide this opportunity from my view
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Note field - only for interested/committed */}
        {showNoteField && (
          <div className="space-y-2">
            <Label htmlFor="commitment-note" className="text-sm font-medium">
              Add a note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="commitment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you interested? Any relevant experience?"
              className="resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleUpdate}
            disabled={isPending || !hasChanges || !selectedStatus}
            className="flex-1"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
          {currentStatus && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Helpful text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>
            Pre-committing helps admins prioritize who to notify when opportunities open for bidding.
          </p>
          <p>
            Your commitment doesn't guarantee assignment - you'll still need to submit a bid.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
