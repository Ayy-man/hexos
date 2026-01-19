'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Package,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ProposalDeliverable, ProposalDeliverableWithChildren } from '@/lib/api/proposal-deliverables'
import {
  extractDeliverablesFromProposalAction,
  addDeliverableAction,
  updateDeliverableAction,
  deleteDeliverableAction,
} from '../../actions/deliverableStepActions'

interface DeliverablesStepProps {
  inquiryId: string
  deliverables: ProposalDeliverableWithChildren[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onDeliverablesChange: (deliverables: ProposalDeliverableWithChildren[]) => void
  totalPrice: number
}

interface DeliverableFormData {
  name: string
  description: string
  price: string
  parentId?: string
}

const initialFormData: DeliverableFormData = {
  name: '',
  description: '',
  price: '',
}

export function DeliverablesStep({
  inquiryId,
  deliverables,
  selectedIds,
  onSelectionChange,
  onDeliverablesChange,
  totalPrice,
}: DeliverablesStepProps) {
  const [isPending, startTransition] = useTransition()
  const [isExtracting, setIsExtracting] = useState(false)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingDeliverable, setDeletingDeliverable] = useState<ProposalDeliverable | null>(null)
  const [editingDeliverable, setEditingDeliverable] = useState<ProposalDeliverable | null>(null)
  const [formData, setFormData] = useState<DeliverableFormData>(initialFormData)
  const [addingAsChildOf, setAddingAsChildOf] = useState<string | undefined>()

  // Get all IDs from tree structure
  const getAllIds = (items: ProposalDeliverableWithChildren[]): string[] => {
    const ids: string[] = []
    const collect = (nodes: ProposalDeliverableWithChildren[]) => {
      nodes.forEach((node) => {
        ids.push(node.id)
        if (node.children) collect(node.children)
      })
    }
    collect(items)
    return ids
  }

  // Find a node in the tree by ID and count its children
  const getChildCount = (id: string): number => {
    const findNode = (nodes: ProposalDeliverableWithChildren[]): ProposalDeliverableWithChildren | null => {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
          const found = findNode(node.children)
          if (found) return found
        }
      }
      return null
    }
    const node = findNode(deliverables)
    if (!node || !node.children) return 0
    // Count all descendants, not just direct children
    return getAllIds(node.children).length
  }

  const allIds = getAllIds(deliverables)
  const allSelected = selectedIds.length === allIds.length && allIds.length > 0
  const noneSelected = selectedIds.length === 0

  const toggleDeliverable = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const selectAll = () => {
    onSelectionChange(allIds)
  }

  const selectNone = () => {
    onSelectionChange([])
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // AI Extraction
  const handleExtractFromProposal = () => {
    setIsExtracting(true)
    startTransition(async () => {
      try {
        const result = await extractDeliverablesFromProposalAction(inquiryId)
        if (result.success && result.tree) {
          toast.success('Deliverables extracted from proposal')
          onDeliverablesChange(result.tree)
          // Select all newly extracted items
          const allNewIds = getAllIds(result.tree)
          onSelectionChange(allNewIds)
        } else {
          toast.error(result.error || 'Failed to extract deliverables')
        }
      } catch (error) {
        console.error('Extract error:', error)
        toast.error('Failed to extract deliverables')
      } finally {
        setIsExtracting(false)
      }
    })
  }

  // Add deliverable
  const handleOpenAddModal = (parentId?: string) => {
    setFormData(initialFormData)
    setAddingAsChildOf(parentId)
    setShowAddModal(true)
  }

  const handleAddDeliverable = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await addDeliverableAction(
          inquiryId,
          formData.name.trim(),
          formData.description.trim() || undefined,
          formData.price ? parseFloat(formData.price) : undefined,
          addingAsChildOf
        )

        if (result.success && result.deliverable) {
          toast.success('Deliverable added')
          // Use returned tree, or construct minimal tree from deliverable if tree is empty
          const newTree = result.tree && result.tree.length > 0
            ? result.tree
            : [{ ...result.deliverable, children: [] as ProposalDeliverableWithChildren[] }]
          // Update tree first, then update selection
          onDeliverablesChange(newTree)
          onSelectionChange([...selectedIds, result.deliverable.id])
          setShowAddModal(false)
        } else {
          toast.error(result.error || 'Failed to add deliverable')
        }
      } catch (error) {
        console.error('Add error:', error)
        toast.error('Failed to add deliverable')
      }
    })
  }

  // Edit deliverable
  const handleOpenEditModal = (deliverable: ProposalDeliverable) => {
    setEditingDeliverable(deliverable)
    setFormData({
      name: deliverable.name,
      description: deliverable.description || '',
      price: deliverable.price?.toString() || '',
    })
    setShowEditModal(true)
  }

  const handleUpdateDeliverable = () => {
    if (!editingDeliverable) return
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateDeliverableAction(editingDeliverable.id, inquiryId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: formData.price ? parseFloat(formData.price) : undefined,
        })

        if (result.success && result.tree) {
          toast.success('Deliverable updated')
          onDeliverablesChange(result.tree)
          setShowEditModal(false)
          setEditingDeliverable(null)
        } else {
          toast.error(result.error || 'Failed to update deliverable')
        }
      } catch (error) {
        console.error('Update error:', error)
        toast.error('Failed to update deliverable')
      }
    })
  }

  // Delete deliverable - opens confirmation dialog
  const handleOpenDeleteDialog = (deliverable: ProposalDeliverable) => {
    setDeletingDeliverable(deliverable)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    if (!deletingDeliverable) return

    startTransition(async () => {
      try {
        const result = await deleteDeliverableAction(deletingDeliverable.id, inquiryId)

        if (result.success) {
          toast.success('Deliverable deleted')
          // Update tree and sync selection with remaining items
          const newTree = result.tree || []
          onDeliverablesChange(newTree)
          const remainingIds = getAllIds(newTree)
          onSelectionChange(selectedIds.filter((id) => remainingIds.includes(id)))
        } else {
          toast.error(result.error || 'Failed to delete deliverable')
        }
      } catch (error) {
        console.error('Delete error:', error)
        toast.error('Failed to delete deliverable')
      } finally {
        setShowDeleteDialog(false)
        setDeletingDeliverable(null)
      }
    })
  }

  // Render a deliverable row (recursive for children)
  const renderDeliverable = (
    deliverable: ProposalDeliverableWithChildren,
    depth: number = 0
  ) => {
    const isSelected = selectedIds.includes(deliverable.id)
    const price = deliverable.counter_price ?? deliverable.price
    const hasChildren = deliverable.children && deliverable.children.length > 0

    return (
      <div key={deliverable.id}>
        <Card
          className={cn(
            'cursor-pointer transition-all',
            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50',
            depth > 0 && 'ml-6 border-l-2 border-muted'
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              {/* Selection checkbox */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleDeliverable(deliverable.id)
                }}
                className="flex items-center justify-center pt-0.5"
              >
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {depth > 0 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-medium">{deliverable.name}</h3>
                    </div>
                    {deliverable.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {deliverable.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {price != null ? (
                      <span className="font-semibold text-green-600">
                        {formatCurrency(price)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}

                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEditModal(deliverable)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenAddModal(deliverable.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Sub-deliverable
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDeleteDialog(deliverable)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 mt-2">
                  {deliverable.source === 'ai_parsed' && (
                    <Badge variant="outline" className="text-xs">
                      AI Parsed
                    </Badge>
                  )}
                  {deliverable.source === 'blueprint_tier' && (
                    <Badge variant="outline" className="text-xs">
                      Blueprint
                    </Badge>
                  )}
                  {deliverable.source === 'custom' && (
                    <Badge variant="outline" className="text-xs">
                      Manual
                    </Badge>
                  )}
                  {deliverable.change_status === 'edited' && (
                    <Badge variant="secondary" className="text-xs">
                      Edited
                    </Badge>
                  )}
                  {deliverable.change_status === 'added' && (
                    <Badge variant="secondary" className="text-xs">
                      Added
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render children */}
        {hasChildren && (
          <div className="mt-2 space-y-2">
            {deliverable.children.map((child) => renderDeliverable(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Empty state
  if (deliverables.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Define Deliverables</h2>
          <p className="text-muted-foreground">
            Extract deliverables from the proposal or add them manually
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Deliverables Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start by extracting deliverables from the proposal using AI, or add them manually.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleExtractFromProposal}
                disabled={isExtracting || isPending}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract from Proposal
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => handleOpenAddModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add Modal */}
        <AddDeliverableDialog
          open={showAddModal}
          onOpenChange={setShowAddModal}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddDeliverable}
          isPending={isPending}
          isSubDeliverable={!!addingAsChildOf}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Select Deliverables</h2>
        <p className="text-muted-foreground">
          Choose which deliverables from the proposal to include in the project
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={allSelected ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant={noneSelected ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={selectNone}
                >
                  Select None
                </Button>
              </div>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} of {allIds.length} selected
              </span>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPrice)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables List */}
      <div className="space-y-3">
        {deliverables.map((deliverable) => renderDeliverable(deliverable))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => handleOpenAddModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deliverable
        </Button>
        <Button
          variant="ghost"
          onClick={handleExtractFromProposal}
          disabled={isExtracting || isPending}
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Re-extracting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Re-extract from Proposal
            </>
          )}
        </Button>
      </div>

      {/* Add Modal */}
      <AddDeliverableDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleAddDeliverable}
        isPending={isPending}
        isSubDeliverable={!!addingAsChildOf}
      />

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deliverable</DialogTitle>
            <DialogDescription>
              Update the deliverable details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Voice AI Agent Setup"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price</label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/[^0-9.]/g, '') })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDeliverable} disabled={isPending}>
              {isPending ? (
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
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deliverable</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you sure you want to delete &quot;{deletingDeliverable?.name}&quot;?</p>
                {deletingDeliverable && getChildCount(deletingDeliverable.id) > 0 && (
                  <p className="mt-2 font-medium text-destructive">
                    This will also delete {getChildCount(deletingDeliverable.id)} sub-deliverable{getChildCount(deletingDeliverable.id) > 1 ? 's' : ''}.
                  </p>
                )}
                <p className="mt-2">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
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

// Add Deliverable Dialog
function AddDeliverableDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  isPending,
  isSubDeliverable,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: DeliverableFormData
  setFormData: (data: DeliverableFormData) => void
  onSubmit: () => void
  isPending: boolean
  isSubDeliverable: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSubDeliverable ? 'Add Sub-deliverable' : 'Add Deliverable'}
          </DialogTitle>
          <DialogDescription>
            {isSubDeliverable
              ? 'Add a sub-item under the selected deliverable'
              : 'Add a new deliverable to the project'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Voice AI Agent Setup"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of what's included..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <Input
              type="text"
              inputMode="decimal"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/[^0-9.]/g, '') })}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
