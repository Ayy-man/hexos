'use client'

import { useState } from 'react'
import { CheckCircle, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { completeProjectAction, moveToRetainerAction } from '@/features/projects/actions/projectActions'
import type { ProjectWithRelations } from '@/lib/api/projects'

interface CloseProjectDialogProps {
  project: ProjectWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  availableDevs?: Array<{ id: string; name: string; email: string }>
}

type CloseOption = 'complete' | 'retainer' | null

export function CloseProjectDialog({
  project,
  open,
  onOpenChange,
  availableDevs = [],
}: CloseProjectDialogProps) {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<CloseOption>(null)
  const [loading, setLoading] = useState(false)

  // Retainer config state
  const [checkInCadence, setCheckInCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [checkInAssignees, setCheckInAssignees] = useState<string[]>([])
  const [retainerDevIds, setRetainerDevIds] = useState<string[]>([])

  const handleComplete = async () => {
    setLoading(true)
    try {
      const result = await completeProjectAction(project.id)
      if (result.error) {
        alert(result.error)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to complete project:', error)
      alert('Failed to complete project')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveToRetainer = async () => {
    setLoading(true)
    try {
      const result = await moveToRetainerAction({
        projectId: project.id,
        checkInCadence,
        checkInAssignees,
        retainerDevIds,
      })
      if (result.error) {
        alert(result.error)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to move to retainer:', error)
      alert('Failed to move to retainer')
    } finally {
      setLoading(false)
    }
  }

  const handleAssigneeToggle = (role: string, checked: boolean) => {
    if (checked) {
      setCheckInAssignees([...checkInAssignees, role])
    } else {
      setCheckInAssignees(checkInAssignees.filter(r => r !== role))
    }
  }

  const handleDevToggle = (devId: string, checked: boolean) => {
    if (checked) {
      setRetainerDevIds([...retainerDevIds, devId])
    } else {
      setRetainerDevIds(retainerDevIds.filter(id => id !== devId))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Close Project</DialogTitle>
          <DialogDescription>
            Choose how to close {project.project_name}
          </DialogDescription>
        </DialogHeader>

        {!selectedOption ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedOption('complete')}
              className="w-full rounded-lg border border-stone-200 p-4 text-left hover:border-cyan-500 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-stone-900 dark:text-stone-100">
                    Complete Project
                  </div>
                  <div className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    Mark as done. Summary will be generated.
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedOption('retainer')}
              className="w-full rounded-lg border border-stone-200 p-4 text-left hover:border-cyan-500 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50"
            >
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div>
                  <div className="font-medium text-stone-900 dark:text-stone-100">
                    Move to Retainer
                  </div>
                  <div className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    Ongoing support with check-ins and tasks.
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : selectedOption === 'complete' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/50">
              <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-2">
                Completion Summary Preview
              </h3>
              <div className="space-y-1 text-sm text-stone-600 dark:text-stone-400">
                <p>
                  Deliverables: {project.deliverables?.filter(d => d.status === 'completed' || d.status === 'done').length || 0} of {project.deliverables?.length || 0}
                </p>
                {project.started_at && (
                  <p>
                    Duration: {Math.ceil((Date.now() - new Date(project.started_at).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                )}
                <p>
                  Team: {[project.dfy_partner?.name, project.assigned_dev?.name].filter(Boolean).join(', ') || 'None assigned'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedOption(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Completing...' : 'Confirm Complete'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Check-in Cadence
              </Label>
              <RadioGroup value={checkInCadence} onValueChange={(v) => setCheckInCadence(v as typeof checkInCadence)} className="mt-2 space-y-2">
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

            <div>
              <Label className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Check-in Assignees
              </Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assignee-admin"
                    checked={checkInAssignees.includes('admin')}
                    onCheckedChange={(checked) => handleAssigneeToggle('admin', checked as boolean)}
                  />
                  <Label htmlFor="assignee-admin" className="font-normal cursor-pointer">
                    Admin
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assignee-dfy"
                    checked={checkInAssignees.includes('dfy')}
                    onCheckedChange={(checked) => handleAssigneeToggle('dfy', checked as boolean)}
                  />
                  <Label htmlFor="assignee-dfy" className="font-normal cursor-pointer">
                    DFY Partner
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assignee-dev"
                    checked={checkInAssignees.includes('dev')}
                    onCheckedChange={(checked) => handleAssigneeToggle('dev', checked as boolean)}
                  />
                  <Label htmlFor="assignee-dev" className="font-normal cursor-pointer">
                    Developer
                  </Label>
                </div>
              </div>
            </div>

            {availableDevs.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  Retainer Team Members
                </Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {availableDevs.map((dev) => (
                    <div key={dev.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dev-${dev.id}`}
                        checked={retainerDevIds.includes(dev.id)}
                        onCheckedChange={(checked) => handleDevToggle(dev.id, checked as boolean)}
                      />
                      <Label htmlFor={`dev-${dev.id}`} className="font-normal cursor-pointer">
                        {dev.name} ({dev.email})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedOption(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleMoveToRetainer}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Moving...' : 'Confirm Move to Retainer'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
