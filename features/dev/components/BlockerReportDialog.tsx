'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { reportBlockerAction } from '@/features/dev/actions/blockerActions'
import type { BlockerPriority } from '@/lib/api/blockers'

interface Deliverable {
  id: string
  title: string
  project_id?: string
}

interface Project {
  id: string
  project_name: string
}

interface BlockerReportDialogProps {
  projectId?: string
  projects?: Project[]
  deliverables?: Deliverable[]
  preselectedDeliverableId?: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

const priorityOptions: { value: BlockerPriority; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Nice to fix, not urgent' },
  { value: 'medium', label: 'Medium', description: 'Should be addressed soon' },
  { value: 'high', label: 'High', description: 'Blocking significant progress' },
  { value: 'critical', label: 'Critical', description: 'Complete work stoppage' },
]

export function BlockerReportDialog({
  projectId,
  projects = [],
  deliverables = [],
  preselectedDeliverableId,
  onSuccess,
  trigger,
}: BlockerReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<BlockerPriority>('medium')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
  const [deliverableId, setDeliverableId] = useState(preselectedDeliverableId || '')
  const [isPending, startTransition] = useTransition()

  // Filter deliverables by selected project
  const filteredDeliverables = selectedProjectId
    ? deliverables.filter(d => d.project_id === selectedProjectId)
    : deliverables

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const finalProjectId = projectId || selectedProjectId
    if (!finalProjectId) {
      toast.error('Please select a project')
      return
    }

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    startTransition(async () => {
      const result = await reportBlockerAction({
        projectId: finalProjectId,
        deliverableId: deliverableId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })

      if (result.success) {
        toast.success('Blocker reported')
        setOpen(false)
        resetForm()
        onSuccess?.()
      } else {
        toast.error(result.message || 'Failed to report blocker')
      }
    })
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    if (!projectId) setSelectedProjectId('')
    if (!preselectedDeliverableId) setDeliverableId('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Report Blocker
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report a Blocker
          </DialogTitle>
          <DialogDescription>
            Let the team know about an issue blocking your progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project (if multiple) */}
          {!projectId && projects.length > 0 && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={(v) => {
                setSelectedProjectId(v)
                setDeliverableId('') // Reset deliverable when project changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label>What's blocking you?</Label>
            <Input
              placeholder="e.g., Waiting for API credentials"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Deliverable (optional) */}
          {filteredDeliverables.length > 0 && (
            <div className="space-y-2">
              <Label>Related Deliverable (optional)</Label>
              <Select value={deliverableId} onValueChange={setDeliverableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deliverable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None - Project level</SelectItem>
                  {filteredDeliverables.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as BlockerPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <PriorityIndicator priority={opt.value} />
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">- {opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Details (optional)</Label>
            <Textarea
              placeholder="Provide more context about the blocker..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Reporting...' : 'Report Blocker'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PriorityIndicator({ priority }: { priority: BlockerPriority }) {
  const colors = {
    low: 'bg-green-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  }

  return <div className={`h-2 w-2 rounded-full ${colors[priority]}`} />
}

// Badge for displaying blocker priority
export function BlockerPriorityBadge({ priority }: { priority: BlockerPriority }) {
  const config = {
    low: { label: 'Low', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
    high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config[priority].className}`}>
      {config[priority].label}
    </span>
  )
}
