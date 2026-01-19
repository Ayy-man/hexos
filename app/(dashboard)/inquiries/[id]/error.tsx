'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function InquiryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Inquiry Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load inquiry</AlertTitle>
          <AlertDescription className="mt-2">
            The inquiry could not be loaded. It may not exist or you may not have permission to view it.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} className="flex-1 gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="flex-1 gap-2">
            <Link href="/inquiries">
              <ArrowLeft className="h-4 w-4" />
              Back to Inquiries
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="text-center text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
