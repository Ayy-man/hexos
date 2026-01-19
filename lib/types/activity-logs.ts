/**
 * Activity Log Types
 * Safe for client components - no server imports
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type ActivityLogCategory =
  | 'crud'
  | 'auth'
  | 'ai'
  | 'payment'
  | 'conversation'
  | 'status'
  | 'file'
  | 'error'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface ActivityLog {
  id: string
  timestamp: string

  // Who
  user_id: string | null
  user_email: string | null
  user_role: string | null
  session_id: string | null

  // What
  action: string
  category: ActivityLogCategory

  // Target entity
  entity_type: string | null
  entity_id: string | null
  entity_name: string | null

  // Context
  metadata: Record<string, unknown>
  changes: Record<string, { old: unknown; new: unknown }> | null

  // AI specific
  ai_model: string | null
  ai_prompt: string | null
  ai_response: string | null
  ai_tokens_used: number | null
  ai_latency_ms: number | null

  // Request context
  ip_address: string | null
  user_agent: string | null
  request_path: string | null
  request_method: string | null

  // Performance
  duration_ms: number | null
  search_text: string | null

  // Error tracking
  error_stack: string | null
  error_component: string | null
  error_context: Record<string, unknown> | null
  browser: string | null
  os: string | null
  screen_size: string | null

  created_at: string
}

export interface ActivityLogUser {
  id: string
  name: string | null
  email: string
  role: string | null
}

export interface ActivityLogWithUser extends ActivityLog {
  user?: ActivityLogUser | null
}

// ============================================================================
// FILTER & QUERY INTERFACES
// ============================================================================

export interface ActivityLogFilters {
  search?: string
  category?: ActivityLogCategory | 'all'
  user_id?: string
  entity_type?: string
  entity_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface ActivityLogStats {
  total_logs: number
  logs_today: number
  logs_by_category: Record<string, number>
  logs_by_user: Record<string, number>
}

// ============================================================================
// INPUT INTERFACES
// ============================================================================

export interface CreateActivityLogInput {
  action: string
  category: ActivityLogCategory
  entity_type?: string
  entity_id?: string
  entity_name?: string
  metadata?: Record<string, unknown>
  changes?: Record<string, { old: unknown; new: unknown }>
  ai_model?: string
  ai_prompt?: string
  ai_response?: string
  ai_tokens_used?: number
  ai_latency_ms?: number
  duration_ms?: number
}

export interface ErrorReportInput {
  message: string
  stack?: string
  action?: string
  component?: string
  context?: Record<string, unknown>
  entityType?: string
  entityId?: string
  severity?: ErrorSeverity
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const categoryLabels: Record<ActivityLogCategory, string> = {
  crud: 'Data',
  auth: 'Authentication',
  ai: 'AI Copilot',
  payment: 'Payment',
  conversation: 'Conversation',
  status: 'Status Change',
  file: 'File',
  error: 'Error',
}

const categoryColors: Record<ActivityLogCategory, string> = {
  crud: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  auth: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  ai: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  payment: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  conversation: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  status: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  file: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const severityColors: Record<ErrorSeverity, string> = {
  low: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export function formatActivityCategory(category: ActivityLogCategory): string {
  return categoryLabels[category] || category
}

export function getActivityCategoryColor(category: ActivityLogCategory): string {
  return categoryColors[category] || 'bg-muted text-muted-foreground'
}

export function getSeverityColor(severity: ErrorSeverity): string {
  return severityColors[severity] || 'bg-muted text-muted-foreground'
}

export function formatActivityAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' - ')
}

export function formatEntityType(entityType: string): string {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1).replace(/_/g, ' ')
}

// Entity type options for filters
export const ENTITY_TYPES = [
  'project',
  'inquiry',
  'invoice',
  'payout',
  'deliverable',
  'user',
  'conversation',
  'message',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
