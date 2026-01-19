'use client'

import {
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
} from '@platejs/basic-nodes/react'
import { ParagraphPlugin } from 'platejs/react'

import { BasicMarksKit } from '@/components/editor/plugins/basic-marks-kit'
import { CommentKit } from '@/components/editor/plugins/comment-kit'
import { SuggestionKit } from '@/components/editor/plugins/suggestion-kit'
import { DiscussionKit, createDiscussionKit, type DiscussionUser, type TDiscussion } from '@/components/editor/plugins/discussion-kit'
import { NormalizeWhitespacePlugin } from '@/components/editor/plugins/normalize-whitespace-plugin'
import { ParagraphElement } from '@/components/ui/paragraph-node'
import { H1Element, H2Element, H3Element } from '@/components/ui/heading-node'
import { BlockquoteElement } from '@/components/ui/blockquote-node'

// Re-export for convenience
export type { DiscussionUser, TDiscussion }

// Basic blocks (paragraph, headings, blockquote)
export const BasicBlocksPlugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.configure({
    node: { component: H1Element },
    shortcuts: { toggle: { keys: 'mod+alt+1' } },
  }),
  H2Plugin.configure({
    node: { component: H2Element },
    shortcuts: { toggle: { keys: 'mod+alt+2' } },
  }),
  H3Plugin.configure({
    node: { component: H3Element },
    shortcuts: { toggle: { keys: 'mod+alt+3' } },
  }),
  BlockquotePlugin.configure({
    node: { component: BlockquoteElement },
    shortcuts: { toggle: { keys: 'mod+shift+period' } },
  }),
]

// Factory to create plugins with current user and initial discussions
export const createInquiryDocumentPlugins = (
  currentUser?: DiscussionUser,
  initialDiscussions?: TDiscussion[]
) => [
  ...BasicBlocksPlugins,
  ...BasicMarksKit,
  ...CommentKit,
  ...SuggestionKit,
  ...createDiscussionKit(currentUser, initialDiscussions),
  NormalizeWhitespacePlugin, // Collapse excessive line breaks (max 3)
]

// Default plugins (backwards compatible, uses anonymous user)
export const InquiryDocumentPlugins = [
  ...BasicBlocksPlugins,
  ...BasicMarksKit,
  ...CommentKit,
  ...SuggestionKit,
  ...DiscussionKit,
  NormalizeWhitespacePlugin, // Collapse excessive line breaks (max 3)
]
