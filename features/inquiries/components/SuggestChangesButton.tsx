'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { MessageSquareDiff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SuggestChangesButtonProps {
  inquiryId: string
  onStartNegotiation: () => Promise<{ deliverables?: unknown[]; error?: string }>
}

export function SuggestChangesButton({
  inquiryId,
  onStartNegotiation,
}: SuggestChangesButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStart = async () => {
    setIsLoading(true)
    try {
      const result = await onStartNegotiation()

      if (result.error) {
        // Show specific error message from server
        toast.error(result.error)
        return
      }

      if (result.deliverables && result.deliverables.length > 0) {
        toast.success(`Extracted ${result.deliverables.length} deliverables! Opening editor...`)
      } else {
        toast.info('No deliverables found in proposal. You can add them manually.')
      }

      router.refresh()
    } catch (error) {
      // Fallback for unexpected errors (network issues, etc.)
      console.error('Error starting negotiation:', error)
      toast.error('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Extracting deliverables...
      </div>
    )
  }

  return (
    <ButtonHoldAndRelease
      onHoldComplete={handleStart}
      holdDuration={2000}
      variant="default"
      icon={<MessageSquareDiff className="h-4 w-4" />}
      defaultText="Suggest Changes"
      holdingText="Release to Extract"
    />
  )
}
