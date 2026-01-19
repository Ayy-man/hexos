'use client'

import { useEffect } from 'react'
import { reportUnhandledRejection, reportRuntimeError } from '@/lib/error-reporter'

/**
 * Global error handler component
 * Catches unhandled promise rejections and runtime JS errors
 * Add this to your root layout
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault() // Prevent default console error
      reportUnhandledRejection(event.reason)
    }

    // Handle runtime JS errors
    const handleError = (event: ErrorEvent) => {
      // Don't report errors from browser extensions or cross-origin scripts
      if (event.filename && !event.filename.includes(window.location.origin)) {
        return
      }

      reportRuntimeError(
        event.message,
        event.filename,
        event.lineno,
        event.colno,
        event.error
      )
    }

    window.addEventListener('unhandledrejection', handleRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // This component renders nothing
  return null
}
