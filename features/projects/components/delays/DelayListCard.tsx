'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Clock, AlertTriangle, Trash2, Loader2, Package, Flag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { deleteDelayAction } from '../../actions/delayActions'
import { DelayTypeBadge } from './DelayTypeBadge'
import type { ProjectDelay } from '@/lib/api/project-delays'

interface DelayListCardProps {
  delays: ProjectDelay[]
  projectId: string
  canDelete?: boolean
  onDeleted?: () => void
}

export function DelayListCard({
  delays,
  projectId,
  canDelete = false,
  onDeleted,
}: DelayListCardProps) {
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = () => {
    if (!deleteId) return

    startTransition(async () => {
      await deleteDelayAction(deleteId, projectId)
      setDeleteId(null)
      onDeleted?.()
    })
  }

  if (delays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Delays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No delays recorded</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Delays
            <Badge variant="secondary" className="ml-auto">
              {delays.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {delays.map((delay) => (
                <div key={delay.id} className="flex items-start gap-3 p-4">
                  {delay.delay_type === 'client_delay' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  ) : (
                    <Flag className="h-4 w-4 text-red-500 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <DelayTypeBadge type={delay.delay_type} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(delay.delay_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {delay.days_count} day{delay.days_count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <p className="text-sm">{delay.reason}</p>

                    {delay.deliverable && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {delay.deliverable.title}
                      </div>
                    )}

                    {delay.marked_by_user && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Marked by {delay.marked_by_user.name}{' '}
                        {formatDistanceToNow(new Date(delay.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(delay.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delay record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
