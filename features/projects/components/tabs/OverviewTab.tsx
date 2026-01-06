'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Building2,
  DollarSign,
  Clock,
  UserPlus,
  Circle,
  AlertTriangle,
  Activity,
  ListTodo,
  Package,
} from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { assignDevAction, updateDeliveryOverrideAction } from '../../actions/projectActions'
import { ProjectTimeline } from '../ProjectTimeline'
import { EstimatedDeliveryBadge } from '@/components/ui/estimated-delivery-badge'
import { calculateDeliveryEstimate } from '@/lib/utils/deliveryEstimate'
import { calculatePhaseProgress } from '@/lib/utils/projectProgress'
import { toast } from 'sonner'

interface OverviewTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  availableDevs: Array<{ id: string; name: string; email: string }>
}

const ACTIVITY_LABELS: Record<string, string> = {
  status_changed: 'Status changed',
  deliverables_confirmed: 'Deliverables confirmed',
  signoff_sent: 'Sent for sign-off',
  signed_off: 'Signed off',
  dev_assigned: 'Developer assigned',
  deliverable_added: 'Deliverable added',
  deliverable_edited: 'Deliverable edited',
  deliverable_deleted: 'Deliverable deleted',
  deliverable_status_changed: 'Deliverable status changed',
  requirement_completed: 'Requirement completed',
  requirement_updated: 'Requirement updated',
  onboarding_requirement_completed: 'Requirement approved',
  file_uploaded: 'File uploaded',
  note_added: 'Note added',
}

function formatDate(date: string | null) {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

function formatCurrency(value: number | null) {
  if (!value) return 'Not set'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

export function OverviewTab({ project, userRole, isAdmin, availableDevs }: OverviewTabProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [showDevSelect, setShowDevSelect] = useState(false)
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

  const handleAssignDev = async (devId: string) => {
    setIsAssigning(true)
    try {
      await assignDevAction(project.id, devId)
      setShowDevSelect(false)
    } catch (error) {
      console.error('Failed to assign dev:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  // Calculate progress stats
  const deliverables = project.deliverables || []
  const deliverablesTotal = deliverables.length
  const deliverablesDone = deliverables.filter(d => d.status === 'done').length

  const requirements = project.requirements || []
  const requirementsTotal = requirements.length
  const requirementsApproved = requirements.filter(r => r.status === 'approved').length

  // Collect blockers
  const blockers: Array<{ type: string; message: string }> = []
  if (project.status === 'blocked_client') {
    blockers.push({ type: 'project', message: 'Blocked waiting on client' })
  }
  if (project.status === 'blocked_internal') {
    blockers.push({ type: 'project', message: 'Blocked on internal issue' })
  }
  const blockedRequirements = requirements.filter(r => r.status === 'blocked')
  blockedRequirements.forEach(r => {
    blockers.push({ type: 'requirement', message: r.title })
  })

  // Recent activity (last 5)
  const recentActivity = (project.activity || []).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Project Timeline */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Project Phase</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-hidden">
          <ProjectTimeline
            currentStatus={project.status}
            phaseStartDate={project.updated_at}
            createdAt={project.created_at}
          />
        </CardContent>
      </Card>

      {/* Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Requirements Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{requirementsApproved}</span>
              <span className="text-muted-foreground">/ {requirementsTotal}</span>
            </div>
            {requirementsTotal > 0 && (
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(requirementsApproved / requirementsTotal) * 100}%` }}
                />
              </div>
            )}
            {requirementsTotal === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No requirements added</p>
            )}
          </CardContent>
        </Card>

        {/* Deliverables Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{deliverablesDone}</span>
              <span className="text-muted-foreground">/ {deliverablesTotal}</span>
            </div>
            {deliverablesTotal > 0 && (
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(deliverablesDone / deliverablesTotal) * 100}%` }}
                />
              </div>
            )}
            {deliverablesTotal === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No deliverables added</p>
            )}
          </CardContent>
        </Card>

        {/* Estimated Delivery Badge - spans 2 columns */}
        <div className="md:col-span-2">
          <EstimatedDeliveryBadge
            estimatedDate={deliveryEstimate.estimatedDate}
            targetDate={deliveryEstimate.targetDate}
            delayDays={deliveryEstimate.delayDays}
            status={deliveryEstimate.status}
            phase={phaseProgress.phaseLabel}
            isOverride={deliveryEstimate.isOverride}
            onEditClick={isAdmin ? () => setIsDeliveryDialogOpen(true) : undefined}
          />
        </div>

      </div>

      {/* Blockers (if any) */}
      {blockers.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Blockers ({blockers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {blockers.map((blocker, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Circle className="h-2 w-2 mt-1.5 fill-red-500 text-red-500" />
                  <span>
                    {blocker.type === 'project' ? (
                      <span className="font-medium">{blocker.message}</span>
                    ) : (
                      <>
                        <Badge variant="outline" className="mr-2 text-xs">Requirement</Badge>
                        {blocker.message}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Info Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{project.client_name}</p>
            {project.client_email && (
              <p className="text-sm text-muted-foreground">{project.client_email}</p>
            )}
            {project.client_business && (
              <p className="text-sm text-muted-foreground">{project.client_business}</p>
            )}
          </CardContent>
        </Card>

        {/* DFY Partner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              DFY Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{project.dfy_partner?.name || 'None'}</p>
            {project.dfy_partner?.email && (
              <p className="text-sm text-muted-foreground">{project.dfy_partner.email}</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Dev */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Assigned Developer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.assigned_dev ? (
              <>
                <p className="font-semibold">{project.assigned_dev.name}</p>
                <p className="text-sm text-muted-foreground">{project.assigned_dev.email}</p>
              </>
            ) : (
              <div>
                <p className="font-semibold text-muted-foreground">Unassigned</p>
                {isAdmin && !showDevSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowDevSelect(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Dev
                  </Button>
                )}
                {isAdmin && showDevSelect && (
                  <div className="mt-2 space-y-2">
                    <Select
                      onValueChange={handleAssignDev}
                      disabled={isAssigning}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select developer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDevs.map((dev) => (
                          <SelectItem key={dev.id} value={dev.id}>
                            {dev.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDevSelect(false)}
                      disabled={isAssigning}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isAdmin && project.assigned_dev && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowDevSelect(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Reassign
              </Button>
            )}
            {isAdmin && project.assigned_dev && showDevSelect && (
              <div className="mt-2 space-y-2">
                <Select
                  onValueChange={handleAssignDev}
                  disabled={isAssigning}
                  defaultValue={project.assigned_dev.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select developer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevs.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDevSelect(false)}
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quoted Price - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Quoted Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{formatCurrency(project.price_dfy)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex items-start justify-between gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary" />
                    <div>
                      <span className="font-medium">
                        {ACTIVITY_LABELS[activity.action] || activity.action.replace(/_/g, ' ')}
                      </span>
                      {activity.user?.name && (
                        <span className="text-muted-foreground"> by {activity.user.name}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {project.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.notes}
            </p>
          </CardContent>
        </Card>
      )}

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
    </div>
  )
}
