'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react'

interface BlueprintInfoProps {
  onBack: () => void
  onCustomize: () => void
}

export function BlueprintInfo({ onBack, onCustomize }: BlueprintInfoProps) {
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
        </div>
      </div>

      {/* Customize CTA */}
      <div className="rounded-lg border border-dashed p-4 bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Need to customize the blueprint?</p>
              <p className="text-xs text-muted-foreground">
                Request a proposal for modifications or additions
              </p>
            </div>
          </div>
          <Button type="button" onClick={onCustomize}>
            Continue
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2 border-t">
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
