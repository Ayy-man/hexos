'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Lightbulb, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { CreateImprovementDialog } from './CreateImprovementDialog'
import { ConvertToProjectDialog } from './ConvertToProjectDialog'
import { getProjectImprovements } from '@/lib/api/project-improvements'
import type { ProjectImprovement } from '@/lib/api/project-improvements'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { cn } from '@/lib/utils'

interface ImprovementsSectionProps {
  project: ProjectWithRelations
  userRole: UserRole
}

const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-error-muted text-error-foreground' },
  important: { label: 'Important', className: 'bg-warning-muted text-warning-foreground' },
  nice_to_have: { label: 'Nice to Have', className: 'bg-muted text-muted-foreground' },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ImprovementsSection({ project, userRole }: ImprovementsSectionProps) {
  const isAdmin = userRole === 'admin'
  const [improvements, setImprovements] = useState<ProjectImprovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)

  // Lazy load improvements when component mounts
  useEffect(() => {
    loadImprovements()
  }, [project.id])

  const loadImprovements = async () => {
    setIsLoading(true)
    try {
      const data = await getProjectImprovements(project.id)
      setImprovements(data)
    } catch (error) {
      console.error('[ImprovementsSection] Failed to load improvements:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSelection = (improvementId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(improvementId)) {
      newSelected.delete(improvementId)
    } else {
      newSelected.add(improvementId)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    const openImprovements = improvements.filter((i) => i.status === 'open')
    if (selectedIds.size === openImprovements.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(openImprovements.map((i) => i.id)))
    }
  }

  const handleConvertSuccess = () => {
    setSelectedIds(new Set())
    loadImprovements()
  }

  const openImprovements = improvements.filter((i) => i.status === 'open')
  const convertedImprovements = improvements.filter((i) => i.status === 'converted')
  const selectedImprovements = improvements.filter((i) => selectedIds.has(i.id))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Future Improvements</h2>
          {improvements.length > 0 && (
            <Badge variant="secondary">
              {openImprovements.length} open / {improvements.length} total
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && selectedIds.size > 0 && (
            <Button onClick={() => setConvertDialogOpen(true)} variant="outline">
              Create Project from Selected ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Improvement
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {improvements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No improvements yet</h3>
            <p className="text-muted-foreground mb-4">
              Capture ideas for future work that are too large for retainer tasks or current scope.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Improvement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open improvements */}
      {openImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Open Improvements</CardTitle>
              {isAdmin && openImprovements.length > 1 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedIds.size === openImprovements.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {openImprovements.map((improvement) => (
              <div
                key={improvement.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-md border',
                  selectedIds.has(improvement.id) && 'bg-muted/50'
                )}
              >
                {isAdmin && (
                  <Checkbox
                    checked={selectedIds.has(improvement.id)}
                    onCheckedChange={() => handleToggleSelection(improvement.id)}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Badge className={priorityConfig[improvement.priority].className} variant="secondary">
                      {priorityConfig[improvement.priority].label}
                    </Badge>
                    <h4 className="font-medium flex-1">{improvement.title}</h4>
                  </div>
                  {improvement.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {improvement.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Added by {improvement.author?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDate(improvement.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Converted improvements */}
      {convertedImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Converted to Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {convertedImprovements.map((improvement) => (
              <div
                key={improvement.id}
                className="flex items-start gap-3 p-3 rounded-md border bg-muted/30"
              >
                <div className="flex-1 space-y-1.5 opacity-70">
                  <div className="flex items-start gap-2">
                    <Badge className={priorityConfig[improvement.priority].className} variant="secondary">
                      {priorityConfig[improvement.priority].label}
                    </Badge>
                    <h4 className="font-medium flex-1">{improvement.title}</h4>
                  </div>
                  {improvement.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {improvement.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Added by {improvement.author?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDate(improvement.created_at)}</span>
                  </div>
                </div>
                {improvement.converted_project && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={`/projects/${improvement.converted_project.id}`} className="flex items-center gap-1">
                      {improvement.converted_project.project_name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateImprovementDialog
        projectId={project.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadImprovements}
      />
      {isAdmin && (
        <ConvertToProjectDialog
          projectId={project.id}
          improvements={selectedImprovements}
          open={convertDialogOpen}
          onOpenChange={(open) => {
            setConvertDialogOpen(open)
            if (!open) {
              handleConvertSuccess()
            }
          }}
        />
      )}
    </div>
  )
}
