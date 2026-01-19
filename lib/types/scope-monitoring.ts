/**
 * Scope Monitoring Types
 * Safe for client components - no server imports
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type ScopeChangeStatus = 'pending_review' | 'approved' | 'rejected' | 'detected' | 'denied'

export type ScopeChangeRequestType = 'clarification' | 'new_scope' | 'reduction' | 'timeline_change'

export type ScopeChangeTrigger =
  | 'client_request'
  | 'dev_flag'
  | 'deliverable_modified'
  | 'timeline_extended'
  | 'hours_increased'
  | 'deliverable_added'
  | 'deliverable_removed'

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface DeliverableSnapshot {
  id: string
  title: string
  description: string | null
  status: string
  estimated_hours: number | null
  start_date: string | null
  due_date: string | null
  sort_order: number
}

export interface ScopeBaseline {
  id: string
  project_id: string
  captured_at: string
  captured_by: string
  deliverables_snapshot: DeliverableSnapshot[]
  total_estimated_hours: number | null
  deliverable_count: number
  project_timeline_start: string | null
  project_timeline_end: string | null
  created_at: string
}

export interface ScopeBaselineWithUser extends ScopeBaseline {
  capturer?: {
    id: string
    name: string
    email: string
  } | null
}

export interface ScopeChangeDelta {
  field: string
  before: unknown
  after: unknown
  deliverable_title?: string
}

export interface ScopeChange {
  id: string
  project_id: string
  trigger_type: ScopeChangeTrigger
  description: string
  status: ScopeChangeStatus
  price_adjustment: number | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null

  // Enhanced fields
  request_type: ScopeChangeRequestType | null
  requested_by: string | null
  affected_deliverable_id: string | null
  change_delta: ScopeChangeDelta | null
  hours_delta: number | null
  cost_delta: number | null
  timeline_delta_days: number | null
  baseline_id: string | null
  baseline_deliverable_snapshot: DeliverableSnapshot | null
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  updated_at: string | null
}

export interface ScopeChangeUser {
  id: string
  name: string | null
  email: string
  role: string | null
}

export interface ScopeChangeWithRelations extends ScopeChange {
  requester?: ScopeChangeUser | null
  approver?: ScopeChangeUser | null
  rejecter?: ScopeChangeUser | null
  affected_deliverable?: {
    id: string
    title: string
  } | null
  comments_count?: number
}

export interface ScopeChangeComment {
  id: string
  scope_change_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface ScopeChangeCommentWithUser extends ScopeChangeComment {
  user?: ScopeChangeUser | null
}

// ============================================================================
// METRICS INTERFACES
// ============================================================================

export interface ScopeMetrics {
  total_changes: number
  pending_changes: number
  approved_changes: number
  rejected_changes: number
  net_hours_delta: number
  net_cost_delta: number
  has_baseline: boolean
}

export interface ScopeComparison {
  baseline: ScopeBaseline | null
  current: {
    deliverables: DeliverableSnapshot[]
    total_estimated_hours: number
    deliverable_count: number
  }
  differences: {
    hours_delta: number
    deliverable_delta: number
    added: DeliverableSnapshot[]
    removed: DeliverableSnapshot[]
    modified: Array<{
      baseline: DeliverableSnapshot
      current: DeliverableSnapshot
      changes: string[]
    }>
  }
}

// ============================================================================
// INPUT INTERFACES
// ============================================================================

export interface FlagScopeChangeInput {
  project_id: string
  trigger_type: ScopeChangeTrigger
  description: string
  request_type?: ScopeChangeRequestType
  affected_deliverable_id?: string
  change_delta?: ScopeChangeDelta
  hours_delta?: number
  cost_delta?: number
  timeline_delta_days?: number
  baseline_deliverable_snapshot?: DeliverableSnapshot
}

export interface AutoFlagScopeChangeInput {
  project_id: string
  trigger_type: ScopeChangeTrigger
  affected_deliverable_id: string
  deliverable_title: string
  change_delta: ScopeChangeDelta
  hours_delta?: number
  timeline_delta_days?: number
}

export interface ScopeChangeFilters {
  status?: ScopeChangeStatus | 'all'
  request_type?: ScopeChangeRequestType | 'all'
  trigger_type?: ScopeChangeTrigger | 'all'
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const statusLabels: Record<ScopeChangeStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  detected: 'Detected',
  denied: 'Denied',
}

const statusColors: Record<ScopeChangeStatus, string> = {
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  detected: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  denied: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const requestTypeLabels: Record<ScopeChangeRequestType, string> = {
  clarification: 'Clarification',
  new_scope: 'New Scope',
  reduction: 'Scope Reduction',
  timeline_change: 'Timeline Change',
}

const requestTypeColors: Record<ScopeChangeRequestType, string> = {
  clarification: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  new_scope: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  reduction: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  timeline_change: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
}

const triggerTypeLabels: Record<ScopeChangeTrigger, string> = {
  client_request: 'Client Request',
  dev_flag: 'Developer Flag',
  deliverable_modified: 'Deliverable Modified',
  timeline_extended: 'Timeline Extended',
  hours_increased: 'Hours Increased',
  deliverable_added: 'Deliverable Added',
  deliverable_removed: 'Deliverable Removed',
}

const triggerTypeColors: Record<ScopeChangeTrigger, string> = {
  client_request: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  dev_flag: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  deliverable_modified: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  timeline_extended: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  hours_increased: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  deliverable_added: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  deliverable_removed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export function formatScopeStatus(status: ScopeChangeStatus): string {
  return statusLabels[status] || status
}

export function getScopeStatusColor(status: ScopeChangeStatus): string {
  return statusColors[status] || 'bg-muted text-muted-foreground'
}

export function formatRequestType(type: ScopeChangeRequestType): string {
  return requestTypeLabels[type] || type
}

export function getRequestTypeColor(type: ScopeChangeRequestType): string {
  return requestTypeColors[type] || 'bg-muted text-muted-foreground'
}

export function formatTriggerType(trigger: ScopeChangeTrigger): string {
  return triggerTypeLabels[trigger] || trigger
}

export function getTriggerTypeColor(trigger: ScopeChangeTrigger): string {
  return triggerTypeColors[trigger] || 'bg-muted text-muted-foreground'
}

export function formatHoursDelta(delta: number): string {
  if (delta === 0) return '0h'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}h`
}

export function formatCostDelta(delta: number): string {
  if (delta === 0) return '$0'
  const sign = delta > 0 ? '+' : ''
  return `${sign}$${Math.abs(delta).toLocaleString()}`
}

export function formatTimelineDelta(days: number): string {
  if (days === 0) return '0 days'
  const sign = days > 0 ? '+' : ''
  const abs = Math.abs(days)
  return `${sign}${abs} day${abs === 1 ? '' : 's'}`
}

// Status options for filters/forms
export const SCOPE_CHANGE_STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

export const SCOPE_REQUEST_TYPE_OPTIONS = [
  { value: 'clarification', label: 'Clarification' },
  { value: 'new_scope', label: 'New Scope' },
  { value: 'reduction', label: 'Scope Reduction' },
  { value: 'timeline_change', label: 'Timeline Change' },
] as const

export const SCOPE_TRIGGER_TYPE_OPTIONS = [
  { value: 'client_request', label: 'Client Request' },
  { value: 'dev_flag', label: 'Developer Flag' },
  { value: 'deliverable_modified', label: 'Deliverable Modified' },
  { value: 'timeline_extended', label: 'Timeline Extended' },
  { value: 'hours_increased', label: 'Hours Increased' },
  { value: 'deliverable_added', label: 'Deliverable Added' },
  { value: 'deliverable_removed', label: 'Deliverable Removed' },
] as const
