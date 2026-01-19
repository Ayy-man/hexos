'use client'

import type { ErrorReportInput, ErrorSeverity } from '@/lib/types/activity-logs'

interface BrowserInfo {
  browser: string
  os: string
  screenSize: string
}

/**
 * Get browser and OS info from user agent
 */
function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', screenSize: 'Unknown' }
  }

  const ua = navigator.userAgent

  // Browser detection
  let browser = 'Other'
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome'
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari'
  } else if (ua.includes('Edg')) {
    browser = 'Edge'
  }

  // OS detection
  let os = 'Other'
  if (ua.includes('Mac')) {
    os = 'macOS'
  } else if (ua.includes('Windows')) {
    os = 'Windows'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
  } else if (ua.includes('Android')) {
    os = 'Android'
  }

  return {
    browser,
    os,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
  }
}

/**
 * Report an error to the server
 * This is a fire-and-forget operation that won't throw
 */
export async function reportError(error: Error | ErrorReportInput): Promise<void> {
  const report: ErrorReportInput =
    error instanceof Error ? { message: error.message, stack: error.stack } : error

  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...report,
        ...getBrowserInfo(),
        page: typeof window !== 'undefined' ? window.location.pathname : null,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Silently fail - don't crash the app because error reporting failed
    console.error('[ErrorReporter] Failed to report error:', report.message)
  }
}

/**
 * Report an API error (4xx or 5xx response)
 */
export async function reportApiError(
  url: string,
  status: number,
  statusText: string,
  body?: string,
  method = 'GET',
  duration?: number
): Promise<void> {
  const severity: ErrorSeverity = status >= 500 ? 'critical' : status >= 400 ? 'medium' : 'low'

  await reportError({
    message: `API ${status}: ${url}`,
    action: 'error.api',
    context: {
      status,
      statusText,
      body: body?.slice(0, 500),
      method,
      duration,
    },
    severity,
  })
}

/**
 * Report a React component error (from error boundary)
 */
export async function reportComponentError(
  error: Error,
  componentStack: string,
  componentName?: string
): Promise<void> {
  await reportError({
    message: error.message,
    stack: error.stack,
    action: 'error.react_boundary',
    component: componentName || componentStack.split('\n')[1]?.trim(),
    context: { componentStack },
    severity: 'high',
  })
}

/**
 * Report an unhandled promise rejection
 */
export async function reportUnhandledRejection(reason: unknown): Promise<void> {
  const error = reason instanceof Error ? reason : new Error(String(reason))

  await reportError({
    message: error.message,
    stack: error.stack,
    action: 'error.unhandled_rejection',
    severity: 'high',
  })
}

/**
 * Report a runtime JavaScript error
 */
export async function reportRuntimeError(
  message: string,
  filename?: string,
  lineno?: number,
  colno?: number,
  error?: Error
): Promise<void> {
  await reportError({
    message,
    stack: error?.stack,
    action: 'error.runtime',
    context: {
      filename,
      lineno,
      colno,
    },
    severity: 'high',
  })
}
