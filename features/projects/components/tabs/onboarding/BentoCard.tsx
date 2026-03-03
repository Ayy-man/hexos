'use client'

import { type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { useOnboardingSheet } from './hooks/use-onboarding-sheet'

interface BentoCardProps {
  slug: string
  children: React.ReactNode
  isComplete: boolean
  hasRequiredIncomplete: boolean
  className?: string
  sheetTitle?: string
  sheetContent?: React.ReactNode
  /**
   * Optional async guard called before closing the sheet.
   * Return true to allow close, false to prevent it (e.g. show unsaved changes dialog).
   */
  onBeforeClose?: () => Promise<boolean> | boolean
}

export function BentoCard({
  slug,
  children,
  isComplete,
  hasRequiredIncomplete,
  className,
  sheetTitle,
  sheetContent,
  onBeforeClose,
}: BentoCardProps) {
  const { activeSection, openSheet, closeSheet } = useOnboardingSheet()

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openSheet(slug)
    }
  }

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      if (onBeforeClose) {
        const canClose = await onBeforeClose()
        if (!canClose) return
      }
      closeSheet()
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openSheet(slug)}
        onKeyDown={handleKeyDown}
        className={cn(
          'border rounded-lg p-4 cursor-pointer transition-opacity hover:bg-muted/50',
          'focus-visible:ring-2 focus-visible:ring-[--control-ring] focus-visible:outline-none',
          hasRequiredIncomplete && 'border-l-4 border-l-[--signal-warn]',
          isComplete && 'opacity-60',
          className
        )}
      >
        {children}
      </div>

      <ResponsiveDialog
        open={activeSection === slug}
        onOpenChange={handleOpenChange}
      >
        <ResponsiveDialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          {sheetTitle && (
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{sheetTitle}</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
          )}
          {sheetContent ?? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">Content coming soon</p>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
