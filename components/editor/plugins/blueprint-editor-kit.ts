'use client'

import {
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
} from '@platejs/basic-nodes/react'
import { LinkPlugin } from '@platejs/link/react'
import { ListPlugin } from '@platejs/list/react'
import { ParagraphPlugin } from 'platejs/react'

import { BasicMarksKit } from '@/components/editor/plugins/basic-marks-kit'
import { ParagraphElement } from '@/components/ui/paragraph-node'
import { H1Element, H2Element, H3Element } from '@/components/ui/heading-node'
import { BlockquoteElement } from '@/components/ui/blockquote-node'
import { LinkElement } from '@/components/ui/link-node'

// Basic blocks (paragraph, headings, blockquote)
const BasicBlocksPlugins = [
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

// Link plugin
const LinkPlugins = [
  LinkPlugin.configure({
    node: { component: LinkElement },
  }),
]

// List plugin (indent-based lists)
const ListPlugins = [
  ListPlugin,
]

// Complete blueprint editor plugins
// No comments/suggestions - blueprints are documentation, not collaborative
export const BlueprintEditorPlugins = [
  ...BasicBlocksPlugins,
  ...ListPlugins,
  ...LinkPlugins,
  ...BasicMarksKit,
]
