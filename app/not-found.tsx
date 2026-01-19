'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function NotFound() {
  useEffect(() => {
    // Log debug info to help track down 404 cause
    console.error('[404 Debug]', {
      url: window.location.href,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      historyLength: window.history.length,
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">This page could not be found.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Check browser console for debug info
      </p>
      <Link
        href="/dashboard"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
