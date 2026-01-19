'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReopenInquiryButtonProps {
  inquiryId: string
  onReopen: () => Promise<void>
}

export function ReopenInquiryButton({
  inquiryId,
  onReopen,
}: ReopenInquiryButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleReopen = async () => {
    setIsLoading(true)
    try {
      await onReopen()
      toast.success('Inquiry reopened successfully')
      router.refresh()
    } catch (error) {
      console.error('Error reopening inquiry:', error)
      toast.error('Failed to reopen inquiry')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reopening...
      </div>
    )
  }

  return (
    <ButtonHoldAndRelease
      onHoldComplete={handleReopen}
      holdDuration={2000}
      variant="default"
      icon={<RotateCcw className="h-4 w-4" />}
      defaultText="Reopen Inquiry"
      holdingText="Release to Reopen"
    />
  )
}
