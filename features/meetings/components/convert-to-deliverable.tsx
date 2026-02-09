'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { convertToDeliverableAction } from '../actions/taskActions'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ConvertToDeliverableProps {
  taskId: string
  taskTitle: string
  isAlreadyConverted?: boolean
  deliverableId?: string | null
  projectId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConverted?: () => void
}

interface Project {
  id: string
  project_name: string
  status: string
}

export function ConvertToDeliverable({
  taskId,
  taskTitle,
  isAlreadyConverted = false,
  deliverableId,
  projectId: initialProjectId,
  open,
  onOpenChange,
  onConverted,
}: ConvertToDeliverableProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open && !isAlreadyConverted) {
      setIsLoadingProjects(true)
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          setProjects(data.projects || [])
          if (initialProjectId) {
            setSelectedProjectId(initialProjectId)
          }
        })
        .catch((error) => {
          console.error('Failed to fetch projects:', error)
          toast.error('Failed to load projects')
        })
        .finally(() => {
          setIsLoadingProjects(false)
        })
    }
  }, [open, isAlreadyConverted, initialProjectId])

  const handleConvert = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project')
      return
    }

    setIsLoading(true)
    try {
      const result = await convertToDeliverableAction(taskId, selectedProjectId)

      if (result.success && result.data) {
        toast.success('Task converted to deliverable')
        onConverted?.()
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to convert task')
      }
    } catch (error) {
      console.error('Failed to convert task:', error)
      toast.error('Failed to convert task')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Task to Deliverable</DialogTitle>
          <DialogDescription>
            {isAlreadyConverted
              ? 'This task has already been converted to a deliverable.'
              : 'Select a project to create a deliverable from this task.'}
          </DialogDescription>
        </DialogHeader>

        {isAlreadyConverted ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Already converted</span>
            </div>
            {deliverableId && projectId && (
              <Link href={`/projects/${projectId}`}>
                <Button variant="outline" className="w-full">
                  View Project Deliverables
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Task</label>
                <p className="text-sm text-muted-foreground">{taskTitle}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                {isLoadingProjects ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading projects...
                  </div>
                ) : (
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConvert}
                disabled={isLoading || !selectedProjectId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  'Convert to Deliverable'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
