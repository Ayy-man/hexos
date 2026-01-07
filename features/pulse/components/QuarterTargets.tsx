'use client'

import { useState } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TargetCard } from './TargetCard'
import { getCurrentQuarter, getQuarterLabel, type Quarter } from '@/lib/utils/pulseCalculations'
import type { PulseTargetWithOwners } from '@/lib/types/pulse'
import { createTargetAction, reorderTargetsAction } from '../actions/targetActions'

interface QuarterTargetsProps {
  targets: PulseTargetWithOwners[]
  quarter?: Quarter
  goalId?: string
  isAdmin?: boolean
  onUpdate?: () => void
}

function SortableTargetCard({
  target,
  onUpdate,
}: {
  target: PulseTargetWithOwners
  onUpdate?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: target.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <button
        {...attributes}
        {...listeners}
        className="p-1 mt-3 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <TargetCard target={target} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

export function QuarterTargets({
  targets,
  quarter = getCurrentQuarter(),
  goalId,
  isAdmin = false,
  onUpdate,
}: QuarterTargetsProps) {
  const [isAddingTarget, setIsAddingTarget] = useState(false)
  const [newTargetTitle, setNewTargetTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [orderedTargets, setOrderedTargets] = useState<PulseTargetWithOwners[]>(targets)

  // Keep orderedTargets in sync with props
  if (targets.length !== orderedTargets.length || targets.some((t) => !orderedTargets.find(ot => ot.id === t.id))) {
    setOrderedTargets(targets)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = orderedTargets.findIndex((t) => t.id === active.id)
      const newIndex = orderedTargets.findIndex((t) => t.id === over.id)

      const newOrder = arrayMove(orderedTargets, oldIndex, newIndex)
      setOrderedTargets(newOrder)

      await reorderTargetsAction(quarter, newOrder.map((t) => t.id))
    }
  }

  const handleAddTarget = async () => {
    if (!newTargetTitle.trim()) return

    setIsCreating(true)
    try {
      await createTargetAction({
        quarter,
        title: newTargetTitle.trim(),
        goal_id: goalId,
      })
      setNewTargetTitle('')
      setIsAddingTarget(false)
      onUpdate?.()
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTarget()
    if (e.key === 'Escape') {
      setNewTargetTitle('')
      setIsAddingTarget(false)
    }
  }

  // Separate completed and in-progress targets
  const completedTargets = orderedTargets.filter(t => t.status === 'completed')
  const activeTargets = orderedTargets.filter(t => t.status !== 'completed')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {getQuarterLabel(quarter)} Targets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeTargets.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Active targets */}
            {activeTargets.map((target) => (
              <SortableTargetCard key={target.id} target={target} onUpdate={onUpdate} />
            ))}
          </SortableContext>
        </DndContext>

        {/* Completed targets (not draggable) */}
        {completedTargets.map((target) => (
          <TargetCard key={target.id} target={target} onUpdate={onUpdate} />
        ))}

        {/* Empty state */}
        {targets.length === 0 && !isAddingTarget && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No targets for {quarter}
          </p>
        )}

        {/* Add target (admin only) */}
        {isAdmin && (
          <>
            {isAddingTarget ? (
              <div className="space-y-2">
                <Input
                  value={newTargetTitle}
                  onChange={(e) => setNewTargetTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Target title..."
                  className="text-sm"
                  autoFocus
                  disabled={isCreating}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleAddTarget}
                    disabled={isCreating || !newTargetTitle.trim()}
                  >
                    Add Target
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNewTargetTitle('')
                      setIsAddingTarget(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAddingTarget(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Target
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
