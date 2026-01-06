'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EstimatedDeliveryBadge } from '@/components/ui/estimated-delivery-badge'
import { calculateDeliveryEstimate } from '@/lib/utils/deliveryEstimate'
import { calculatePhaseProgress } from '@/lib/utils/projectProgress'
import { updateDeliveryOverrideAction } from '../actions/projectActions'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'

interface ProjectHeaderProps {
  project: ProjectWithRelations
  isAdmin: boolean
}

function formatDate(date: string | null) {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectHeader({ project, isAdmin }: ProjectHeaderProps) {
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)
  const [deliveryOverrideDate, setDeliveryOverrideDate] = useState(
    project.delivery_date_override || ''
  )
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false)

  // Calculate delivery estimate
  const deliveryEstimate = useMemo(() => {
    return calculateDeliveryEstimate(
      project.target_delivery_date,
      project.delivery_date_override,
      project.deliverables || []
    )
  }, [project.target_delivery_date, project.delivery_date_override, project.deliverables])

  // Get current phase
  const phaseProgress = useMemo(() => {
    return calculatePhaseProgress(project.status)
  }, [project.status])

  const handleUpdateDeliveryOverride = async () => {
    setIsUpdatingDelivery(true)
    try {
      const result = await updateDeliveryOverrideAction(
        project.id,
        deliveryOverrideDate || null
      )
      if (result.success) {
        toast.success(deliveryOverrideDate ? 'Delivery date updated' : 'Override cleared')
        setIsDeliveryDialogOpen(false)
      } else {
        toast.error(result.error || 'Failed to update')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsUpdatingDelivery(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">
            {project.project_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.client_name}
            {project.client_business && ` · ${project.client_business}`}
          </p>
        </div>

        {/* Compact Delivery Badge */}
        <EstimatedDeliveryBadge
          variant="compact"
          estimatedDate={deliveryEstimate.estimatedDate}
          targetDate={deliveryEstimate.targetDate}
          delayDays={deliveryEstimate.delayDays}
          status={deliveryEstimate.status}
          phase={phaseProgress.phaseLabel}
          isOverride={deliveryEstimate.isOverride}
          onEditClick={isAdmin ? () => setIsDeliveryDialogOpen(true) : undefined}
        />
      </div>

      {/* Delivery Date Override Dialog */}
      <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery Date</DialogTitle>
            <DialogDescription>
              Set a manual delivery date override. Leave empty to use the calculated estimate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-override">Override Date</Label>
              <Input
                id="delivery-override"
                type="date"
                value={deliveryOverrideDate}
                onChange={(e) => setDeliveryOverrideDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Current target: {formatDate(project.target_delivery_date)}
              </p>
            </div>

            {deliveryEstimate.overdueCount > 0 && !deliveryEstimate.isOverride && (
              <div className="rounded-lg bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {deliveryEstimate.overdueCount} overdue deliverable{deliveryEstimate.overdueCount !== 1 ? 's' : ''}
                </p>
                <p className="text-muted-foreground mt-1">
                  The calculated estimate includes +{deliveryEstimate.delayDays} days of delay.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {deliveryOverrideDate && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDeliveryOverrideDate('')
                }}
              >
                Clear Override
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeliveryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDeliveryOverride}
                disabled={isUpdatingDelivery}
              >
                {isUpdatingDelivery ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
