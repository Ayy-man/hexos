import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type { CreateActivityLogInput, ActivityLogCategory } from '@/lib/types/activity-logs'
import { getRequestContext } from './request-context'

interface LogOptions extends CreateActivityLogInput {
  userId?: string
  userEmail?: string
  userRole?: string
  sessionId?: string
}

/**
 * Fire-and-forget activity logging
 * Does not block the main operation - errors are swallowed
 */
export async function logActivity(options: LogOptions): Promise<void> {
  // Fire and forget - use setImmediate/setTimeout to not block
  setTimeout(async () => {
    try {
      const supabase = createAdminClient()
      const requestContext = await getRequestContext()

      // Build search text for full-text search
      const searchParts = [
        options.action,
        options.entity_type,
        options.entity_name,
        options.userEmail,
        options.metadata ? JSON.stringify(options.metadata) : null,
      ].filter(Boolean)

      const searchText = searchParts.join(' ')

      await supabase.from('activity_logs').insert({
        // Who
        user_id: options.userId || null,
        user_email: options.userEmail || null,
        user_role: options.userRole || null,
        session_id: options.sessionId || null,

        // What
        action: options.action,
        category: options.category,

        // Target
        entity_type: options.entity_type || null,
        entity_id: options.entity_id || null,
        entity_name: options.entity_name || null,

        // Context
        metadata: options.metadata || {},
        changes: options.changes || null,

        // AI specific
        ai_model: options.ai_model || null,
        ai_prompt: options.ai_prompt || null,
        ai_response: options.ai_response || null,
        ai_tokens_used: options.ai_tokens_used || null,
        ai_latency_ms: options.ai_latency_ms || null,

        // Request context
        ip_address: requestContext.ipAddress,
        user_agent: requestContext.userAgent,
        request_path: requestContext.requestPath,
        request_method: requestContext.requestMethod,

        // Performance
        duration_ms: options.duration_ms || null,
        search_text: searchText,
      })
    } catch (error) {
      // Log to console but don't throw - logging should never break the app
      console.error('[ActivityLogger] Failed to log activity:', error)
    }
  }, 0)
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

export const activityLogger = {
  // -------------------------------------------------------------------------
  // AUTH EVENTS
  // -------------------------------------------------------------------------
  auth: {
    login: (userId: string, email: string, role: string) =>
      logActivity({
        action: 'auth.login',
        category: 'auth',
        userId,
        userEmail: email,
        userRole: role,
        entity_type: 'user',
        entity_id: userId,
        entity_name: email,
      }),

    logout: (userId: string, email: string) =>
      logActivity({
        action: 'auth.logout',
        category: 'auth',
        userId,
        userEmail: email,
        entity_type: 'user',
        entity_id: userId,
      }),

    passwordReset: (email: string) =>
      logActivity({
        action: 'auth.password_reset',
        category: 'auth',
        userEmail: email,
      }),

    inviteSent: (userId: string, email: string, inviteeEmail: string, inviteeRole: string) =>
      logActivity({
        action: 'auth.invite_sent',
        category: 'auth',
        userId,
        userEmail: email,
        metadata: { invitee_email: inviteeEmail, invitee_role: inviteeRole },
      }),

    inviteAccepted: (userId: string, email: string, inviterEmail: string) =>
      logActivity({
        action: 'auth.invite_accepted',
        category: 'auth',
        userId,
        userEmail: email,
        entity_type: 'user',
        entity_id: userId,
        metadata: { inviter_email: inviterEmail },
      }),
  },

  // -------------------------------------------------------------------------
  // CRUD OPERATIONS
  // -------------------------------------------------------------------------
  crud: {
    create: (
      userId: string,
      email: string,
      role: string,
      entityType: string,
      entityId: string,
      entityName: string,
      metadata?: Record<string, unknown>
    ) =>
      logActivity({
        action: `${entityType}.created`,
        category: 'crud',
        userId,
        userEmail: email,
        userRole: role,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        metadata,
      }),

    update: (
      userId: string,
      email: string,
      role: string,
      entityType: string,
      entityId: string,
      entityName: string,
      changes: Record<string, { old: unknown; new: unknown }>,
      metadata?: Record<string, unknown>
    ) =>
      logActivity({
        action: `${entityType}.updated`,
        category: 'crud',
        userId,
        userEmail: email,
        userRole: role,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        changes,
        metadata,
      }),

    delete: (
      userId: string,
      email: string,
      role: string,
      entityType: string,
      entityId: string,
      entityName: string
    ) =>
      logActivity({
        action: `${entityType}.deleted`,
        category: 'crud',
        userId,
        userEmail: email,
        userRole: role,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
      }),
  },

  // -------------------------------------------------------------------------
  // STATUS CHANGES
  // -------------------------------------------------------------------------
  status: {
    change: (
      userId: string,
      email: string,
      role: string,
      entityType: string,
      entityId: string,
      entityName: string,
      oldStatus: string,
      newStatus: string,
      metadata?: Record<string, unknown>
    ) =>
      logActivity({
        action: `${entityType}.status_changed`,
        category: 'status',
        userId,
        userEmail: email,
        userRole: role,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        changes: { status: { old: oldStatus, new: newStatus } },
        metadata,
      }),
  },

  // -------------------------------------------------------------------------
  // AI EVENTS
  // -------------------------------------------------------------------------
  ai: {
    query: (
      userId: string,
      email: string,
      prompt: string,
      response: string,
      model: string,
      tokensUsed: number,
      latencyMs: number,
      entityType?: string,
      entityId?: string,
      entityName?: string
    ) =>
      logActivity({
        action: 'copilot.query',
        category: 'ai',
        userId,
        userEmail: email,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        ai_model: model,
        ai_prompt: prompt,
        ai_response: response,
        ai_tokens_used: tokensUsed,
        ai_latency_ms: latencyMs,
      }),

    suggestionAccepted: (
      userId: string,
      email: string,
      suggestion: string,
      entityType?: string,
      entityId?: string
    ) =>
      logActivity({
        action: 'copilot.suggestion_accepted',
        category: 'ai',
        userId,
        userEmail: email,
        entity_type: entityType,
        entity_id: entityId,
        metadata: { suggestion },
      }),
  },

  // -------------------------------------------------------------------------
  // FILE EVENTS
  // -------------------------------------------------------------------------
  file: {
    uploaded: (
      userId: string,
      email: string,
      entityType: string,
      entityId: string,
      fileName: string,
      fileSize: number,
      fileType?: string
    ) =>
      logActivity({
        action: 'file.uploaded',
        category: 'file',
        userId,
        userEmail: email,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: fileName,
        metadata: { file_name: fileName, file_size: fileSize, file_type: fileType },
      }),

    downloaded: (
      userId: string,
      email: string,
      entityType: string,
      entityId: string,
      fileName: string
    ) =>
      logActivity({
        action: 'file.downloaded',
        category: 'file',
        userId,
        userEmail: email,
        entity_type: entityType,
        entity_id: entityId,
        metadata: { file_name: fileName },
      }),

    deleted: (
      userId: string,
      email: string,
      entityType: string,
      entityId: string,
      fileName: string
    ) =>
      logActivity({
        action: 'file.deleted',
        category: 'file',
        userId,
        userEmail: email,
        entity_type: entityType,
        entity_id: entityId,
        metadata: { file_name: fileName },
      }),
  },

  // -------------------------------------------------------------------------
  // PAYMENT EVENTS
  // -------------------------------------------------------------------------
  payment: {
    invoiceCreated: (
      userId: string,
      email: string,
      invoiceId: string,
      invoiceNumber: string,
      amount: number,
      clientName: string
    ) =>
      logActivity({
        action: 'invoice.created',
        category: 'payment',
        userId,
        userEmail: email,
        entity_type: 'invoice',
        entity_id: invoiceId,
        entity_name: invoiceNumber,
        metadata: { amount, client_name: clientName },
      }),

    invoiceSent: (
      userId: string,
      email: string,
      invoiceId: string,
      invoiceNumber: string,
      amount: number,
      clientEmail: string
    ) =>
      logActivity({
        action: 'invoice.sent',
        category: 'payment',
        userId,
        userEmail: email,
        entity_type: 'invoice',
        entity_id: invoiceId,
        entity_name: invoiceNumber,
        metadata: { amount, client_email: clientEmail },
      }),

    invoicePaid: (invoiceId: string, invoiceNumber: string, amount: number, clientEmail: string) =>
      logActivity({
        action: 'invoice.paid',
        category: 'payment',
        entity_type: 'invoice',
        entity_id: invoiceId,
        entity_name: invoiceNumber,
        metadata: { amount, client_email: clientEmail },
      }),

    payoutApproved: (
      userId: string,
      email: string,
      payoutId: string,
      amount: number,
      recipientEmail: string
    ) =>
      logActivity({
        action: 'payout.approved',
        category: 'payment',
        userId,
        userEmail: email,
        entity_type: 'payout',
        entity_id: payoutId,
        metadata: { amount, recipient_email: recipientEmail },
      }),

    payoutSent: (payoutId: string, amount: number, recipientEmail: string) =>
      logActivity({
        action: 'payout.sent',
        category: 'payment',
        entity_type: 'payout',
        entity_id: payoutId,
        metadata: { amount, recipient_email: recipientEmail },
      }),
  },

  // -------------------------------------------------------------------------
  // CONVERSATION EVENTS
  // -------------------------------------------------------------------------
  conversation: {
    messageSent: (
      userId: string,
      email: string,
      conversationId: string,
      conversationName: string,
      messagePreview?: string
    ) =>
      logActivity({
        action: 'message.sent',
        category: 'conversation',
        userId,
        userEmail: email,
        entity_type: 'conversation',
        entity_id: conversationId,
        entity_name: conversationName,
        metadata: messagePreview ? { preview: messagePreview.slice(0, 100) } : undefined,
      }),

    threadCreated: (
      userId: string,
      email: string,
      conversationId: string,
      conversationName: string,
      participants: string[]
    ) =>
      logActivity({
        action: 'thread.created',
        category: 'conversation',
        userId,
        userEmail: email,
        entity_type: 'conversation',
        entity_id: conversationId,
        entity_name: conversationName,
        metadata: { participants },
      }),
  },

  // -------------------------------------------------------------------------
  // ERROR EVENTS (server-side errors)
  // -------------------------------------------------------------------------
  error: {
    api: (
      userId: string | null,
      email: string | null,
      errorMessage: string,
      statusCode: number,
      path: string
    ) =>
      logActivity({
        action: 'error.api',
        category: 'error',
        userId: userId || undefined,
        userEmail: email || undefined,
        metadata: { error_message: errorMessage, status_code: statusCode, path },
      }),

    permission: (userId: string, email: string, attemptedAction: string, resource: string) =>
      logActivity({
        action: 'error.permission_denied',
        category: 'error',
        userId,
        userEmail: email,
        metadata: { attempted_action: attemptedAction, resource },
      }),

    validation: (userId: string | null, email: string | null, errors: Record<string, string>) =>
      logActivity({
        action: 'error.validation',
        category: 'error',
        userId: userId || undefined,
        userEmail: email || undefined,
        metadata: { errors },
      }),
  },
}
