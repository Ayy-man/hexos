'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ExternalLink } from 'lucide-react'

interface BlueprintInfoProps {
  onBack: () => void
}

export function BlueprintInfo({ onBack }: BlueprintInfoProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 p-6">
        <h3 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-3">
          You have everything you need in the Blueprint Library!
        </h3>
        <div className="space-y-4 text-sm text-cyan-800 dark:text-cyan-200">
          <p>
            If you&apos;re selling a Standard Automation Blueprint as-is, you can use the
            information inside our Blueprint Library Documents to create a proposal and sell
            it to your prospect.
          </p>
          <p>
            If anything is unclear, feel free to message us in your WhatsApp Groupchat.
          </p>
          <p className="font-medium">
            If you&apos;re looking to customize a blueprint or build on top of it, go back
            and choose that option. That would require us to see what impact your changes
            would have to the overall price.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Go Back
        </Button>
        <Button type="button" variant="link" asChild>
          <a href="#" target="_blank" rel="noopener noreferrer">
            View Blueprint Library
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </div>
    </div>
  )
}
