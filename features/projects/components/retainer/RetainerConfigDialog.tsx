'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { updateRetainerConfigAction } from '@/features/projects/actions/retainerActions'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'

interface RetainerConfigDialogProps {
  project: ProjectWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  availableDevs: Array<{ id: string; name: string; email: string }>
}

export function RetainerConfigDialog({
  project,
  open,
  onOpenChange,
  availableDevs,
}: RetainerConfigDialogProps) {
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [assignees, setAssignees] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when project changes
  useEffect(() => {
    if (project) {
      setCadence(project.check_in_cadence || 'weekly')
      setAssignees(project.check_in_assignees || [])
      setTeamMembers(project.retainer_dev_ids || [])
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateRetainerConfigAction({
        projectId: project.id,
        checkInCadence: cadence,
        checkInAssignees: assignees,
        retainerDevIds: teamMembers,
      })

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Retainer configuration updated')
        onOpenChange(false)
      }
    } catch (error) {
      console.error('[RetainerConfigDialog] Error:', error)
      toast.error('Failed to update configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAssignee = (role: string) => {
    setAssignees((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const toggleTeamMember = (devId: string) => {
    setTeamMembers((prev) =>
      prev.includes(devId) ? prev.filter((id) => id !== devId) : [...prev, devId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retainer Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Check-in Cadence */}
          <div className="space-y-3">
            <Label>Check-in Cadence</Label>
            <RadioGroup value={cadence} onValueChange={(value) => setCadence(value as 'weekly' | 'biweekly' | 'monthly')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="font-normal cursor-pointer">
                  Weekly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="biweekly" id="biweekly" />
                <Label htmlFor="biweekly" className="font-normal cursor-pointer">
                  Biweekly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">
                  Monthly
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Check-in Assignees */}
          <div className="space-y-3">
            <Label>Who should log check-ins?</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignee-admin"
                  checked={assignees.includes('admin')}
                  onCheckedChange={() => toggleAssignee('admin')}
                />
                <Label htmlFor="assignee-admin" className="font-normal cursor-pointer">
                  Admin
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignee-dfy"
                  checked={assignees.includes('dfy')}
                  onCheckedChange={() => toggleAssignee('dfy')}
                />
                <Label htmlFor="assignee-dfy" className="font-normal cursor-pointer">
                  DFY Partner
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignee-dev"
                  checked={assignees.includes('dev')}
                  onCheckedChange={() => toggleAssignee('dev')}
                />
                <Label htmlFor="assignee-dev" className="font-normal cursor-pointer">
                  Developer
                </Label>
              </div>
            </div>
          </div>

          {/* Team Members */}
          {availableDevs.length > 0 && (
            <div className="space-y-3">
              <Label>Retainer Team Members</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableDevs.map((dev) => (
                  <div key={dev.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${dev.id}`}
                      checked={teamMembers.includes(dev.id)}
                      onCheckedChange={() => toggleTeamMember(dev.id)}
                    />
                    <Label htmlFor={`team-${dev.id}`} className="font-normal cursor-pointer">
                      {dev.name} ({dev.email})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
