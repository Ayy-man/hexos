'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { activityLogger } from '@/lib/logging/activity-logger'

export async function signIn(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  // Log successful login
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    activityLogger.auth.login(data.user.id, email, profile?.role || 'unknown')
  }

  // Redirect to dashboard - it will handle role-based routing
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()

  // Get user before signing out for logging
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    activityLogger.auth.logout(user.id, user.email || 'unknown')
  }

  await supabase.auth.signOut()
  redirect('/login')
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user) {
    return { success: false, error: 'Failed to create user' }
  }

  return { success: true, userId: data.user.id }
}

export async function signInAndReturn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function signInWithGoogle(inviteToken?: string) {
  const supabase = await createClient()

  const redirectTo = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  if (inviteToken) {
    redirectTo.searchParams.set('token', inviteToken)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
    },
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithMagicLink(
  email: string,
  inviteToken?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const redirectTo = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  if (inviteToken) {
    redirectTo.searchParams.set('token', inviteToken)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString(),
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function resetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
