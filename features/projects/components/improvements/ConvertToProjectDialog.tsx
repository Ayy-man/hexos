'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { convertToProjectAction } from '../../actions/improvementActions'
import type { ProjectImprovement } from '@/lib/api/project-improvements'
import { useRouter } from 'next/navigation'

interface ConvertToProjectDialogProps {
  projectId: string
  improvements: ProjectImprovement[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-error-muted text-error-foreground' },
  important: { label: 'Important', className: 'bg-warning-muted text-warning-foreground' },
  nice_to_have: { label: 'Nice to Have', className: 'bg-muted text-muted-foreground' },
}

export function ConvertToProjectDialog({
  projectId,
  improvements,
  open,
  onOpenChange,
}: ConvertToProjectDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [clientName, setClientName] = useState('')

  const handleSubmit = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please provide a project name')
      return
    }
    if (!clientName.trim()) {
      toast.error('Please provide a client name')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await convertToProjectAction({
        projectId,
        improvementIds: improvements.map((i) => i.id),
        newProjectName: newProjectName.trim(),
        clientName: clientName.trim(),
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        toast.success(
          <div className="flex items-center gap-2">
            <span>Project created successfully</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => router.push(`/projects/${result.data!.projectId}`)}
            >
              View Project <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )
        onOpenChange(false)
        setNewProjectName('')
        setClientName('')
      }
    } catch (error) {
      console.error('[ConvertToProjectDialog] Error:', error)
      toast.error('Failed to convert improvements to project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Project from Improvements</DialogTitle>
          <DialogDescription>
            Bundle {improvements.length} selected improvement{improvements.length !== 1 ? 's' : ''} into a new project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Selected improvements list */}
          <div className="space-y-2">
            <Label>Selected Improvements</Label>
            <div className="rounded-md border p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {improvements.map((improvement) => (
                <div key={improvement.id} className="flex items-start gap-2 text-sm">
                  <Badge className={priorityConfig[improvement.priority].className} variant="secondary">
                    {priorityConfig[improvement.priority].label}
                  </Badge>
                  <span className="flex-1">{improvement.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New project form */}
          <div className="space-y-2">
            <Label htmlFor="newProjectName">Project Name *</Label>
            <Input
              id="newProjectName"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter new project name"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
