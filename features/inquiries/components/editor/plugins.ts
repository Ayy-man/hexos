'use client'

import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
} from '@platejs/basic-nodes/react'
import { ParagraphPlugin } from 'platejs/react'

import { ParagraphElement } from '@/components/ui/paragraph-node'
import { H1Element, H2Element, H3Element } from '@/components/ui/heading-node'
import { BlockquoteElement } from '@/components/ui/blockquote-node'

// Basic marks (inline formatting)
export const BasicMarksPlugins = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
]

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

// Combined plugins for the inquiry document editor
export const InquiryDocumentPlugins = [
  ...BasicBlocksPlugins,
  ...BasicMarksPlugins,
]
