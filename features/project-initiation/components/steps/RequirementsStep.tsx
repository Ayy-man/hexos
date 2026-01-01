'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ClipboardList, Plus, ChevronDown, ChevronRight, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequirementTemplate, RequirementTemplateTree } from '@/lib/api/requirement-templates.shared'
import { buildTemplateTree } from '@/lib/api/requirement-templates.shared'
import type { RequirementNode, RequirementTreeNode } from '../../utils/treeHelpers'
import {
  buildTree,
  createDefaultNode,
  addNode,
  updateNode,
  deleteNode,
} from '../../utils/treeHelpers'
import { RequirementDetailPanel } from '../RequirementDetailPanel'

interface RequirementsStepProps {
  requirements: RequirementNode[]
  onChange: (requirements: RequirementNode[]) => void
  templates: RequirementTemplate[]
}

const OWNER_COLORS = {
  hexona: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  dfy: 'bg-purple-100 text-purple-700 border-purple-200',
  client: 'bg-amber-100 text-amber-700 border-amber-200',
} as const

const OWNER_LABELS = {
  hexona: 'Hexona',
  dfy: 'DFY',
  client: 'Client',
} as const

export function RequirementsStep({
  requirements,
  onChange,
  templates,
}: RequirementsStepProps) {
  const [customTitle, setCustomTitle] = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)

  // Build tree for rendering
  const tree = buildTree(requirements)

  // Build template tree and group by category (only root templates)
  const templateTree = buildTemplateTree(templates)
  const templatesByCategory = templateTree.reduce((acc, t) => {
    const category = t.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(t)
    return acc
  }, {} as Record<string, RequirementTemplateTree[]>)

  const handleAddCustom = () => {
    if (!customTitle.trim()) return
    const newNode = createDefaultNode({
      title: customTitle.trim(),
      position: requirements.filter(r => !r.parent_id).length,
    })
    onChange(addNode(requirements, newNode))
    setCustomTitle('')
    setExpandedIds(new Set([...expandedIds, newNode.id]))
    setEditingId(newNode.id)
  }

  // Recursively add template and all its children
  const handleAddFromTemplate = (template: RequirementTemplateTree) => {
    const newNodes: RequirementNode[] = []
    const newExpandedIds = new Set(expandedIds)

    // Recursive function to add template and children
    const addTemplateRecursive = (
      t: RequirementTemplateTree,
      parentId: string | null,
      siblingCount: number
    ): string => {
      const node = createDefaultNode({
        parent_id: parentId,
        title: t.name,
        description: t.description || '',
        loom_url: t.loom_url || '',
        owner_type: t.default_owner || 'hexona',
        blocker_type: t.default_blocker || 'none',
        position: siblingCount,
      })
      newNodes.push(node)
      newExpandedIds.add(node.id)

      // Recursively add children
      t.children.forEach((child, index) => {
        addTemplateRecursive(child, node.id, index)
      })

      return node.id
    }

    // Start from root
    const rootSiblings = requirements.filter(r => !r.parent_id).length
    addTemplateRecursive(template, null, rootSiblings)

    // Add all nodes to requirements
    let updatedRequirements = [...requirements]
    for (const node of newNodes) {
      updatedRequirements = addNode(updatedRequirements, node)
    }

    onChange(updatedRequirements)
    setTemplateOpen(false)
    setExpandedIds(newExpandedIds)
  }

  const handleAddChild = (parentId: string) => {
    const siblings = requirements.filter(r => r.parent_id === parentId)
    const newNode = createDefaultNode({
      parent_id: parentId,
      position: siblings.length,
    })
    onChange(addNode(requirements, newNode))
    setExpandedIds(new Set([...expandedIds, parentId, newNode.id]))
    setEditingId(newNode.id)
  }

  const handleUpdate = (id: string, updates: Partial<RequirementNode>) => {
    onChange(updateNode(requirements, id, updates))
  }

  const handleDelete = (id: string) => {
    onChange(deleteNode(requirements, id))
    if (editingId === id) setEditingId(null)
  }

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedIds(next)
  }

  // Render a single requirement node
  const renderNode = (node: RequirementTreeNode) => {
    const isExpanded = expandedIds.has(node.id)
    const isEditing = editingId === node.id
    const hasChildren = node.children.length > 0

    return (
      <div key={node.id} className="relative">
        {/* Tree connector lines */}
        {node.depth > 0 && (
          <>
            {/* Vertical line from parent */}
            <div
              className="absolute border-l-2 border-muted-foreground/20"
              style={{
                left: `${(node.depth - 1) * 24 + 12}px`,
                top: 0,
                height: '24px',
              }}
            />
            {/* Horizontal line to node */}
            <div
              className="absolute border-t-2 border-muted-foreground/20"
              style={{
                left: `${(node.depth - 1) * 24 + 12}px`,
                top: '24px',
                width: '12px',
              }}
            />
          </>
        )}

        {/* Node content */}
        <div
          className={cn(
            'relative rounded-lg border transition-all',
            isEditing ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50',
            node.blocker_type === 'absolute' && 'border-l-4 border-l-red-500',
            node.blocker_type === 'partial' && 'border-l-4 border-l-amber-500'
          )}
          style={{ marginLeft: `${node.depth * 24}px` }}
        >
          {/* Header row */}
          <div
            className="flex items-center gap-2 p-3 cursor-pointer"
            onClick={() => toggleExpanded(node.id)}
          >
            {/* Drag handle */}
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />

            {/* Expand/collapse */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(node.id)
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Title */}
            <span className={cn('flex-1 font-medium', !node.title && 'text-muted-foreground italic')}>
              {node.title || 'Untitled requirement'}
            </span>

            {/* Owner badge */}
            <Badge variant="outline" className={cn('text-xs', OWNER_COLORS[node.owner_type])}>
              {OWNER_LABELS[node.owner_type]}
            </Badge>

            {/* Blocker indicator */}
            {node.blocker_type !== 'none' && (
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  node.blocker_type === 'absolute' ? 'bg-red-500' : 'bg-amber-500'
                )}
                title={node.blocker_type === 'absolute' ? 'Absolute blocker' : 'Partial blocker'}
              />
            )}

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(node.id)
              }}
              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Detail panel (expanded) */}
          {isExpanded && (
            <div className="border-t px-3 py-4 space-y-4">
              <RequirementDetailPanel
                node={node}
                onUpdate={(updates) => handleUpdate(node.id, updates)}
                isEditing={isEditing}
                onStartEdit={() => setEditingId(node.id)}
              />

              {/* Add child button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddChild(node.id)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Child Requirement
              </Button>
            </div>
          )}
        </div>

        {/* Render children */}
        {isExpanded && hasChildren && (
          <div className="relative mt-2 space-y-2">
            {/* Vertical line connecting children */}
            <div
              className="absolute border-l-2 border-muted-foreground/20"
              style={{
                left: `${node.depth * 24 + 12}px`,
                top: 0,
                bottom: '24px',
              }}
            />
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Setup Requirements</h2>
        <p className="text-muted-foreground">
          Add onboarding requirements that need to be completed for this project
        </p>
      </div>

      {/* Add requirement controls */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Template quick-add */}
          <div className="flex gap-2">
            <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Add from template...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search templates..." />
                  <CommandList>
                    <CommandEmpty>No templates found.</CommandEmpty>
                    {Object.entries(templatesByCategory).map(([category, items]) => (
                      <CommandGroup key={category} heading={category.replace('_', ' ')}>
                        {items.map((template) => {
                          // Count total descendants
                          const countDescendants = (t: RequirementTemplateTree): number => {
                            return t.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0)
                          }
                          const childCount = countDescendants(template)

                          return (
                            <CommandItem
                              key={template.id}
                              onSelect={() => handleAddFromTemplate(template)}
                            >
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span>{template.name}</span>
                                  {childCount > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      +{childCount} items
                                    </Badge>
                                  )}
                                </div>
                                {template.description && (
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {template.description}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={cn('ml-auto text-xs', OWNER_COLORS[template.default_owner])}
                              >
                                {OWNER_LABELS[template.default_owner]}
                              </Badge>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Custom requirement input */}
          <div className="flex gap-2">
            <Input
              placeholder="Or type a custom requirement..."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCustom()
                }
              }}
            />
            <Button onClick={handleAddCustom} disabled={!customTitle.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requirements tree */}
      {tree.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Requirements Yet</h3>
            <p className="text-muted-foreground">
              Add requirements using templates or create custom ones above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tree.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  )
}
