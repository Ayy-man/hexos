'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Send,
  Users,
  Clock,
  Filter,
  Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createOpportunityAction,
  sendInvitationAction,
} from '@/features/admin/actions/opportunityActions'
import type { ProjectOpportunity, DevAvailability, OpportunityStatus, ProjectComplexity } from '@/lib/api/project-invitations'

interface Project {
  id: string
  project_name: string
  client_name: string
}

interface AdminOpportunitiesContentProps {
  opportunities: ProjectOpportunity[]
  availableDevs: DevAvailability[]
  projects: Project[]
}

const statusConfig: Record<OpportunityStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  },
  open: {
    label: 'Open',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  filled: {
    label: 'Filled',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  closed: {
    label: 'Closed',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
}

const complexityConfig = {
  low: { label: 'Low', className: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', className: 'bg-red-100 text-red-700' },
}

export function AdminOpportunitiesContent({
  opportunities,
  availableDevs,
  projects,
}: AdminOpportunitiesContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<ProjectOpportunity | null>(null)

  // New opportunity form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newProjectId, setNewProjectId] = useState<string>('')
  const [newEstimatedHours, setNewEstimatedHours] = useState('')
  const [newComplexity, setNewComplexity] = useState<ProjectComplexity>('medium')

  // Invite form state
  const [inviteDevId, setInviteDevId] = useState<string>('')
  const [inviteMessage, setInviteMessage] = useState('')

  // Filter opportunities
  const filteredOpportunities = filterStatus === 'all'
    ? opportunities
    : opportunities.filter(o => o.status === filterStatus)

  const handleCreateOpportunity = async () => {
    console.log('[DEBUG] handleCreateOpportunity called', { newTitle, newProjectId, newComplexity })

    if (!newTitle.trim()) {
      toast.error('Please enter a title')
      return
    }

    setIsLoading(true)
    try {
      const result = await createOpportunityAction({
        title: newTitle,
        description: newDescription || undefined,
        projectId: newProjectId && newProjectId !== '_none' ? newProjectId : null,
        estimatedHours: newEstimatedHours ? parseInt(newEstimatedHours) : null,
        complexity: newComplexity,
      })

      console.log('[DEBUG] createOpportunityAction result:', result)

      if (result.success) {
        toast.success('Opportunity created')
        setCreateDialogOpen(false)
        resetForm()
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to create opportunity')
      }
    } catch (error) {
      console.error('[DEBUG] Error in handleCreateOpportunity:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!selectedOpportunity || !inviteDevId) return

    // Need a project to send invitation - either from opportunity or selected
    const projectId = selectedOpportunity.project_id
    if (!projectId) {
      toast.error('This opportunity is not linked to a project')
      return
    }

    setIsLoading(true)
    try {
      const result = await sendInvitationAction({
        opportunityId: selectedOpportunity.id,
        projectId,
        devId: inviteDevId,
        message: inviteMessage || undefined,
      })

      if (result.success) {
        toast.success('Invitation sent')
        setInviteDialogOpen(false)
        setInviteDevId('')
        setInviteMessage('')
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('[DEBUG] Error in handleSendInvite:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewProjectId('')
    setNewEstimatedHours('')
    setNewComplexity('medium')
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Opportunity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Opportunity</DialogTitle>
              <DialogDescription>
                Create a new project opportunity to invite developers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., React Frontend Developer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the opportunity..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Link to Project (optional)</Label>
                <Select value={newProjectId} onValueChange={setNewProjectId}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Estimated Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    placeholder="40"
                    value={newEstimatedHours}
                    onChange={(e) => setNewEstimatedHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complexity">Complexity</Label>
                  <Select value={newComplexity} onValueChange={(v) => setNewComplexity(v as ProjectComplexity)}>
                    <SelectTrigger id="complexity">
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOpportunity} disabled={isLoading || !newTitle.trim()}>
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Opportunities List */}
      {filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No opportunities found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first opportunity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{opportunity.title}</CardTitle>
                    {opportunity.project && (
                      <CardDescription>
                        {opportunity.project.project_name}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusConfig[opportunity.status].className}>
                      {statusConfig[opportunity.status].label}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedOpportunity(opportunity)
                            setInviteDialogOpen(true)
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Invite Developer
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          View Applications
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {opportunity.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {opportunity.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {opportunity.estimated_hours && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {opportunity.estimated_hours}h
                    </Badge>
                  )}
                  <Badge variant="outline" className={complexityConfig[opportunity.complexity].className}>
                    {complexityConfig[opportunity.complexity].label}
                  </Badge>
                  {opportunity.tech_stack.slice(0, 3).map((tech) => (
                    <Badge key={tech} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Created {formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Developer</DialogTitle>
            <DialogDescription>
              Send an invitation to a developer for this opportunity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dev">Select Developer</Label>
              <Select value={inviteDevId} onValueChange={setInviteDevId}>
                <SelectTrigger id="dev">
                  <SelectValue placeholder="Choose a developer" />
                </SelectTrigger>
                <SelectContent>
                  {availableDevs.map((dev) => (
                    <SelectItem key={dev.dev_id} value={dev.dev_id}>
                      <div className="flex items-center gap-2">
                        <span>{dev.profile?.name || 'Unknown'}</span>
                        {dev.is_available && (
                          <Badge variant="outline" className="text-xs">
                            {dev.available_hours_per_week}h/week
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={isLoading || !inviteDevId}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
