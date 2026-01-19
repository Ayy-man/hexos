/**
 * Error Handling Utilities
 *
 * Provides consistent error handling across the application with:
 * - Error type classification
 * - User-friendly error messages
 * - Supabase error parsing
 */

// Error codes for classification
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RLS_ERROR'
  | 'CONFLICT_ERROR'
  | 'UNKNOWN_ERROR'

// Structured application error
export interface AppError {
  code: ErrorCode
  message: string
  userMessage: string
  originalError?: unknown
}

// User-friendly messages for each error code
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  AUTH_ERROR: 'Your session has expired. Please log in again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RLS_ERROR: 'You do not have access to this resource.',
  CONFLICT_ERROR: 'This action conflicts with existing data. Please refresh and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
}

// Supabase PostgreSQL error codes
const SUPABASE_ERROR_CODES: Record<string, ErrorCode> = {
  // Not found / RLS violations
  PGRST116: 'NOT_FOUND', // JSON object requested, multiple (or no) rows returned
  '42501': 'PERMISSION_ERROR', // insufficient_privilege
  '42P01': 'NOT_FOUND', // undefined_table

  // Auth errors
  '23505': 'CONFLICT_ERROR', // unique_violation
  '23503': 'VALIDATION_ERROR', // foreign_key_violation
  '22P02': 'VALIDATION_ERROR', // invalid_text_representation

  // RLS specific
  '42000': 'RLS_ERROR', // syntax_error_or_access_rule_violation
}

/**
 * Parse any error into a structured AppError
 */
export function parseError(error: unknown): AppError {
  // Handle null/undefined
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error',
      userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
    }
  }

  // Handle Supabase PostgrestError (has .code property)
  if (isSupabaseError(error)) {
    const supabaseError = error as { code?: string; message?: string; details?: string }
    const code = supabaseError.code || ''
    const errorCode = SUPABASE_ERROR_CODES[code] || 'UNKNOWN_ERROR'

    return {
      code: errorCode,
      message: supabaseError.message || 'Database error',
      userMessage: ERROR_MESSAGES[errorCode],
      originalError: error,
    }
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      userMessage: ERROR_MESSAGES.NETWORK_ERROR,
      originalError: error,
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for auth-related messages
    if (
      error.message.toLowerCase().includes('auth') ||
      error.message.toLowerCase().includes('session') ||
      error.message.toLowerCase().includes('token')
    ) {
      return {
        code: 'AUTH_ERROR',
        message: error.message,
        userMessage: ERROR_MESSAGES.AUTH_ERROR,
        originalError: error,
      }
    }

    // Check for permission-related messages
    if (
      error.message.toLowerCase().includes('permission') ||
      error.message.toLowerCase().includes('forbidden') ||
      error.message.toLowerCase().includes('unauthorized')
    ) {
      return {
        code: 'PERMISSION_ERROR',
        message: error.message,
        userMessage: ERROR_MESSAGES.PERMISSION_ERROR,
        originalError: error,
      }
    }

    // Check for not found messages
    if (
      error.message.toLowerCase().includes('not found') ||
      error.message.toLowerCase().includes('does not exist')
    ) {
      return {
        code: 'NOT_FOUND',
        message: error.message,
        userMessage: ERROR_MESSAGES.NOT_FOUND,
        originalError: error,
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: error,
      userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
    }
  }

  // Fallback for unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: JSON.stringify(error),
    userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
    originalError: error,
  }
}

/**
 * Get user-friendly message for an error code
 */
export function getUserMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code]
}

/**
 * Check if an error is a Supabase error
 */
function isSupabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  return 'code' in error || 'message' in error || 'details' in error
}

/**
 * Check if an error is a "not found" type error
 */
export function isNotFoundError(error: unknown): boolean {
  const appError = parseError(error)
  return appError.code === 'NOT_FOUND' || appError.code === 'RLS_ERROR'
}

/**
 * Check if an error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  const appError = parseError(error)
  return appError.code === 'AUTH_ERROR'
}

/**
 * Check if an error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  const appError = parseError(error)
  return appError.code === 'PERMISSION_ERROR' || appError.code === 'RLS_ERROR'
}
