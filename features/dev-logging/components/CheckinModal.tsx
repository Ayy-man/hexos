'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Loader2, BellOff, AlertTriangle, TrendingUp } from 'lucide-react'
import { CheckinTypeSelector, type CheckinType } from './CheckinTypeSelector'
import { DeliverableCheckinCard } from './DeliverableCheckinCard'
import { submitCheckinAction, snoozeCheckinAction } from '@/features/projects/actions/checkinActions'
import { createClient } from '@/lib/supabase/client'
import type { Deliverable } from '@/lib/api/deliverables'

interface CheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  overdueProjects: string[]
  lastCheckinDate: string | null
}

interface ProjectInfo {
  id: string
  name: string
  deliverables: Deliverable[]
}

export function CheckinModal({
  open,
  onOpenChange,
  overdueProjects,
  lastCheckinDate,
}: CheckinModalProps) {
  const [isPending, startTransition] = useTransition()
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)

  // Per-project check-in state
  const [checkinTypes, setCheckinTypes] = useState<Record<string, CheckinType>>({})
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [deliverableNotes, setDeliverableNotes] = useState<
    Record<string, Record<string, { note: string; position_delta: number }>>
  >({})

  // Load project info
  useEffect(() => {
    if (!open || overdueProjects.length === 0) return

    async function loadProjects() {
      setIsLoadingProjects(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          deliverables!inner(id, title, hill_position, status, parent_id)
        `)
        .in('id', overdueProjects)

      if (data) {
        const projectInfos: ProjectInfo[] = data.map((p) => ({
          id: p.id,
          name: p.project_name,
          deliverables: (p.deliverables as Deliverable[]).filter((d) => d.parent_id !== null),
        }))
        setProjects(projectInfos)
        setActiveProjectId(projectInfos[0]?.id || null)

        // Initialize check-in types to 'progress' for all projects
        const initialTypes: Record<string, CheckinType> = {}
        projectInfos.forEach((p) => {
          initialTypes[p.id] = 'progress'
        })
        setCheckinTypes(initialTypes)
      }

      setIsLoadingProjects(false)
    }

    loadProjects()
  }, [open, overdueProjects])

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const handleCheckinTypeChange = (projectId: string, type: CheckinType) => {
    setCheckinTypes((prev) => ({ ...prev, [projectId]: type }))
  }

  const handleSummaryChange = (projectId: string, summary: string) => {
    setSummaries((prev) => ({ ...prev, [projectId]: summary }))
  }

  const handleDeliverableNoteChange = (
    projectId: string,
    deliverableId: string,
    note: string,
    delta: number
  ) => {
    setDeliverableNotes((prev) => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [deliverableId]: { note, position_delta: delta },
      },
    }))
  }

  const handleSubmit = () => {
    if (!activeProject) return

    const projectNotes = deliverableNotes[activeProject.id] || {}
    const notes = Object.entries(projectNotes).map(([deliverableId, data]) => {
      const deliverable = activeProject.deliverables.find((d) => d.id === deliverableId)
      const currentPosition = deliverable?.hill_position ?? 0
      return {
        deliverable_id: deliverableId,
        note: data.note,
        position_before: currentPosition,
        position_after: currentPosition + data.position_delta,
        position_delta: data.position_delta,
      }
    })

    startTransition(async () => {
      const result = await submitCheckinAction({
        project_id: activeProject.id,
        checkin_date: new Date().toISOString().split('T')[0],
        checkin_type: checkinTypes[activeProject.id] || 'progress',
        summary: summaries[activeProject.id] || undefined,
        notes: notes.filter((n) => n.note || n.position_delta !== 0),
      })

      if (result.success) {
        // Remove this project from the list
        const remaining = projects.filter((p) => p.id !== activeProject.id)
        setProjects(remaining)

        if (remaining.length > 0) {
          setActiveProjectId(remaining[0].id)
        } else {
          onOpenChange(false)
        }
      }
    })
  }

  const handleSnooze = (hours: number) => {
    startTransition(async () => {
      await snoozeCheckinAction(hours)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Check-in
          </DialogTitle>
          <DialogDescription>
            {lastCheckinDate
              ? `Last check-in: ${new Date(lastCheckinDate).toLocaleDateString()}`
              : "You haven't logged any check-ins yet"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingProjects ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;ve checked in for all your projects.
            </p>
          </div>
        ) : (
          <>
            {/* Project tabs (if multiple) */}
            {projects.length > 1 && (
              <Tabs value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <TabsList className="w-full justify-start">
                  {projects.map((project) => (
                    <TabsTrigger key={project.id} value={project.id}>
                      {project.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {activeProject && (
              <div className="space-y-6">
                {/* Project name (if single) */}
                {projects.length === 1 && (
                  <div className="font-medium">{activeProject.name}</div>
                )}

                {/* Check-in type selector */}
                <div className="space-y-2">
                  <Label>What did you do today?</Label>
                  <CheckinTypeSelector
                    value={checkinTypes[activeProject.id] || 'progress'}
                    onChange={(type) => handleCheckinTypeChange(activeProject.id, type)}
                  />
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <Label htmlFor="summary">Summary (optional)</Label>
                  <Textarea
                    id="summary"
                    placeholder="Brief summary of your work today..."
                    value={summaries[activeProject.id] || ''}
                    onChange={(e) => handleSummaryChange(activeProject.id, e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Deliverable updates (only for progress type) */}
                {checkinTypes[activeProject.id] === 'progress' &&
                  activeProject.deliverables.length > 0 && (
                    <div className="space-y-2">
                      <Label>Deliverable Progress</Label>
                      <ScrollArea className="h-64 border rounded-md p-2">
                        <div className="space-y-2">
                          {activeProject.deliverables.map((deliverable) => (
                            <DeliverableCheckinCard
                              key={deliverable.id}
                              deliverable={deliverable}
                              note={
                                deliverableNotes[activeProject.id]?.[deliverable.id]?.note || ''
                              }
                              positionDelta={
                                deliverableNotes[activeProject.id]?.[deliverable.id]
                                  ?.position_delta || 0
                              }
                              onChange={(note, delta) =>
                                handleDeliverableNoteChange(activeProject.id, deliverable.id, note, delta)
                              }
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                {/* Delay warning */}
                {checkinTypes[activeProject.id] === 'delay' && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Logging a delay
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        Use this when you were blocked by client response, external dependencies,
                        or other factors outside your control.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSnooze(4)}
                  disabled={isPending}
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Snooze 4h
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSnooze(24)}
                  disabled={isPending}
                >
                  Snooze 24h
                </Button>
              </div>

              <Button onClick={handleSubmit} disabled={isPending || !activeProject}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Check-in'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
