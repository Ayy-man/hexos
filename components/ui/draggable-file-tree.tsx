'use client'

import { useState, useCallback, useMemo, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, Folder, FolderOpen, GripVertical } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  closestCenter,
  MeasuringStrategy,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ============================================
// Types
// ============================================

export interface DraggableFileTreeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  icon?: ReactNode
  children?: DraggableFileTreeItem[]
  data?: unknown
}

interface DraggableFileTreeProps {
  items: DraggableFileTreeItem[]
  className?: string
  onFileClick?: (item: DraggableFileTreeItem) => void
  onMove?: (itemId: string, newParentId: string | null, newIndex: number) => void
  renderFileActions?: (item: DraggableFileTreeItem) => ReactNode
  renderFolderActions?: (item: DraggableFileTreeItem) => ReactNode
  defaultExpanded?: boolean
}

interface FlatItem {
  id: string
  parentId: string | null
  depth: number
  item: DraggableFileTreeItem
  isFolder: boolean
}

// ============================================
// Helper Functions
// ============================================

function flattenTree(
  items: DraggableFileTreeItem[],
  parentId: string | null = null,
  depth: number = 0,
  expandedFolders: Set<string>
): FlatItem[] {
  const result: FlatItem[] = []
  for (const item of items) {
    result.push({
      id: item.id,
      parentId,
      depth,
      item,
      isFolder: item.type === 'folder',
    })
    if (item.type === 'folder' && item.children && expandedFolders.has(item.id)) {
      result.push(...flattenTree(item.children, item.id, depth + 1, expandedFolders))
    }
  }
  return result
}

function getDescendantIds(item: DraggableFileTreeItem): string[] {
  const ids: string[] = []
  if (item.children) {
    for (const child of item.children) {
      ids.push(child.id)
      ids.push(...getDescendantIds(child))
    }
  }
  return ids
}

function findItemById(
  items: DraggableFileTreeItem[],
  id: string
): DraggableFileTreeItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findItemById(item.children, id)
      if (found) return found
    }
  }
  return null
}

// ============================================
// Draggable Node Component
// ============================================

interface DraggableNodeProps {
  flatItem: FlatItem
  isExpanded: boolean
  onToggle: (id: string) => void
  onFileClick?: (item: DraggableFileTreeItem) => void
  renderFileActions?: (item: DraggableFileTreeItem) => ReactNode
  renderFolderActions?: (item: DraggableFileTreeItem) => ReactNode
  isOverFolder?: boolean
}

function DraggableNode({
  flatItem,
  isExpanded,
  onToggle,
  onFileClick,
  renderFileActions,
  renderFolderActions,
  isOverFolder,
}: DraggableNodeProps) {
  const { item, depth, isFolder } = flatItem
  const [isHovered, setIsHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: isFolder ? 'folder' : 'file',
      item: flatItem,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const indent = depth * 16

  if (isFolder) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group relative',
          isDragging && 'opacity-50',
          isOverFolder && 'bg-accent/70 rounded-md'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors"
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity',
              isDragging && 'opacity-100'
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <button
            onClick={() => onToggle(item.id)}
            className="flex items-center gap-1.5 flex-1"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="text-sm font-medium truncate">{item.name}</span>
          </button>
          {isHovered && renderFolderActions && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {renderFolderActions(item)}
            </div>
          )}
        </div>
      </div>
    )
  }

  // File node
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50'
      )}
      onClick={() => onFileClick?.(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ width: `${indent}px` }} />
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity',
          isDragging && 'opacity-100'
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="w-4" /> {/* Spacer for alignment */}
      {item.icon}
      <span className="text-sm truncate flex-1">{item.name}</span>
      {isHovered && renderFileActions && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {renderFileActions(item)}
        </div>
      )}
    </div>
  )
}

// ============================================
// Drag Overlay Component
// ============================================

function DragOverlayContent({ item }: { item: DraggableFileTreeItem }) {
  return (
    <div className="flex items-center gap-1.5 py-1.5 px-3 bg-background border rounded-md shadow-lg">
      {item.type === 'folder' ? (
        <Folder className="h-4 w-4 text-primary" />
      ) : (
        item.icon
      )}
      <span className="text-sm font-medium">{item.name}</span>
    </div>
  )
}

// ============================================
// Main DraggableFileTree Component
// ============================================

export function DraggableFileTree({
  items,
  className,
  onFileClick,
  onMove,
  renderFileActions,
  renderFolderActions,
  defaultExpanded = true,
}: DraggableFileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    if (!defaultExpanded) return new Set()
    // Collect all folder IDs for default expansion
    const folderIds = new Set<string>()
    const collectFolders = (items: DraggableFileTreeItem[]) => {
      for (const item of items) {
        if (item.type === 'folder') {
          folderIds.add(item.id)
          if (item.children) collectFolders(item.children)
        }
      }
    }
    collectFolders(items)
    return folderIds
  })
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const flatItems = useMemo(
    () => flattenTree(items, null, 0, expandedFolders),
    [items, expandedFolders]
  )

  const activeItem = useMemo(() => {
    if (!activeId) return null
    return findItemById(items, activeId as string)
  }, [activeId, items])

  const handleToggle = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id ?? null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setOverId(null)

      if (!over || !onMove) return
      if (active.id === over.id) return

      const activeData = active.data.current as { item: FlatItem } | undefined
      const overData = over.data.current as { item: FlatItem } | undefined

      if (!activeData?.item) return

      const activeItem = activeData.item
      const overItem = overData?.item

      // Prevent dropping folder into itself or its descendants
      if (activeItem.isFolder) {
        const descendants = getDescendantIds(activeItem.item)
        if (descendants.includes(over.id as string)) return
      }

      // Determine new parent and index
      let newParentId: string | null = null
      let newIndex = 0

      if (overItem) {
        if (overItem.isFolder) {
          // Dropping onto a folder - move into it
          newParentId = overItem.id
          const folder = findItemById(items, overItem.id)
          newIndex = folder?.children?.length ?? 0
        } else {
          // Dropping onto a file - move to same parent, after the file
          newParentId = overItem.parentId
          const siblings = flatItems.filter((f) => f.parentId === overItem.parentId)
          const overIndex = siblings.findIndex((s) => s.id === over.id)
          newIndex = overIndex + 1
        }
      }

      onMove(active.id as string, newParentId, newIndex)
    },
    [onMove, items, flatItems]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
  }, [])

  if (items.length === 0) {
    return null
  }

  const itemIds = flatItems.map((f) => f.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={cn('space-y-0.5', className)}>
          {flatItems.map((flatItem) => (
            <DraggableNode
              key={flatItem.id}
              flatItem={flatItem}
              isExpanded={expandedFolders.has(flatItem.id)}
              onToggle={handleToggle}
              onFileClick={onFileClick}
              renderFileActions={renderFileActions}
              renderFolderActions={renderFolderActions}
              isOverFolder={
                overId === flatItem.id &&
                flatItem.isFolder &&
                activeId !== flatItem.id
              }
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem ? <DragOverlayContent item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
