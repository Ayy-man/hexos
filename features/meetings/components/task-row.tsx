'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateTaskAction, deleteTaskAction } from '../actions/taskActions'
import { ConvertToDeliverable } from './convert-to-deliverable'
import type { MeetingTask } from '@/lib/types/meetings'
import { MoreHorizontal, Loader2, Trash2, Edit2, ArrowRightCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskRowProps {
  task: MeetingTask
  onUpdate?: () => void
  onDelete?: () => void
}

export function TaskRow({ task, onUpdate, onDelete }: TaskRowProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [editedDescription, setEditedDescription] = useState(task.description || '')

  const handleStatusToggle = async (checked: boolean) => {
    const newStatus = checked ? 'done' : 'pending'
    setIsUpdating(true)
    try {
      const result = await updateTaskAction(task.id, { status: newStatus })
      if (result.success) {
        toast.success(`Task marked as ${newStatus}`)
        onUpdate?.()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
      toast.error('Failed to update task')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      toast.error('Task title is required')
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateTaskAction(task.id, {
        title: editedTitle,
        description: editedDescription || null,
      })
      if (result.success) {
        toast.success('Task updated')
        setIsEditing(false)
        onUpdate?.()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast.error('Failed to update task')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteTaskAction(task.id)
      if (result.success) {
        toast.success('Task deleted')
        onDelete?.()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Failed to delete task')
    } finally {
      setIsDeleting(false)
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'high':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
      case 'normal':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'low':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  const getSourceBadge = (source: string): string => {
    switch (source) {
      case 'ai_extracted':
        return 'AI'
      case 'manual':
        return 'Manual'
      case 'imported':
        return 'Imported'
      default:
        return source
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <Input
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          placeholder="Task title"
          disabled={isUpdating}
        />
        <Textarea
          value={editedDescription}
          onChange={(e) => setEditedDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          disabled={isUpdating}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSaveEdit}
            disabled={isUpdating || !editedTitle.trim()}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(false)
              setEditedTitle(task.title)
              setEditedDescription(task.description || '')
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <Checkbox
              checked={task.status === 'done'}
              onCheckedChange={handleStatusToggle}
              disabled={isUpdating}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2">
              <h4
                className={cn(
                  'font-medium flex-1',
                  task.status === 'done' && 'line-through text-muted-foreground'
                )}
              >
                {task.title}
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowConvertDialog(true)}>
                    <ArrowRightCircle className="h-4 w-4 mr-2" />
                    Convert to Deliverable
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {task.assigned_to_name || 'Unassigned'}
              </span>
              {task.due_date && (
                <span className={cn('text-muted-foreground', isOverdue && 'text-red-600 font-medium')}>
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getSourceBadge(task.source)}
              </Badge>
              {task.deliverable_id && (
                <Badge variant="outline" className="text-xs">
                  Linked to deliverable
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConvertToDeliverable
        taskId={task.id}
        taskTitle={task.title}
        isAlreadyConverted={!!task.deliverable_id}
        deliverableId={task.deliverable_id}
        projectId={task.project_id}
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        onConverted={onUpdate}
      />
    </>
  )
}
