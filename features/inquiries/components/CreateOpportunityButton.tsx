'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Briefcase, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createOpportunityFromInquiryAction } from '@/features/admin/actions/opportunityActions'
import type { ProjectComplexity } from '@/lib/api/opportunity-types'

interface CreateOpportunityButtonProps {
  inquiryId: string
  prospectName: string
  blueprintName?: string
  industry?: string
  proposalContent?: unknown
}

export function CreateOpportunityButton({
  inquiryId,
  prospectName,
  blueprintName,
  industry,
}: CreateOpportunityButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state - pre-populated from inquiry
  const defaultTitle = blueprintName
    ? `${blueprintName} - ${prospectName}`
    : `Project for ${prospectName}`

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [estimatedWeeks, setEstimatedWeeks] = useState('')
  const [complexity, setComplexity] = useState<ProjectComplexity>('medium')
  const [techStack, setTechStack] = useState('')

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    startTransition(async () => {
      const result = await createOpportunityFromInquiryAction({
        inquiryId,
        title: title.trim(),
        description: description.trim() || undefined,
        estimatedWeeks: estimatedWeeks ? parseFloat(estimatedWeeks) : null,
        complexity,
        techStack: techStack
          ? techStack.split(',').map(t => t.trim()).filter(Boolean)
          : undefined,
      })

      if (result.success) {
        toast.success('Opportunity created! Redirecting...')
        setOpen(false)
        router.push('/admin/opportunities')
      } else {
        toast.error(result.message || 'Failed to create opportunity')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Briefcase className="h-4 w-4 mr-2" />
          Create Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Create Opportunity from Inquiry
          </DialogTitle>
          <DialogDescription>
            Create a developer opportunity based on this inquiry&apos;s brief.
            Developers can then bid on this work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opp-title">Title *</Label>
            <Input
              id="opp-title"
              placeholder="e.g., E-commerce Automation Build"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opp-description">Description</Label>
            <Textarea
              id="opp-description"
              placeholder="Brief description of the opportunity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Don&apos;t include sensitive client details - this will be visible to developers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opp-weeks">Est. Weeks</Label>
              <Input
                id="opp-weeks"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="e.g., 4"
                value={estimatedWeeks}
                onChange={(e) => setEstimatedWeeks(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-complexity">Complexity</Label>
              <Select value={complexity} onValueChange={(v) => setComplexity(v as ProjectComplexity)}>
                <SelectTrigger id="opp-complexity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opp-tech">Tech Stack</Label>
            <Input
              id="opp-tech"
              placeholder="e.g., Make, Airtable, Slack"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of technologies
            </p>
          </div>

          {industry && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Industry:</span> {industry}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !title.trim()}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Opportunity'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
