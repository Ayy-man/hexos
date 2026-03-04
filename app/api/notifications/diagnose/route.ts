import { NextResponse } from 'next/server'
import { diagnoseNotifications } from '@/lib/api/notification-diagnostics'

export async function GET() {
  try {
    const result = await diagnoseNotifications()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
