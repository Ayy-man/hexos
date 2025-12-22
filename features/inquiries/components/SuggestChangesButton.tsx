'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, MessageSquareDiff } from 'lucide-react'
import { toast } from 'sonner'

interface SuggestChangesButtonProps {
  inquiryId: string
  hasDeliverables: boolean
  deliverablesStatus: string
  onStartNegotiation: () => Promise<void>
}

export function SuggestChangesButton({
  inquiryId,
  hasDeliverables,
  deliverablesStatus,
  onStartNegotiation,
}: SuggestChangesButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStart = async () => {
    setIsLoading(true)
    try {
      await onStartNegotiation()
      toast.success('Opening deliverables editor...')
      setOpen(false)
      // Navigate to the deliverables tab
      router.push(`/inquiries/${inquiryId}?tab=deliverables`)
    } catch (error) {
      console.error('Error starting negotiation:', error)
      toast.error('Failed to start negotiation')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show if already in negotiation
  if (deliverablesStatus !== 'none' && deliverablesStatus !== 'approved') {
    return null
  }

  // Show "View Deliverables" if already has deliverables
  if (hasDeliverables) {
    return (
      <Button
        variant="outline"
        onClick={() => router.push(`/inquiries/${inquiryId}?tab=deliverables`)}
      >
        <MessageSquareDiff className="h-4 w-4 mr-2" />
        View Deliverables
      </Button>
    )
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <MessageSquareDiff className="h-4 w-4 mr-2" />
        Suggest Changes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Changes to Deliverables</DialogTitle>
            <DialogDescription>
              AI will extract deliverables from the proposal. You can then edit,
              add, or remove items and submit your changes for internal review.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>AI will parse the proposal to identify deliverables</li>
              <li>You can edit prices, descriptions, or add new items</li>
              <li>Changes will be sent for internal team review</li>
              <li>You&apos;ll be notified when changes are approved or need revision</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                'Start Negotiation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
