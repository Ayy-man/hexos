'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Archive, ArchiveRestore, Trash2, RefreshCw } from 'lucide-react'
import {
  archiveInquiryAction,
  unarchiveInquiryAction,
  deleteInquiryAction,
} from '../actions/inquiryActions'

interface InquiryActionsProps {
  inquiryId: string
  isArchived: boolean
  hasProject: boolean
}

export function InquiryActions({
  inquiryId,
  isArchived,
  hasProject,
}: InquiryActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleArchive = () => {
    startTransition(async () => {
      await archiveInquiryAction(inquiryId)
    })
  }

  const handleUnarchive = () => {
    startTransition(async () => {
      await unarchiveInquiryAction(inquiryId)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteInquiryAction(inquiryId)
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage Inquiry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isArchived ? (
            <ButtonHoldAndRelease
              className="w-full"
              variant="warning"
              icon={<Archive className="h-4 w-4" />}
              defaultText="Archive"
              holdingText="Archiving..."
              holdDuration={1500}
              onHoldComplete={handleArchive}
              disabled={isPending}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleUnarchive}
              disabled={isPending}
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Unarchive
            </Button>
          )}

          <ButtonHoldAndRelease
            className="w-full"
            variant="destructive"
            icon={<Trash2 className="h-4 w-4" />}
            defaultText="Delete"
            holdingText="Deleting..."
            holdDuration={2000}
            onHoldComplete={() => setShowDeleteConfirm(true)}
            disabled={isPending || hasProject}
          />

          {hasProject && (
            <p className="text-xs text-muted-foreground text-center">
              Cannot delete - linked to a project
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inquiry</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this inquiry from view. This action
              can be undone by an administrator if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
