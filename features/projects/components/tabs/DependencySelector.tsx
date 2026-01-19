'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { ProjectRequirement } from '@/lib/api/project-requirements'

interface DependencySelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requirement: ProjectRequirement
  allRequirements: ProjectRequirement[]
  onSave: (dependsOnIds: string[]) => Promise<void>
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DependencySelector({
  open,
  onOpenChange,
  requirement,
  allRequirements,
  onSave,
}: DependencySelectorProps) {
  // Get current dependency IDs
  const currentDependencyIds = new Set(
    (requirement.dependencies || []).map((d) => d.depends_on_id)
  )

  const [selected, setSelected] = useState<Set<string>>(currentDependencyIds)
  const [saving, setSaving] = useState(false)

  // Filter out self - only show other requirements from the same project
  const availableRequirements = allRequirements.filter((r) => r.id !== requirement.id)

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(Array.from(selected))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset selection to original
    setSelected(currentDependencyIds)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Dependencies</DialogTitle>
          <DialogDescription>
            Select requirements that must be completed before &quot;{requirement.title}&quot; can be
            started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto py-4">
          {availableRequirements.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No other requirements available to depend on.
            </p>
          ) : (
            availableRequirements.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => handleToggle(req.id)}
              >
                <Checkbox
                  checked={selected.has(req.id)}
                  onCheckedChange={() => handleToggle(req.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{req.title}</p>
                  {req.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {req.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={STATUS_COLORS[req.status] || STATUS_COLORS.pending}
                >
                  {formatStatus(req.status)}
                </Badge>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selected.size} prerequisite(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Dependencies
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
