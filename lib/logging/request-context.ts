import { headers } from 'next/headers'

export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
  requestPath: string | null
  requestMethod: string | null
}

/**
 * Get request context from headers
 * Safe to call in server components and API routes
 */
export async function getRequestContext(): Promise<RequestContext> {
  try {
    const headersList = await headers()

    // Get IP - Vercel uses x-forwarded-for, fallback to x-real-ip
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : headersList.get('x-real-ip')

    return {
      ipAddress: ipAddress || null,
      userAgent: headersList.get('user-agent') || null,
      requestPath: headersList.get('x-invoke-path') || headersList.get('referer') || null,
      requestMethod: headersList.get('x-invoke-method') || null,
    }
  } catch {
    // Headers not available (e.g., in background job or static generation)
    return {
      ipAddress: null,
      userAgent: null,
      requestPath: null,
      requestMethod: null,
    }
  }
}

/**
 * Parse user agent to get browser and OS info
 */
export function parseUserAgent(userAgent: string | null): { browser: string; os: string } {
  if (!userAgent) {
    return { browser: 'Unknown', os: 'Unknown' }
  }

  // Browser detection
  let browser = 'Other'
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome'
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge'
  }

  // OS detection
  let os = 'Other'
  if (userAgent.includes('Mac')) {
    os = 'macOS'
  } else if (userAgent.includes('Windows')) {
    os = 'Windows'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
  }

  return { browser, os }
}
