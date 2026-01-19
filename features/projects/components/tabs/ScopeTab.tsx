'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Flag,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  ArrowRight,
} from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import type {
  ScopeChangeWithRelations,
  ScopeMetrics,
  ScopeBaselineWithUser,
  ScopeChangeStatus,
} from '@/lib/types/scope-monitoring'
import {
  getScopeChangesAction,
  getScopeMetricsAction,
  getBaselineAction,
} from '../../actions/scopeActions'
import {
  ScopeChangeCard,
  ScopeChangeDialog,
  ScopeMetricsSummary,
} from '../scope'

interface ScopeTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

export function ScopeTab({ project, userRole, isAdmin, isDfy }: ScopeTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<ScopeMetrics | null>(null)
  const [baseline, setBaseline] = useState<ScopeBaselineWithUser | null>(null)
  const [scopeChanges, setScopeChanges] = useState<ScopeChangeWithRelations[]>([])
  const [filter, setFilter] = useState<'all' | ScopeChangeStatus>('all')
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [metricsData, baselineData, changesData] = await Promise.all([
        getScopeMetricsAction(project.id),
        getBaselineAction(project.id),
        getScopeChangesAction(project.id, {
          status: filter === 'all' ? undefined : filter,
        }),
      ])
      setMetrics(metricsData)
      setBaseline(baselineData)
      setScopeChanges(changesData)
    } catch (error) {
      console.error('Failed to fetch scope data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [project.id, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const deliverables = project.deliverables || []

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Baseline Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Scope Baseline
            </CardTitle>
            {baseline && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {baseline ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Captured</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(baseline.captured_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">By</p>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {baseline.capturer?.name || baseline.capturer?.email || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deliverables</p>
                  <p className="font-medium">{baseline.deliverable_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Hours</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {baseline.total_estimated_hours || 0}h
                  </p>
                </div>
              </div>

              {/* Current vs Baseline Comparison */}
              {deliverables.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium">{deliverables.length} deliverables</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {deliverables.reduce((sum, d) => sum + (d.estimated_hours || 0), 0)}h total
                    </span>
                    {deliverables.length !== baseline.deliverable_count && (
                      <Badge
                        variant="secondary"
                        className={
                          deliverables.length > baseline.deliverable_count
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {deliverables.length > baseline.deliverable_count ? '+' : ''}
                        {deliverables.length - baseline.deliverable_count} deliverables
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No baseline captured yet</p>
              <p className="text-sm mt-1">
                A baseline will be captured automatically when the project is signed off
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      {metrics && <ScopeMetricsSummary metrics={metrics} />}

      {/* Scope Changes List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Scope Changes</CardTitle>
            <Button onClick={() => setIsFlagDialogOpen(true)} size="sm">
              <Flag className="h-4 w-4 mr-2" />
              Flag Change
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Tabs */}
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as typeof filter)}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                All
                {metrics && metrics.total_changes > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {metrics.total_changes}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending_review" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pending
                {metrics && metrics.pending_changes > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                    {metrics.pending_changes}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approved
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Rejected
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Changes List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scopeChanges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No scope changes {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : ''}</p>
              <p className="text-sm mt-1">
                Changes will appear here when deliverables are modified after sign-off
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scopeChanges.map((change) => (
                <ScopeChangeCard
                  key={change.id}
                  scopeChange={change}
                  projectId={project.id}
                  isAdmin={isAdmin}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag Dialog */}
      <ScopeChangeDialog
        projectId={project.id}
        deliverables={deliverables.map((d) => ({ id: d.id, title: d.title }))}
        open={isFlagDialogOpen}
        onOpenChange={setIsFlagDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  )
}
