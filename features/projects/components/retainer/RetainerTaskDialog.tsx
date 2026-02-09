'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createRetainerTaskAction, updateRetainerTaskAction, deleteRetainerTaskAction } from '@/features/projects/actions/retainerActions'
import { toast } from 'sonner'
import type { RetainerTask, TaskPriority, TaskStatus } from '@/lib/api/retainer-tasks'

interface RetainerTaskDialogProps {
  projectId: string
  task?: RetainerTask
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  availableDevs: Array<{ id: string; name: string; email: string }>
}

export function RetainerTaskDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onSuccess,
  availableDevs,
}: RetainerTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assigneeId, setAssigneeId] = useState<string | undefined>()
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const isEditMode = !!task

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setPriority(task.priority)
      setAssigneeId(task.assignee_id || undefined)
      setStatus(task.status)
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setAssigneeId(undefined)
      setStatus('todo')
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && task) {
        const result = await updateRetainerTaskAction({
          taskId: task.id,
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assigneeId: assigneeId || null,
          status,
        })

        if ('error' in result) {
          toast.error(result.error)
        } else {
          toast.success('Task updated successfully')
          onOpenChange(false)
          onSuccess()
        }
      } else {
        const result = await createRetainerTaskAction({
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assigneeId,
        })

        if ('error' in result) {
          toast.error(result.error)
        } else {
          toast.success('Task created successfully')
          onOpenChange(false)
          onSuccess()
        }
      }
    } catch (error) {
      console.error('[RetainerTaskDialog] Error:', error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} task`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return

    setIsSubmitting(true)

    try {
      const result = await deleteRetainerTaskAction({
        taskId: task.id,
        projectId,
      })

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Task deleted successfully')
        setDeleteConfirmOpen(false)
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('[RetainerTaskDialog] Error deleting:', error)
      toast.error('Failed to delete task')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={assigneeId || 'unassigned'} onValueChange={(value) => setAssigneeId(value === 'unassigned' ? undefined : value)}>
                <SelectTrigger id="assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {availableDevs.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (edit mode only) */}
            {isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <div>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={isSubmitting}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Save' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
