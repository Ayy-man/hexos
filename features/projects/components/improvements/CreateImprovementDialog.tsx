'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createImprovementAction } from '../../actions/improvementActions'
import type { ImprovementPriority } from '@/lib/api/project-improvements'

interface CreateImprovementDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  title: string
  description: string
  priority: ImprovementPriority
}

const defaultFormData: FormData = {
  title: '',
  description: '',
  priority: 'nice_to_have',
}

export function CreateImprovementDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateImprovementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(defaultFormData)

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please provide a title')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createImprovementAction({
        projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Improvement added')
        onOpenChange(false)
        setFormData(defaultFormData)
        onSuccess()
      }
    } catch (error) {
      console.error('[CreateImprovementDialog] Error:', error)
      toast.error('Failed to create improvement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Future Improvement</DialogTitle>
          <DialogDescription>
            Capture ideas for future work that are too large for retainer tasks or current scope.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the improvement"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the improvement"
              rows={4}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value as ImprovementPriority })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nice_to_have">Nice to Have</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Improvement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
