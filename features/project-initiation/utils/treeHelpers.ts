import type { RequirementOwner, RequirementBlocker } from '@/lib/api/onboarding-requirements'

// ============================================
// Types
// ============================================

export interface RequirementNode {
  id: string // temp ID (temp-xxx) for new items, UUID for existing
  parent_id: string | null
  title: string
  description: string
  notes: string
  owner_type: RequirementOwner
  blocker_type: RequirementBlocker
  loom_url: string
  resource_url: string
  position: number
  attachments: File[] // Pending file uploads
}

export interface RequirementTreeNode extends RequirementNode {
  children: RequirementTreeNode[]
  depth: number
}

// ============================================
// Tree Building
// ============================================

export function buildTree(items: RequirementNode[]): RequirementTreeNode[] {
  const map = new Map<string, RequirementTreeNode>()
  const roots: RequirementTreeNode[] = []

  // First pass: create all nodes with depth 0
  for (const item of items) {
    map.set(item.id, { ...item, children: [], depth: 0 })
  }

  // Second pass: build tree and calculate depths
  for (const item of items) {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      const parent = map.get(item.parent_id)!
      parent.children.push(node)
      node.depth = parent.depth + 1
    } else {
      roots.push(node)
    }
  }

  // Sort children by position recursively
  const sortChildren = (nodes: RequirementTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position)
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }
  sortChildren(roots)

  // Update depths after tree is built
  const updateDepths = (nodes: RequirementTreeNode[], depth: number) => {
    for (const node of nodes) {
      node.depth = depth
      updateDepths(node.children, depth + 1)
    }
  }
  updateDepths(roots, 0)

  return roots
}

// ============================================
// Tree Flattening
// ============================================

export function flattenTree(tree: RequirementTreeNode[]): RequirementNode[] {
  const result: RequirementNode[] = []

  const traverse = (nodes: RequirementTreeNode[], parentId: string | null) => {
    nodes.forEach((node, index) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, depth, ...nodeData } = node
      result.push({
        ...nodeData,
        parent_id: parentId,
        position: index,
      })
      traverse(node.children, node.id)
    })
  }

  traverse(tree, null)
  return result
}

// Get flat array with updated positions and parent_ids for reordering
export function getReorderUpdates(
  tree: RequirementTreeNode[]
): Array<{ id: string; position: number; parent_id: string | null }> {
  const updates: Array<{ id: string; position: number; parent_id: string | null }> = []

  const traverse = (nodes: RequirementTreeNode[], parentId: string | null) => {
    nodes.forEach((node, index) => {
      updates.push({
        id: node.id,
        position: index,
        parent_id: parentId,
      })
      traverse(node.children, node.id)
    })
  }

  traverse(tree, null)
  return updates
}

// ============================================
// Tree Queries
// ============================================

export function getDescendantIds(items: RequirementNode[], parentId: string): string[] {
  const ids: string[] = []
  const children = items.filter(item => item.parent_id === parentId)

  for (const child of children) {
    ids.push(child.id)
    ids.push(...getDescendantIds(items, child.id))
  }

  return ids
}

export function getAncestorIds(items: RequirementNode[], itemId: string): string[] {
  const ids: string[] = []
  const item = items.find(i => i.id === itemId)

  if (item?.parent_id) {
    ids.push(item.parent_id)
    ids.push(...getAncestorIds(items, item.parent_id))
  }

  return ids
}

export function canDropOnTarget(
  items: RequirementNode[],
  dragId: string,
  targetId: string
): boolean {
  // Can't drop on self
  if (dragId === targetId) return false

  // Can't drop on own descendants
  const descendants = getDescendantIds(items, dragId)
  return !descendants.includes(targetId)
}

// ============================================
// Tree Mutations (Pure Functions)
// ============================================

export function addNode(
  items: RequirementNode[],
  newNode: RequirementNode
): RequirementNode[] {
  return [...items, newNode]
}

export function updateNode(
  items: RequirementNode[],
  id: string,
  updates: Partial<RequirementNode>
): RequirementNode[] {
  return items.map(item =>
    item.id === id ? { ...item, ...updates } : item
  )
}

export function deleteNode(
  items: RequirementNode[],
  id: string
): RequirementNode[] {
  // Get all descendant IDs to delete them too
  const toDelete = new Set([id, ...getDescendantIds(items, id)])
  return items.filter(item => !toDelete.has(item.id))
}

export function moveNode(
  items: RequirementNode[],
  nodeId: string,
  newParentId: string | null,
  newPosition: number
): RequirementNode[] {
  // Update the node's parent
  let updated = items.map(item =>
    item.id === nodeId
      ? { ...item, parent_id: newParentId, position: newPosition }
      : item
  )

  // Get siblings at the new location
  const siblings = updated.filter(
    item => item.parent_id === newParentId && item.id !== nodeId
  )

  // Reposition siblings
  siblings.sort((a, b) => a.position - b.position)

  // Adjust positions for items after the insertion point
  updated = updated.map(item => {
    if (item.parent_id === newParentId && item.id !== nodeId && item.position >= newPosition) {
      return { ...item, position: item.position + 1 }
    }
    return item
  })

  return updated
}

// ============================================
// ID Generation
// ============================================

let tempIdCounter = 0

export function generateTempId(): string {
  return `temp-${Date.now()}-${++tempIdCounter}`
}

export function isTempId(id: string): boolean {
  return id.startsWith('temp-')
}

// ============================================
// Default Node Factory
// ============================================

export function createDefaultNode(overrides?: Partial<RequirementNode>): RequirementNode {
  return {
    id: generateTempId(),
    parent_id: null,
    title: '',
    description: '',
    notes: '',
    owner_type: 'hexona',
    blocker_type: 'none',
    loom_url: '',
    resource_url: '',
    position: 0,
    attachments: [],
    ...overrides,
  }
}
