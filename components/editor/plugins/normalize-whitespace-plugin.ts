'use client'

import { createPlatePlugin } from 'platejs/react'
import { Transforms, Node } from 'slate'
import type { PlateEditor } from 'platejs/react'

const MAX_CONSECUTIVE_EMPTY_BLOCKS = 3

/**
 * Plugin that normalizes excessive whitespace/line breaks.
 * When pasting content with more than 3 consecutive empty paragraphs,
 * it collapses them down to a maximum of 3.
 */
export const NormalizeWhitespacePlugin = createPlatePlugin({
  key: 'normalizeWhitespace',
  handlers: {
    onChange: ({ editor }) => {
      // Run normalization on each change (including paste)
      normalizeExcessiveLineBreaks(editor as unknown as PlateEditor)
    },
  },
})

/**
 * Normalize excessive consecutive empty blocks
 */
function normalizeExcessiveLineBreaks(editor: PlateEditor) {
  const children = editor.children
  if (!children || children.length < MAX_CONSECUTIVE_EMPTY_BLOCKS) return

  // Find runs of consecutive empty blocks
  let consecutiveEmptyCount = 0
  const indicesToRemove: number[] = []

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const isEmpty = isEmptyBlock(child)

    if (isEmpty) {
      consecutiveEmptyCount++

      // If we exceed max, mark this index for removal
      if (consecutiveEmptyCount > MAX_CONSECUTIVE_EMPTY_BLOCKS) {
        indicesToRemove.push(i)
      }
    } else {
      // Reset counter
      consecutiveEmptyCount = 0
    }
  }

  // Remove nodes in reverse order to maintain correct indices
  if (indicesToRemove.length > 0) {
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      Transforms.removeNodes(editor as any, { at: [indicesToRemove[i]] })
    }
  }
}

/**
 * Check if a block node is "empty" (just whitespace or no text content)
 */
function isEmptyBlock(node: Node): boolean {
  // Check if it's a block element
  if (!('type' in node)) return false
  if (!('children' in node)) return false

  // Get all text content using Slate's Node.string
  const text = Node.string(node)

  // Consider it empty if it's only whitespace
  return text.trim() === ''
}
