// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { acceptInvitation } from '@/lib/api/invitations'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token') // invitation token if from invite flow
  const next = searchParams.get('next') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Missing auth code')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication failed')}`)
  }

  // If this is an invite flow, accept the invitation
  if (token) {
    const result = await acceptInvitation(token, user.id)
    if (result.success) {
      return NextResponse.redirect(`${origin}${result.redirect_to}`)
    }
    // If acceptance fails, still redirect to dashboard — user is authenticated
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Check if user has a profile with a role (existing user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) {
    // New OAuth user with no role — redirect to login with info
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No account found. Please use an invitation link to join.')}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
