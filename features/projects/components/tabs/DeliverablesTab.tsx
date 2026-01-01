'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Lock,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { confirmDeliverablesAction, sendForSignoffAction, signOffDeliverablesAction } from '../../actions/projectActions'
import {
  addDeliverableAction,
  updateDeliverableAction,
  updateDeliverableStatusAction,
  deleteDeliverableAction,
} from '../../actions/deliverableActions'

interface DeliverablesTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-cyan-500" />,
  blocked: <AlertCircle className="h-4 w-4 text-red-500" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface DeliverableFormData {
  title: string
  description: string
  estimated_hours: string
  due_date: string
}

const defaultFormData: DeliverableFormData = {
  title: '',
  description: '',
  estimated_hours: '',
  due_date: '',
}

export function DeliverablesTab({ project, userRole, isAdmin, isDfy }: DeliverablesTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingDeliverable, setEditingDeliverable] = useState<typeof deliverables[0] | null>(null)
  const [deletingDeliverable, setDeletingDeliverable] = useState<typeof deliverables[0] | null>(null)
  const [formData, setFormData] = useState<DeliverableFormData>(defaultFormData)

  const deliverables = project.deliverables || []

  // Permission checks
  const canAdd = isAdmin
  const canEdit = isAdmin
  const canDelete = isAdmin
  const canChangeStatus = isAdmin || userRole === 'dev'

  // Determine if deliverables are locked (after sign-off in certain phases)
  const isLocked = ['signed_off', 'collecting_access', 'in_progress', 'delivered', 'completed'].includes(project.status)

  // Sign-off flow status
  const isDeliverablesConfirmed = ['awaiting_signoff', 'signed_off'].includes(project.status) || isLocked
  const isAwaitingSignoff = project.status === 'awaiting_signoff'
  const isSignedOff = isLocked

  const handleConfirmDeliverables = async () => {
    setIsLoading(true)
    try {
      await confirmDeliverablesAction(project.id)
      toast.success('Deliverables confirmed')
    } catch (error) {
      console.error('Failed to confirm deliverables:', error)
      toast.error('Failed to confirm deliverables')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendForSignoff = async () => {
    setIsLoading(true)
    try {
      await sendForSignoffAction(project.id)
      toast.success('Sent for sign-off')
    } catch (error) {
      console.error('Failed to send for signoff:', error)
      toast.error('Failed to send for sign-off')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOff = async () => {
    setIsLoading(true)
    try {
      await signOffDeliverablesAction(project.id)
      toast.success('Deliverables signed off')
    } catch (error) {
      console.error('Failed to sign off:', error)
      toast.error('Failed to sign off')
    } finally {
      setIsLoading(false)
    }
  }

  // Add deliverable
  const handleAdd = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    setIsSaving(true)
    try {
      await addDeliverableAction(project.id, {
        title: formData.title,
        description: formData.description || undefined,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        due_date: formData.due_date || undefined,
      })
      toast.success('Deliverable added')
      setIsAddDialogOpen(false)
      setFormData(defaultFormData)
    } catch (error) {
      console.error('Failed to add deliverable:', error)
      toast.error('Failed to add deliverable')
    } finally {
      setIsSaving(false)
    }
  }

  // Edit deliverable
  const openEditDialog = (deliverable: typeof deliverables[0]) => {
    setEditingDeliverable(deliverable)
    setFormData({
      title: deliverable.title,
      description: deliverable.description || '',
      estimated_hours: deliverable.estimated_hours?.toString() || '',
      due_date: deliverable.due_date || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleEdit = async () => {
    if (!editingDeliverable) return
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    setIsSaving(true)
    try {
      await updateDeliverableAction(editingDeliverable.id, project.id, {
        title: formData.title,
        description: formData.description || undefined,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        due_date: formData.due_date || undefined,
      })
      toast.success('Deliverable updated')
      setIsEditDialogOpen(false)
      setEditingDeliverable(null)
      setFormData(defaultFormData)
    } catch (error) {
      console.error('Failed to update deliverable:', error)
      toast.error('Failed to update deliverable')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete deliverable
  const openDeleteDialog = (deliverable: typeof deliverables[0]) => {
    setDeletingDeliverable(deliverable)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingDeliverable) return
    setIsSaving(true)
    try {
      await deleteDeliverableAction(deletingDeliverable.id, project.id)
      toast.success('Deliverable deleted')
      setIsDeleteDialogOpen(false)
      setDeletingDeliverable(null)
    } catch (error) {
      console.error('Failed to delete deliverable:', error)
      toast.error('Failed to delete deliverable')
    } finally {
      setIsSaving(false)
    }
  }

  // Status change
  const handleStatusChange = async (deliverableId: string, status: string) => {
    setUpdatingStatus(deliverableId)
    try {
      await updateDeliverableStatusAction(
        deliverableId,
        project.id,
        status as 'pending' | 'in_progress' | 'blocked' | 'done'
      )
      toast.success(`Status updated to ${formatStatus(status)}`)
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const completedCount = deliverables.filter((d) => d.status === 'done').length

  return (
    <div className="space-y-6">
      {/* Sign-off Status Banner */}
      {isSignedOff && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="py-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Deliverables Signed Off
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                These deliverables have been confirmed and locked as the source of truth.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isAwaitingSignoff && isDfy && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="py-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Sign-off Required
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Please review the deliverables and confirm on behalf of your client.
              </p>
            </div>
            <ButtonHoldAndRelease
              onHoldComplete={handleSignOff}
              disabled={isLoading}
              variant="default"
              defaultText="Confirm on Behalf of Client"
              holdingText="Release to Confirm"
            />
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      {isAdmin && !isLocked && (
        <div className="flex items-center gap-3">
          {!isDeliverablesConfirmed && (
            <Button onClick={handleConfirmDeliverables} disabled={isLoading}>
              Confirm Deliverables
            </Button>
          )}
          {isDeliverablesConfirmed && !isAwaitingSignoff && (
            <ButtonHoldAndRelease
              onHoldComplete={handleSendForSignoff}
              disabled={isLoading}
              variant="default"
              defaultText="Send for DFY Sign-off"
              holdingText="Release to Send"
            />
          )}
        </div>
      )}

      {/* Deliverables List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deliverables</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {completedCount} / {deliverables.length} done
            </span>
            {canAdd && (
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No deliverables yet.
              {canAdd && ' Click "Add" to create the first deliverable.'}
            </p>
          ) : (
            <div className="divide-y">
              {deliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {STATUS_ICONS[deliverable.status] || STATUS_ICONS.pending}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{deliverable.title}</span>
                      {deliverable.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {deliverable.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {deliverable.estimated_hours && (
                      <span className="text-sm text-muted-foreground">
                        {deliverable.estimated_hours}h
                      </span>
                    )}
                    {deliverable.due_date && (
                      <span className="text-sm text-muted-foreground">
                        Due {new Date(deliverable.due_date).toLocaleDateString()}
                      </span>
                    )}

                    {/* Status dropdown or badge */}
                    {canChangeStatus ? (
                      <Select
                        value={deliverable.status}
                        onValueChange={(value) => handleStatusChange(deliverable.id, value)}
                        disabled={updatingStatus === deliverable.id}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[deliverable.status] || STATUS_COLORS.pending}
                      >
                        {formatStatus(deliverable.status)}
                      </Badge>
                    )}

                    {/* Actions dropdown (admin only) */}
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => openEditDialog(deliverable)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(deliverable)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Deliverable</DialogTitle>
            <DialogDescription>
              Add a new deliverable to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-title">Title *</Label>
              <Input
                id="add-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Landing Page Design"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about this deliverable"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-hours">Estimated Hours</Label>
                <Input
                  id="add-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="e.g., 8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-due">Due Date</Label>
                <Input
                  id="add-due"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
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
                'Add Deliverable'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Deliverable</DialogTitle>
            <DialogDescription>
              Update the deliverable details.
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hours">Estimated Hours</Label>
                <Input
                  id="edit-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-due">Due Date</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deliverable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingDeliverable?.title}&quot;?
              This action cannot be undone.
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
