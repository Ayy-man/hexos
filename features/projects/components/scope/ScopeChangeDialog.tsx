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
import {
  SCOPE_REQUEST_TYPE_OPTIONS,
  SCOPE_TRIGGER_TYPE_OPTIONS,
  type ScopeChangeRequestType,
  type ScopeChangeTrigger,
} from '@/lib/types/scope-monitoring'
import { flagScopeChangeAction } from '../../actions/scopeActions'

interface Deliverable {
  id: string
  title: string
}

interface ScopeChangeDialogProps {
  projectId: string
  deliverables: Deliverable[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface FormData {
  description: string
  triggerType: ScopeChangeTrigger | ''
  requestType: ScopeChangeRequestType | ''
  affectedDeliverableId: string
  hoursDelta: string
  timelineDeltaDays: string
  costDelta: string
}

const defaultFormData: FormData = {
  description: '',
  triggerType: '',
  requestType: '',
  affectedDeliverableId: '',
  hoursDelta: '',
  timelineDeltaDays: '',
  costDelta: '',
}

export function ScopeChangeDialog({
  projectId,
  deliverables,
  open,
  onOpenChange,
  onSuccess,
}: ScopeChangeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(defaultFormData)

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast.error('Please provide a description')
      return
    }
    if (!formData.triggerType) {
      toast.error('Please select a trigger type')
      return
    }

    setIsSubmitting(true)
    try {
      await flagScopeChangeAction({
        project_id: projectId,
        trigger_type: formData.triggerType as ScopeChangeTrigger,
        description: formData.description,
        request_type: formData.requestType ? (formData.requestType as ScopeChangeRequestType) : undefined,
        affected_deliverable_id: formData.affectedDeliverableId || undefined,
        hours_delta: formData.hoursDelta ? Number(formData.hoursDelta) : undefined,
        timeline_delta_days: formData.timelineDeltaDays ? Number(formData.timelineDeltaDays) : undefined,
        cost_delta: formData.costDelta ? Number(formData.costDelta) : undefined,
      })
      toast.success('Scope change flagged')
      onOpenChange(false)
      setFormData(defaultFormData)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to flag scope change:', error)
      toast.error('Failed to flag scope change')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(defaultFormData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Flag Scope Change</DialogTitle>
          <DialogDescription>
            Report a scope change for review. Changes will be tracked against the baseline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trigger-type">Change Type *</Label>
            <Select
              value={formData.triggerType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, triggerType: value as ScopeChangeTrigger }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select change type" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_TRIGGER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-type">Request Category</Label>
            <Select
              value={formData.requestType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, requestType: value as ScopeChangeRequestType }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_REQUEST_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {deliverables.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="deliverable">Affected Deliverable</Label>
              <Select
                value={formData.affectedDeliverableId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, affectedDeliverableId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deliverable (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {deliverables.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the scope change..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hours-delta">Hours Impact</Label>
              <Input
                id="hours-delta"
                type="number"
                placeholder="+5"
                value={formData.hoursDelta}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hoursDelta: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline-delta">Days Impact</Label>
              <Input
                id="timeline-delta"
                type="number"
                placeholder="+3"
                value={formData.timelineDeltaDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timelineDeltaDays: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-delta">Cost Impact</Label>
              <Input
                id="cost-delta"
                type="number"
                placeholder="+500"
                value={formData.costDelta}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, costDelta: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Flag Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
