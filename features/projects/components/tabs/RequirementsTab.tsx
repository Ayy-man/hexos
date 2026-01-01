'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
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
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Video,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'
import {
  markRequirementCompleteAction,
  addRequirementAction,
  updateRequirementAction,
  deleteRequirementAction,
} from '../../actions/projectActions'

interface RequirementsTabProps {
  project: ProjectWithRelations
  requirements: OnboardingRequirement[]
  userRole: UserRole
  isAdmin: boolean
}

// Owner type colors and labels
const OWNER_COLORS: Record<string, string> = {
  hexona: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  dfy: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  client: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

const OWNER_LABELS: Record<string, string> = {
  hexona: 'Hexona',
  dfy: 'DFY',
  client: 'Client',
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  submitted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

// Blocker type indicators
const BLOCKER_STYLES: Record<string, { color: string; label: string }> = {
  none: { color: '', label: '' },
  partial: { color: 'border-l-4 border-l-amber-500', label: 'Partial Blocker' },
  absolute: { color: 'border-l-4 border-l-red-500', label: 'Blocker' },
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Build tree structure from flat array
interface RequirementTreeNode extends OnboardingRequirement {
  children: RequirementTreeNode[]
}

function buildTree(requirements: OnboardingRequirement[]): RequirementTreeNode[] {
  const nodeMap = new Map<string, RequirementTreeNode>()
  const roots: RequirementTreeNode[] = []

  // First pass: create nodes
  requirements.forEach((req) => {
    nodeMap.set(req.id, { ...req, children: [] })
  })

  // Second pass: build tree
  requirements.forEach((req) => {
    const node = nodeMap.get(req.id)!
    if (req.parent_id && nodeMap.has(req.parent_id)) {
      nodeMap.get(req.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

// Recursive requirement item component
function RequirementItem({
  requirement,
  depth = 0,
  userRole,
  isAdmin,
  updating,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddChild,
  expandedIds,
  onToggleExpand,
}: {
  requirement: RequirementTreeNode
  depth?: number
  userRole: UserRole
  isAdmin: boolean
  updating: string | null
  onToggleComplete: (req: OnboardingRequirement) => void
  onEdit: (req: OnboardingRequirement) => void
  onDelete: (req: OnboardingRequirement) => void
  onAddChild: (parentId: string) => void
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const hasChildren = requirement.children.length > 0
  const isExpanded = expandedIds.has(requirement.id)
  const blockerStyle = BLOCKER_STYLES[requirement.blocker_type || 'none']
  const isCompleted = requirement.status === 'approved'

  // Can user complete this requirement?
  const canComplete = (() => {
    if (isAdmin) return true
    if (userRole === 'dfy' && requirement.owner_type === 'dfy') return true
    if (userRole === 'client' && requirement.owner_type === 'client') return true
    return false
  })()

  return (
    <div>
      <div
        className={`flex items-start gap-3 py-3 px-3 hover:bg-muted/50 rounded-lg ${blockerStyle.color}`}
        style={{ marginLeft: depth * 24 }}
      >
        {/* Expand/collapse for items with children */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => onToggleExpand(requirement.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-5" /> // Spacer
        )}

        {/* Checkbox or status icon */}
        {canComplete ? (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggleComplete(requirement)}
            disabled={updating === requirement.id}
            className="mt-0.5"
          />
        ) : (
          <div className="mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : requirement.status === 'blocked' ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`font-medium ${
                isCompleted ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {requirement.title}
            </p>
            {/* Owner badge */}
            <Badge
              variant="outline"
              className={`text-xs ${OWNER_COLORS[requirement.owner_type || 'hexona']}`}
            >
              {OWNER_LABELS[requirement.owner_type || 'hexona']}
            </Badge>
            {/* Blocker badge */}
            {blockerStyle.label && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300">
                {blockerStyle.label}
              </Badge>
            )}
          </div>
          {requirement.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {requirement.description}
            </p>
          )}
          {requirement.notes && (
            <p className="text-sm text-muted-foreground/80 mt-1 italic">
              {requirement.notes}
            </p>
          )}
          {/* Links */}
          <div className="flex items-center gap-3 mt-2">
            {requirement.loom_url && (
              <a
                href={requirement.loom_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
              >
                <Video className="h-3 w-3" />
                Loom
              </a>
            )}
            {requirement.resource_url && (
              <a
                href={requirement.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Resource
              </a>
            )}
          </div>
        </div>

        {/* Status badge */}
        <Badge
          variant="secondary"
          className={STATUS_COLORS[requirement.status] || STATUS_COLORS.pending}
        >
          {formatStatus(requirement.status)}
        </Badge>

        {/* Actions dropdown (admin only) */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(requirement)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddChild(requirement.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sub-item
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(requirement)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {requirement.children.map((child) => (
            <RequirementItem
              key={child.id}
              requirement={child}
              depth={depth + 1}
              userRole={userRole}
              isAdmin={isAdmin}
              updating={updating}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Form for adding/editing requirements
interface RequirementFormData {
  title: string
  description: string
  notes: string
  owner_type: 'hexona' | 'dfy' | 'client'
  blocker_type: 'none' | 'partial' | 'absolute'
  loom_url: string
  resource_url: string
}

const defaultFormData: RequirementFormData = {
  title: '',
  description: '',
  notes: '',
  owner_type: 'hexona',
  blocker_type: 'none',
  loom_url: '',
  resource_url: '',
}

export function RequirementsTab({
  project,
  requirements,
  userRole,
  isAdmin,
}: RequirementsTabProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<OnboardingRequirement | null>(null)
  const [deletingRequirement, setDeletingRequirement] = useState<OnboardingRequirement | null>(null)
  const [parentIdForAdd, setParentIdForAdd] = useState<string | undefined>(undefined)
  const [formData, setFormData] = useState<RequirementFormData>(defaultFormData)
  const [isSaving, setIsSaving] = useState(false)

  // Build tree from flat requirements
  const tree = buildTree(requirements)

  // Calculate progress
  const completedCount = requirements.filter((r) => r.status === 'approved').length
  const progressPercent =
    requirements.length > 0
      ? Math.round((completedCount / requirements.length) * 100)
      : 0

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const allIds = new Set(requirements.filter((r) =>
      requirements.some((child) => child.parent_id === r.id)
    ).map((r) => r.id))
    setExpandedIds(allIds)
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const handleToggleComplete = async (requirement: OnboardingRequirement) => {
    setUpdating(requirement.id)
    try {
      // Toggle between pending and approved
      if (requirement.status === 'approved') {
        // TODO: Add action to uncomplete
        toast.info('Uncomplete not implemented yet')
      } else {
        await markRequirementCompleteAction(requirement.id, project.id)
        toast.success('Requirement marked complete')
      }
    } catch (error) {
      console.error('Failed to update requirement:', error)
      toast.error('Failed to update requirement')
    } finally {
      setUpdating(null)
    }
  }

  // Add handlers
  const openAddDialog = (parentId?: string) => {
    setFormData(defaultFormData)
    setParentIdForAdd(parentId)
    setIsAddDialogOpen(true)
  }

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    setIsSaving(true)
    try {
      await addRequirementAction(project.id, {
        title: formData.title,
        description: formData.description || undefined,
        owner_type: formData.owner_type,
        blocker_type: formData.blocker_type,
        parent_id: parentIdForAdd,
      })
      toast.success('Requirement added')
      setIsAddDialogOpen(false)
      setFormData(defaultFormData)
    } catch (error) {
      console.error('Failed to add requirement:', error)
      toast.error('Failed to add requirement')
    } finally {
      setIsSaving(false)
    }
  }

  // Edit handlers
  const openEditDialog = (requirement: OnboardingRequirement) => {
    setEditingRequirement(requirement)
    setFormData({
      title: requirement.title,
      description: requirement.description || '',
      notes: requirement.notes || '',
      owner_type: requirement.owner_type || 'hexona',
      blocker_type: requirement.blocker_type || 'none',
      loom_url: requirement.loom_url || '',
      resource_url: requirement.resource_url || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleEdit = async () => {
    if (!editingRequirement) return
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    setIsSaving(true)
    try {
      await updateRequirementAction(editingRequirement.id, project.id, {
        title: formData.title,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        owner_type: formData.owner_type,
        blocker_type: formData.blocker_type,
        loom_url: formData.loom_url || undefined,
        resource_url: formData.resource_url || undefined,
      })
      toast.success('Requirement updated')
      setIsEditDialogOpen(false)
      setEditingRequirement(null)
      setFormData(defaultFormData)
    } catch (error) {
      console.error('Failed to update requirement:', error)
      toast.error('Failed to update requirement')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete handlers
  const openDeleteDialog = (requirement: OnboardingRequirement) => {
    setDeletingRequirement(requirement)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingRequirement) return
    setIsSaving(true)
    try {
      await deleteRequirementAction(deletingRequirement.id, project.id)
      toast.success('Requirement deleted')
      setIsDeleteDialogOpen(false)
      setDeletingRequirement(null)
    } catch (error) {
      console.error('Failed to delete requirement:', error)
      toast.error('Failed to delete requirement')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-sm font-medium">
              {completedCount} / {requirements.length} ({progressPercent}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Requirements Checklist</CardTitle>
          <div className="flex items-center gap-2">
            {requirements.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse
                </Button>
              </>
            )}
            {isAdmin && (
              <Button size="sm" onClick={() => openAddDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Requirement
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No requirements defined for this project.
            </p>
          ) : (
            <div className="space-y-1">
              {tree.map((requirement) => (
                <RequirementItem
                  key={requirement.id}
                  requirement={requirement}
                  userRole={userRole}
                  isAdmin={isAdmin}
                  updating={updating}
                  onToggleComplete={handleToggleComplete}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  onAddChild={openAddDialog}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Requirement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {parentIdForAdd ? 'Add Sub-item' : 'Add Requirement'}
            </DialogTitle>
            <DialogDescription>
              {parentIdForAdd
                ? 'Add a new sub-item under this requirement.'
                : 'Add a new requirement to the project onboarding checklist.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-title">Title *</Label>
              <Input
                id="add-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Provide API credentials"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed instructions or context"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-owner">Owner</Label>
                <Select
                  value={formData.owner_type}
                  onValueChange={(v) => setFormData({ ...formData, owner_type: v as typeof formData.owner_type })}
                >
                  <SelectTrigger id="add-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hexona">Hexona</SelectItem>
                    <SelectItem value="dfy">DFY Partner</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-blocker">Blocker Type</Label>
                <Select
                  value={formData.blocker_type}
                  onValueChange={(v) => setFormData({ ...formData, blocker_type: v as typeof formData.blocker_type })}
                >
                  <SelectTrigger id="add-blocker">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="partial">Partial Blocker</SelectItem>
                    <SelectItem value="absolute">Absolute Blocker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Requirement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Requirement</DialogTitle>
            <DialogDescription>
              Update the requirement details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes or follow-up items"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-owner">Owner</Label>
                <Select
                  value={formData.owner_type}
                  onValueChange={(v) => setFormData({ ...formData, owner_type: v as typeof formData.owner_type })}
                >
                  <SelectTrigger id="edit-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hexona">Hexona</SelectItem>
                    <SelectItem value="dfy">DFY Partner</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-blocker">Blocker Type</Label>
                <Select
                  value={formData.blocker_type}
                  onValueChange={(v) => setFormData({ ...formData, blocker_type: v as typeof formData.blocker_type })}
                >
                  <SelectTrigger id="edit-blocker">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="partial">Partial Blocker</SelectItem>
                    <SelectItem value="absolute">Absolute Blocker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-loom">Loom URL</Label>
              <Input
                id="edit-loom"
                type="url"
                value={formData.loom_url}
                onChange={(e) => setFormData({ ...formData, loom_url: e.target.value })}
                placeholder="https://loom.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-resource">Resource URL</Label>
              <Input
                id="edit-resource"
                type="url"
                value={formData.resource_url}
                onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingRequirement?.title}&quot;?
              {deletingRequirement && requirements.some(r => r.parent_id === deletingRequirement.id) && (
                <span className="block mt-2 font-medium text-amber-600">
                  This will also delete all sub-items.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
