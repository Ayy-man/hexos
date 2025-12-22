'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { MessageSquareDiff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SuggestChangesButtonProps {
  inquiryId: string
  onStartNegotiation: () => Promise<void>
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
      await onStartNegotiation()
      toast.success('Deliverables extracted! Opening editor...')
      // Refresh the page to show the Deliverables tab
      router.refresh()
    } catch (error) {
      console.error('Error starting negotiation:', error)
      toast.error('Failed to extract deliverables')
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
