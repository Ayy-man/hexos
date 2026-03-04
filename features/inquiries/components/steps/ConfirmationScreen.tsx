'use client'

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ConfirmationScreenProps {
  isClosedDeal: boolean
  inquiryId: string | null
  onReset: () => void
}

export function ConfirmationScreen({ isClosedDeal, inquiryId, onReset }: ConfirmationScreenProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="pt-8 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">
          {isClosedDeal ? 'Deal Submitted Successfully' : 'Thank you for submitting your Proposal Request'}
        </h2>

        <p className="text-muted-foreground mb-6">
          {isClosedDeal
            ? 'The team has been notified and will begin the onboarding process.'
            : 'The team has received it and will start working on putting it together for you or we may reach out via WhatsApp for more information.'}
        </p>

        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href={inquiryId ? `/inquiries/${inquiryId}` : '/inquiries'}>
              View Submission
            </Link>
          </Button>
          <Button onClick={onReset}>Submit Another</Button>
        </div>
      </CardContent>
    </Card>
  )
}
