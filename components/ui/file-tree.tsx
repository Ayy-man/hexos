'use client'

import { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ============================================
// Types
// ============================================

export interface FileTreeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  icon?: ReactNode
  children?: FileTreeItem[]
  data?: unknown
}

interface FileTreeProps {
  items: FileTreeItem[]
  className?: string
  onFileClick?: (item: FileTreeItem) => void
  renderFileActions?: (item: FileTreeItem) => ReactNode
  renderFolderActions?: (item: FileTreeItem) => ReactNode
  defaultExpanded?: boolean
}

interface FileTreeNodeProps {
  item: FileTreeItem
  level: number
  onFileClick?: (item: FileTreeItem) => void
  renderFileActions?: (item: FileTreeItem) => ReactNode
  renderFolderActions?: (item: FileTreeItem) => ReactNode
  defaultExpanded?: boolean
}

// ============================================
// FileTreeNode Component
// ============================================

function FileTreeNode({
  item,
  level,
  onFileClick,
  renderFileActions,
  renderFolderActions,
  defaultExpanded = true,
}: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)
  const [isHovered, setIsHovered] = useState(false)

  if (item.type === 'folder') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className="group relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CollapsibleTrigger className="flex items-center gap-1.5 py-1.5 px-2 w-full text-left rounded-md hover:bg-accent/50 transition-colors">
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-90'
              )}
            />
            {isOpen ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="text-sm font-medium truncate flex-1">{item.name}</span>
            {isHovered && renderFolderActions && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {renderFolderActions(item)}
              </div>
            )}
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="ml-4 pl-2 border-l border-border">
            {item.children?.map((child) => (
              <FileTreeNode
                key={child.id}
                item={child}
                level={level + 1}
                onFileClick={onFileClick}
                renderFileActions={renderFileActions}
                renderFolderActions={renderFolderActions}
                defaultExpanded={defaultExpanded}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // File node
  return (
    <div
      className="group relative flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onFileClick?.(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-4" /> {/* Spacer for alignment with folder chevron */}
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
// FileTree Component
// ============================================

export function FileTree({
  items,
  className,
  onFileClick,
  renderFileActions,
  renderFolderActions,
  defaultExpanded = true,
}: FileTreeProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-0.5', className)}>
      {items.map((item) => (
        <FileTreeNode
          key={item.id}
          item={item}
          level={0}
          onFileClick={onFileClick}
          renderFileActions={renderFileActions}
          renderFolderActions={renderFolderActions}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  )
}
