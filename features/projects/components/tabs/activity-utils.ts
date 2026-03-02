import React from 'react'
import Link from 'next/link'
import {
  ArrowRightLeft,
  SquareCheck,
  TrendingUp,
  FileText,
  Paperclip,
  BadgeCheck,
  UserPlus,
  ClipboardCheck,
  MessageSquare,
  Circle,
  Flag,
} from 'lucide-react'
import { getZone } from '@/features/projects/components/hill-chart/utils'

// ============================================
// Types
// ============================================

export type FilterCategory = 'all' | 'status' | 'deliverables' | 'documents' | 'hill_chart' | 'files' | 'team'

interface CategoryConfigEntry {
  icon: React.ElementType
  colorClass: string
  bgClass: string
  dotClass: string
  filterGroup: FilterCategory
}

// ============================================
// CATEGORY_CONFIG
// ============================================

export const CATEGORY_CONFIG: Record<string, CategoryConfigEntry> = {
  // Status changes
  status_changed: {
    icon: ArrowRightLeft,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    dotClass: 'bg-amber-500',
    filterGroup: 'status',
  },
  phase_changed: {
    icon: ArrowRightLeft,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    dotClass: 'bg-amber-500',
    filterGroup: 'status',
  },

  // Deliverables
  deliverable_added: {
    icon: SquareCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    dotClass: 'bg-blue-500',
    filterGroup: 'deliverables',
  },
  deliverable_edited: {
    icon: SquareCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    dotClass: 'bg-blue-500',
    filterGroup: 'deliverables',
  },
  deliverable_deleted: {
    icon: SquareCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    dotClass: 'bg-blue-500',
    filterGroup: 'deliverables',
  },
  deliverable_status_changed: {
    icon: SquareCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    dotClass: 'bg-blue-500',
    filterGroup: 'deliverables',
  },
  deliverable_completed: {
    icon: SquareCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    dotClass: 'bg-blue-500',
    filterGroup: 'deliverables',
  },
  deliverable_updated: {
    icon: SquareCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    dotClass: 'bg-blue-500',
    filterGroup: 'deliverables',
  },

  // Hill chart
  hill_position_updated: {
    icon: TrendingUp,
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500/10',
    dotClass: 'bg-cyan-500',
    filterGroup: 'hill_chart',
  },

  // Documents
  document_created: {
    icon: FileText,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    dotClass: 'bg-purple-500',
    filterGroup: 'documents',
  },
  document_updated: {
    icon: FileText,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    dotClass: 'bg-purple-500',
    filterGroup: 'documents',
  },
  document_deleted: {
    icon: FileText,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    dotClass: 'bg-purple-500',
    filterGroup: 'documents',
  },

  // Files
  file_uploaded: {
    icon: Paperclip,
    colorClass: 'text-stone-500',
    bgClass: 'bg-stone-500/10',
    dotClass: 'bg-stone-500',
    filterGroup: 'files',
  },
  file_deleted: {
    icon: Paperclip,
    colorClass: 'text-stone-500',
    bgClass: 'bg-stone-500/10',
    dotClass: 'bg-stone-500',
    filterGroup: 'files',
  },
  file_downloaded: {
    icon: Paperclip,
    colorClass: 'text-stone-500',
    bgClass: 'bg-stone-500/10',
    dotClass: 'bg-stone-500',
    filterGroup: 'files',
  },

  // Sign-off flow
  signoff_sent: {
    icon: BadgeCheck,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
    dotClass: 'bg-green-500',
    filterGroup: 'status',
  },
  signed_off: {
    icon: BadgeCheck,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
    dotClass: 'bg-green-500',
    filterGroup: 'status',
  },
  deliverables_confirmed: {
    icon: BadgeCheck,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
    dotClass: 'bg-green-500',
    filterGroup: 'status',
  },
  baseline_captured: {
    icon: BadgeCheck,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
    dotClass: 'bg-green-500',
    filterGroup: 'status',
  },

  // Team
  dev_assigned: {
    icon: UserPlus,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10',
    dotClass: 'bg-indigo-500',
    filterGroup: 'team',
  },
  dev_unassigned: {
    icon: UserPlus,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10',
    dotClass: 'bg-indigo-500',
    filterGroup: 'team',
  },

  // Requirements
  requirement_created: {
    icon: ClipboardCheck,
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
    dotClass: 'bg-yellow-500',
    filterGroup: 'status',
  },
  requirement_updated: {
    icon: ClipboardCheck,
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
    dotClass: 'bg-yellow-500',
    filterGroup: 'status',
  },
  requirement_completed: {
    icon: ClipboardCheck,
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
    dotClass: 'bg-yellow-500',
    filterGroup: 'status',
  },
  requirement_deleted: {
    icon: ClipboardCheck,
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
    dotClass: 'bg-yellow-500',
    filterGroup: 'status',
  },
  onboarding_requirement_completed: {
    icon: ClipboardCheck,
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
    dotClass: 'bg-yellow-500',
    filterGroup: 'status',
  },

  // Notes
  note_added: {
    icon: MessageSquare,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },

  // Scope changes
  scope_change_flagged: {
    icon: Flag,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    dotClass: 'bg-amber-500',
    filterGroup: 'status',
  },
  scope_change_approved: {
    icon: Flag,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    dotClass: 'bg-amber-500',
    filterGroup: 'status',
  },
  scope_change_rejected: {
    icon: Flag,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    dotClass: 'bg-amber-500',
    filterGroup: 'status',
  },

  // Project lifecycle
  project_created: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  project_updated: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  project_archived: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  project_deleted: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },

  // Legacy DB operations
  INSERT: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  UPDATE: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  DELETE: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  insert: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  update: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
  delete: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    dotClass: 'bg-muted-foreground',
    filterGroup: 'status',
  },
}

export const DEFAULT_CONFIG: CategoryConfigEntry = {
  icon: Circle,
  colorClass: 'text-muted-foreground',
  bgClass: 'bg-muted',
  dotClass: 'bg-muted-foreground',
  filterGroup: 'status',
}

// ============================================
// Filter chips
// ============================================

export const FILTER_CHIPS: { label: string; value: FilterCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Status', value: 'status' },
  { label: 'Deliverables', value: 'deliverables' },
  { label: 'Documents', value: 'documents' },
  { label: 'Hill Chart', value: 'hill_chart' },
  { label: 'Files', value: 'files' },
  { label: 'Team', value: 'team' },
]

// ============================================
// Activity Labels
// ============================================

export const ACTIVITY_LABELS: Record<string, string> = {
  // Project lifecycle
  project_created: 'Project created',
  project_updated: 'Project updated',
  project_archived: 'Project archived',
  project_deleted: 'Project deleted',

  // Status changes
  status_changed: 'Status changed',
  phase_changed: 'Phase changed',

  // Sign-off flow
  deliverables_confirmed: 'Deliverables confirmed',
  signoff_sent: 'Sent for sign-off',
  signed_off: 'Deliverables signed off',
  baseline_captured: 'Scope baseline captured',

  // Deliverables
  deliverable_added: 'Deliverable added',
  deliverable_edited: 'Deliverable edited',
  deliverable_updated: 'Deliverable updated',
  deliverable_deleted: 'Deliverable deleted',
  deliverable_completed: 'Deliverable completed',
  deliverable_status_changed: 'Deliverable status changed',

  // Hill chart
  hill_position_updated: 'Progress updated',

  // Scope changes
  scope_change_flagged: 'Scope change detected',
  scope_change_approved: 'Scope change approved',
  scope_change_rejected: 'Scope change rejected',

  // Requirements
  requirement_created: 'Requirement added',
  requirement_updated: 'Requirement updated',
  requirement_completed: 'Requirement completed',
  requirement_deleted: 'Requirement removed',
  onboarding_requirement_completed: 'Requirement approved',

  // Files
  file_uploaded: 'File uploaded',
  file_deleted: 'File deleted',
  file_downloaded: 'File downloaded',

  // Documents
  document_created: 'Document created',
  document_updated: 'Document updated',
  document_deleted: 'Document deleted',

  // Team
  dev_assigned: 'Developer assigned',
  dev_unassigned: 'Developer unassigned',

  // Notes
  note_added: 'Note added',

  // Raw database operations (fallback for legacy logs)
  INSERT: 'Record created',
  UPDATE: 'Record updated',
  DELETE: 'Record deleted',
  insert: 'Record created',
  update: 'Record updated',
  delete: 'Record deleted',
}

// ============================================
// Empty filter messages
// ============================================

export const EMPTY_FILTER_MESSAGES: Record<FilterCategory, string> = {
  all: 'No activity recorded yet',
  status: 'No status changes recorded',
  deliverables: 'No deliverable activity yet',
  documents: 'No document activity yet',
  hill_chart: 'No progress updates yet',
  files: 'No file activity yet',
  team: 'No team changes yet',
}

// ============================================
// Helper: getCategoryConfig
// ============================================

export function getCategoryConfig(action: string): CategoryConfigEntry {
  return CATEGORY_CONFIG[action] ?? DEFAULT_CONFIG
}

// ============================================
// Helper: toTitleCase
// ============================================

export function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ============================================
// Helper: formatActivityDetail
// ============================================

export function formatActivityDetail(
  action: string,
  details: Record<string, unknown> | null,
  projectId: string,
  requirements?: Array<{ id: string; title: string }>
): React.ReactNode {
  if (!details) return null

  switch (action) {
    case 'status_changed': {
      const oldStatus = toTitleCase(String(details.old_status ?? '').replace(/_/g, ' '))
      const newStatus = toTitleCase(String(details.new_status ?? '').replace(/_/g, ' '))
      if (!oldStatus && !newStatus) return null
      return React.createElement(
        'span',
        { className: 'inline-flex items-center gap-1' },
        React.createElement('span', { className: 'text-muted-foreground' }, oldStatus),
        React.createElement('span', { className: 'text-muted-foreground/60 mx-0.5' }, '→'),
        React.createElement('span', { className: 'font-medium' }, newStatus)
      )
    }

    case 'phase_changed': {
      const oldStatus = toTitleCase(
        String(details.old_status ?? details.from ?? '').replace(/_/g, ' ')
      )
      const newStatus = toTitleCase(
        String(details.new_status ?? details.to ?? '').replace(/_/g, ' ')
      )
      if (!oldStatus && !newStatus) return null
      return React.createElement(
        'span',
        { className: 'inline-flex items-center gap-1' },
        React.createElement('span', { className: 'text-muted-foreground' }, oldStatus),
        React.createElement('span', { className: 'text-muted-foreground/60 mx-0.5' }, '→'),
        React.createElement('span', { className: 'font-medium' }, newStatus)
      )
    }

    case 'hill_position_updated': {
      const title = String(details.title ?? '')
      const oldPos = details.old_position != null ? Number(details.old_position) : null
      const newPos =
        details.new_position != null
          ? Number(details.new_position)
          : details.position != null
            ? Number(details.position)
            : null

      if (newPos === null) return null

      const posText =
        oldPos !== null
          ? `${oldPos}% → ${newPos}%`
          : `${newPos}%`

      let zoneTransition: React.ReactNode = null
      if (oldPos !== null && newPos !== null) {
        const oldZone = getZone(oldPos)
        const newZone = getZone(newPos)
        if (oldZone.zone !== newZone.zone) {
          zoneTransition = React.createElement(
            'span',
            { className: 'text-muted-foreground ml-1' },
            `(${oldZone.label} → ${newZone.label})`
          )
        }
      }

      return React.createElement(
        'span',
        { className: 'inline-flex items-center gap-1 flex-wrap' },
        title ? React.createElement('span', null, `"${title}"`) : null,
        React.createElement('span', null, posText),
        zoneTransition
      )
    }

    case 'deliverable_added': {
      const title = String(details.title ?? '')
      if (!title) return null
      return React.createElement(
        Link,
        {
          href: `/projects/${projectId}?tab=deliverables`,
          className: 'font-medium hover:underline',
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        },
        `"${title}"`
      )
    }

    case 'deliverable_edited': {
      const fields = Array.isArray(details.fields_changed)
        ? (details.fields_changed as string[])
        : []
      const fieldText = fields.length > 0 ? `Updated: ${fields.join(', ')}` : 'Updated'
      if (details.deliverable_id) {
        return React.createElement(
          'span',
          null,
          React.createElement(
            Link,
            {
              href: `/projects/${projectId}?tab=deliverables`,
              className: 'font-medium hover:underline',
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
            },
            fieldText
          )
        )
      }
      return React.createElement('span', null, fieldText)
    }

    case 'deliverable_status_changed': {
      const title = String(details.title ?? '')
      const oldStatus = toTitleCase(String(details.old_status ?? '').replace(/_/g, ' '))
      const newStatus = toTitleCase(String(details.new_status ?? '').replace(/_/g, ' '))
      return React.createElement(
        'span',
        { className: 'inline-flex items-center gap-1 flex-wrap' },
        title
          ? React.createElement(
              Link,
              {
                href: `/projects/${projectId}?tab=deliverables`,
                className: 'font-medium hover:underline',
                onClick: (e: React.MouseEvent) => e.stopPropagation(),
              },
              `"${title}"`
            )
          : null,
        oldStatus && newStatus
          ? React.createElement(
              'span',
              { className: 'inline-flex items-center gap-1' },
              React.createElement('span', { className: 'text-muted-foreground' }, oldStatus),
              React.createElement('span', { className: 'text-muted-foreground/60 mx-0.5' }, '→'),
              React.createElement('span', { className: 'font-medium' }, newStatus)
            )
          : null
      )
    }

    case 'deliverable_deleted': {
      const title = String(details.title ?? '')
      if (!title) return null
      return React.createElement('span', null, `"${title}"`)
    }

    case 'deliverable_completed': {
      const title = String(details.title ?? '')
      if (!title) return null
      return React.createElement(
        Link,
        {
          href: `/projects/${projectId}?tab=deliverables`,
          className: 'font-medium hover:underline',
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        },
        `"${title}"`
      )
    }

    case 'document_created': {
      const title = String(details.title ?? '')
      if (!title) return null
      return React.createElement('span', null, `"${title}"`)
    }

    case 'document_deleted': {
      const title = String(details.title ?? '')
      if (!title) return null
      return React.createElement('span', null, `"${title}"`)
    }

    case 'file_uploaded': {
      const fileName = String(details.file_name ?? '')
      const visibility = details.visibility ? String(details.visibility) : null
      if (!fileName) return null
      return React.createElement(
        'span',
        { className: 'inline-flex items-center gap-1' },
        React.createElement('span', { className: 'font-mono text-xs' }, fileName),
        visibility
          ? React.createElement(
              'span',
              { className: 'text-muted-foreground' },
              `(${visibility})`
            )
          : null
      )
    }

    case 'file_deleted': {
      const fileName = String(details.file_name ?? '')
      if (!fileName) return null
      return React.createElement('span', { className: 'font-mono text-xs' }, fileName)
    }

    case 'dev_assigned': {
      const devName = String(details.dev_name ?? '')
      if (!devName) return null
      return React.createElement('span', { className: 'font-medium' }, devName)
    }

    case 'dev_unassigned': {
      const devName = String(details.dev_name ?? '')
      if (!devName) return null
      return React.createElement('span', null, devName)
    }

    case 'onboarding_requirement_completed': {
      const reqId = String(details.requirement_id ?? '')
      const found = requirements?.find((r) => r.id === reqId)
      const title = found?.title ?? null
      if (title) {
        return React.createElement('span', null, `"${title}"`)
      }
      return React.createElement('span', null, 'Requirement completed')
    }

    case 'note_added': {
      const note = String(details.note ?? '')
      const deliverableTitle = details.deliverable_title
        ? String(details.deliverable_title)
        : null
      if (!note && !deliverableTitle) return null
      const preview = note.length > 60 ? note.slice(0, 60) + '…' : note
      if (deliverableTitle) {
        return React.createElement(
          'span',
          null,
          `on "${deliverableTitle}": `,
          preview
        )
      }
      return React.createElement('span', null, preview)
    }

    case 'signoff_sent':
    case 'signed_off':
    case 'deliverables_confirmed':
      return null

    case 'scope_change_flagged':
    case 'scope_change_approved':
    case 'scope_change_rejected': {
      const entityName = details.entity_name ? String(details.entity_name) : null
      if (!entityName) return null
      return React.createElement('span', null, `"${entityName}"`)
    }

    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
    case 'insert':
    case 'update':
    case 'delete': {
      const entityName = details.entity_name ? String(details.entity_name) : null
      if (!entityName) return null
      return React.createElement('span', null, entityName)
    }

    default:
      return null
  }
}

// ============================================
// Helper: formatCompactDetail
// ============================================

export function formatCompactDetail(
  action: string,
  details: Record<string, unknown> | null
): string | null {
  if (!details) return null

  switch (action) {
    case 'status_changed': {
      const oldStatus = toTitleCase(String(details.old_status ?? '').replace(/_/g, ' '))
      const newStatus = toTitleCase(String(details.new_status ?? '').replace(/_/g, ' '))
      if (!oldStatus && !newStatus) return null
      return `${oldStatus} → ${newStatus}`
    }

    case 'phase_changed': {
      const oldStatus = toTitleCase(
        String(details.old_status ?? details.from ?? '').replace(/_/g, ' ')
      )
      const newStatus = toTitleCase(
        String(details.new_status ?? details.to ?? '').replace(/_/g, ' ')
      )
      if (!oldStatus && !newStatus) return null
      return `${oldStatus} → ${newStatus}`
    }

    case 'hill_position_updated': {
      const title = String(details.title ?? '')
      const newPos =
        details.new_position != null
          ? Number(details.new_position)
          : details.position != null
            ? Number(details.position)
            : null
      if (newPos === null) return null
      return title ? `"${title}" ${newPos}%` : `${newPos}%`
    }

    case 'deliverable_added':
    case 'deliverable_completed':
    case 'deliverable_deleted':
    case 'document_created':
    case 'document_deleted': {
      const title = String(details.title ?? '')
      if (!title) return null
      return `"${title}"`
    }

    case 'deliverable_edited': {
      const fields = Array.isArray(details.fields_changed)
        ? (details.fields_changed as string[])
        : []
      return fields.length > 0 ? `Updated: ${fields.join(', ')}` : 'Updated'
    }

    case 'deliverable_status_changed': {
      const title = String(details.title ?? '')
      const oldStatus = toTitleCase(String(details.old_status ?? '').replace(/_/g, ' '))
      const newStatus = toTitleCase(String(details.new_status ?? '').replace(/_/g, ' '))
      const transition = oldStatus && newStatus ? `${oldStatus} → ${newStatus}` : ''
      return title ? `"${title}" ${transition}`.trim() : transition || null
    }

    case 'file_uploaded': {
      const fileName = String(details.file_name ?? '')
      return fileName || null
    }

    case 'file_deleted': {
      const fileName = String(details.file_name ?? '')
      return fileName || null
    }

    case 'dev_assigned': {
      const devName = String(details.dev_name ?? '')
      return devName || null
    }

    case 'dev_unassigned': {
      const devName = String(details.dev_name ?? '')
      return devName || null
    }

    case 'onboarding_requirement_completed':
      return 'Requirement completed'

    case 'note_added': {
      const note = String(details.note ?? '')
      if (!note) return null
      return note.length > 60 ? note.slice(0, 60) + '…' : note
    }

    case 'signoff_sent':
    case 'signed_off':
    case 'deliverables_confirmed':
      return null

    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
    case 'insert':
    case 'update':
    case 'delete': {
      const entityName = details.entity_name ? String(details.entity_name) : null
      return entityName
    }

    default:
      return null
  }
}

// ============================================
// Helper: getDayLabel
// ============================================

export function getDayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (target.getTime() === today.getTime()) return 'Today'
  if (target.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ============================================
// Helper: groupByDay
// ============================================

export interface DayGroup<T extends { created_at: string }> {
  label: string
  entries: T[]
}

export function groupByDay<T extends { created_at: string }>(entries: T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []

  for (const entry of entries) {
    const date = new Date(entry.created_at)
    const label = getDayLabel(date)

    const existing = groups.find((g) => g.label === label)
    if (existing) {
      existing.entries.push(entry)
    } else {
      groups.push({ label, entries: [entry] })
    }
  }

  return groups
}

// ============================================
// Helper: formatExactTime
// ============================================

export function formatExactTime(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// Helper: formatRelativeTime
// ============================================

export function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}
