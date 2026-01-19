// Client-safe utility functions for proposal deliverables
// Can be imported in both server and client components

import type { ProposalDeliverable, ProposalDeliverableWithChildren } from './proposal-deliverables'

// Build tree structure from flat list
export function buildDeliverableTree(
  items: ProposalDeliverable[]
): ProposalDeliverableWithChildren[] {
  const map = new Map<string, ProposalDeliverableWithChildren>()
  const roots: ProposalDeliverableWithChildren[] = []

  // First pass: create nodes with empty children arrays
  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  // Second pass: build parent-child relationships
  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // Sort children by sort_order
  function sortChildren(nodes: ProposalDeliverableWithChildren[]) {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach((node) => sortChildren(node.children))
  }
  sortChildren(roots)

  return roots
}

// Helper to flatten tree back to list (for getting all IDs)
export function flattenDeliverableTree(
  tree: ProposalDeliverableWithChildren[]
): ProposalDeliverable[] {
  const result: ProposalDeliverable[] = []
  function collect(nodes: ProposalDeliverableWithChildren[]) {
    nodes.forEach((node) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, ...deliverable } = node
      result.push(deliverable)
      collect(node.children)
    })
  }
  collect(tree)
  return result
}
