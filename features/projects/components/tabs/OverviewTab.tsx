'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Building2,
  DollarSign,
  Clock,
  Circle,
  AlertTriangle,
  Activity,
  ListTodo,
  Package,
  Calendar,
  Flag,
} from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import type { ScopeMetrics } from '@/lib/types/scope-monitoring'
import type { DelaySummary } from '@/lib/api/project-delays'
import { assignDevAction } from '../../actions/projectActions'
import { getScopeMetricsAction } from '../../actions/scopeActions'
import { getDelaySummaryAction } from '../../actions/delayActions'
import { ProjectTimeline } from '../ProjectTimeline'
import { ScopeMetricsSummary } from '../scope'
import { DelaySummaryWidget } from '../delays/DelaySummaryWidget'
import { getCategoryConfig, formatCompactDetail, formatRelativeTime, ACTIVITY_LABELS } from './activity-utils'
import { cn } from '@/lib/utils'

interface OverviewTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  availableDevs: Array<{ id: string; name: string; email: string }>
  initialDelaySummary?: DelaySummary
  onNavigateToActivity?: () => void
}

function formatDate(date: string | null) {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value: number | null) {
  if (!value) return 'Not set'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

export function OverviewTab({ project, userRole, isAdmin, availableDevs, initialDelaySummary, onNavigateToActivity }: OverviewTabProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [showDevSelect, setShowDevSelect] = useState(false)
  const [scopeMetrics, setScopeMetrics] = useState<ScopeMetrics | null>(null)
  const [delaySummary, setDelaySummary] = useState<DelaySummary | null>(initialDelaySummary ?? null)

  // Sync delay summary when server data changes
  useEffect(() => {
    if (initialDelaySummary) {
      setDelaySummary(initialDelaySummary)
    }
  }, [initialDelaySummary])

  useEffect(() => {
    getScopeMetricsAction(project.id)
      .then(setScopeMetrics)
      .catch(console.error)

    // Only fetch delay summary if not provided server-side
    if (!initialDelaySummary) {
      getDelaySummaryAction(project.id)
        .then(setDelaySummary)
        .catch(console.error)
    }
  }, [project.id, initialDelaySummary])

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

  // Calculate average hill position for deliverables progress
  const calculateDeliverablesProgress = () => {
    if (deliverables.length === 0) return 0
    // Use sub-deliverables (those with parent_id) if available, otherwise all deliverables
    const subDeliverables = deliverables.filter(d => d.parent_id)
    const items = subDeliverables.length > 0 ? subDeliverables : deliverables
    const positions = items.map(d => d.hill_position || 0)
    return Math.round(positions.reduce((sum, pos) => sum + pos, 0) / positions.length)
  }
  const deliverablesProgress = calculateDeliverablesProgress()

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
      <div className="grid gap-4 grid-cols-2">
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
              <span className="text-2xl font-bold">{deliverablesProgress}</span>
              <span className="text-muted-foreground">%</span>
            </div>
            {deliverablesTotal > 0 && (
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${deliverablesProgress}%` }}
                />
              </div>
            )}
            {deliverablesTotal === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No deliverables added</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delay Summary */}
      {delaySummary && delaySummary.total_delay_days > 0 && (
        <DelaySummaryWidget summary={delaySummary} />
      )}

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

      {/* Scope Changes Summary */}
      {scopeMetrics && scopeMetrics.has_baseline && scopeMetrics.total_changes > 0 && (
        <Card className={scopeMetrics.pending_changes > 0 ? 'border-amber-200 dark:border-amber-900' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Scope Changes
              {scopeMetrics.pending_changes > 0 && (
                <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                  {scopeMetrics.pending_changes} pending review
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScopeMetricsSummary metrics={scopeMetrics} variant="compact" />
          </CardContent>
        </Card>
      )}

      {/* Project Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Client */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
              <Building2 className="h-4 w-4" />
              Client
            </div>
            <div className="text-sm text-right">
              <p className="font-medium">{project.client_name}</p>
              {project.client_email && (
                <p className="text-muted-foreground text-xs">{project.client_email}</p>
              )}
            </div>
          </div>

          {/* DFY Partner */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
              <User className="h-4 w-4" />
              DFY Partner
            </div>
            <div className="text-sm text-right">
              <p className="font-medium">{project.dfy_partner?.name || 'None'}</p>
              {project.dfy_partner?.email && (
                <p className="text-muted-foreground text-xs">{project.dfy_partner.email}</p>
              )}
            </div>
          </div>

          {/* Assigned Developer */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
              <User className="h-4 w-4" />
              Developer
            </div>
            <div className="text-sm text-right">
              {project.assigned_dev ? (
                <>
                  <p className="font-medium">{project.assigned_dev.name}</p>
                  {isAdmin && !showDevSelect && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      onClick={() => setShowDevSelect(true)}
                    >
                      Reassign
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">Unassigned</p>
                  {isAdmin && !showDevSelect && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setShowDevSelect(true)}
                    >
                      Assign
                    </button>
                  )}
                </>
              )}
              {isAdmin && showDevSelect && (
                <div className="flex items-center gap-2 mt-1">
                  <Select
                    onValueChange={handleAssignDev}
                    disabled={isAssigning}
                    defaultValue={project.assigned_dev?.id}
                  >
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevs.map((dev) => (
                        <SelectItem key={dev.id} value={dev.id}>
                          {dev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowDevSelect(false)}
                    disabled={isAssigning}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quoted Price - Admin Only */}
          {isAdmin && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                <DollarSign className="h-4 w-4" />
                Price
              </div>
              <p className="text-sm font-medium">{formatCurrency(project.price_dfy)}</p>
            </div>
          )}

          {/* Target Delivery */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
              <Calendar className="h-4 w-4" />
              Target Delivery
            </div>
            <p className="text-sm font-medium">{formatDate(project.target_delivery_date)}</p>
          </div>

          {/* Created */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
              <Clock className="h-4 w-4" />
              Created
            </div>
            <p className="text-sm font-medium">{formatDate(project.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <>
              <ul className="space-y-3">
                {recentActivity.map((activity) => {
                  const config = getCategoryConfig(activity.action)
                  const detail = formatCompactDetail(activity.action, activity.details)
                  return (
                    <li key={activity.id} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Colored category dot */}
                        <div className={cn('h-2 w-2 rounded-full shrink-0', config.dotClass)} />
                        <div className="min-w-0 truncate">
                          <span className="font-medium">
                            {ACTIVITY_LABELS[activity.action] || activity.action.replace(/_/g, ' ')}
                          </span>
                          {detail && (
                            <span className="text-muted-foreground"> — {detail}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {/* View all activity link */}
              {onNavigateToActivity && (
                <div className="pt-3 mt-3 border-t border-border">
                  <button
                    onClick={onNavigateToActivity}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all activity →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Activity will appear here as your project progresses
            </p>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
