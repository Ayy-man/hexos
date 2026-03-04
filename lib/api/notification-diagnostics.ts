'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

/**
 * Diagnose why notifications aren't working.
 * Call from the browser console or a debug page.
 * Returns a structured report of what's broken.
 */
export async function diagnoseNotifications(): Promise<{
  ok: boolean
  checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; detail: string }>
}> {
  const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; detail: string }> = []

  // 1. Check auth
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      checks.push({ name: 'Auth', status: 'fail', detail: `Not authenticated: ${error?.message || 'no user'}` })
    } else {
      checks.push({ name: 'Auth', status: 'pass', detail: `Logged in as ${user.id}` })
    }
  } catch (err) {
    checks.push({ name: 'Auth', status: 'fail', detail: `Auth error: ${err}` })
  }

  // 2. Check admin client
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('profiles').select('id').limit(1)
    if (error) {
      checks.push({ name: 'Admin Client', status: 'fail', detail: `Admin client query failed: ${error.message}` })
    } else {
      checks.push({ name: 'Admin Client', status: 'pass', detail: `Admin client working (found ${data?.length ?? 0} profile)` })
    }
  } catch (err) {
    checks.push({ name: 'Admin Client', status: 'fail', detail: `Admin client error: ${err}. Is SUPABASE_SERVICE_ROLE_KEY set?` })
  }

  // 3. Check for admin/internal users
  try {
    const admin = createAdminClient()
    const { data: admins, error } = await admin
      .from('profiles')
      .select('id, name, role')
      .in('role', ['admin', 'internal'])

    if (error) {
      checks.push({ name: 'Admin Users', status: 'fail', detail: `Failed to query admin users: ${error.message}` })
    } else if (!admins || admins.length === 0) {
      checks.push({ name: 'Admin Users', status: 'fail', detail: 'NO admin or internal users found in profiles table! notifyAdmins() will silently do nothing.' })
    } else {
      checks.push({ name: 'Admin Users', status: 'pass', detail: `Found ${admins.length} admin/internal user(s): ${admins.map(a => `${a.name} (${a.role})`).join(', ')}` })
    }
  } catch (err) {
    checks.push({ name: 'Admin Users', status: 'fail', detail: `Error: ${err}` })
  }

  // 4. Check notification type enum values exist in DB
  try {
    const admin = createAdminClient()
    const requiredTypes = [
      'inquiry_created', 'proposal_sent', 'inquiry_won', 'inquiry_lost',
      'proposal_ready', 'stage_changed', 'assigned', 'blocker_raised',
      'escalation_admin', 'deliverables_confirmed', 'send_for_signoff',
      'signed_off', 'project_completed', 'status_change',
    ]

    const { data: enumValues, error } = await admin.rpc('get_enum_values', {
      enum_name: 'notification_type',
    }).maybeSingle()

    // Fallback: try direct insert test if RPC doesn't exist
    if (error) {
      // Try to detect missing enum values by attempting a dry-run insert
      // Use a known-good type first
      const { error: testError } = await admin
        .from('notifications')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          type: 'inquiry_created',
          title: '__diagnostic_test__',
        })

      if (testError) {
        const msg = testError.message || ''
        if (msg.includes('invalid input value for enum') || msg.includes('notification_type')) {
          checks.push({
            name: 'Notification Enum',
            status: 'fail',
            detail: `Type "inquiry_created" does NOT exist in DB enum! Migration 20260222000001 needs to be applied. Error: ${msg}`,
          })
        } else if (msg.includes('violates foreign key')) {
          // This is expected — the type exists but the UUID doesn't
          checks.push({ name: 'Notification Enum', status: 'pass', detail: 'Enum type "inquiry_created" exists in DB (FK error is expected for test)' })
        } else {
          checks.push({ name: 'Notification Enum', status: 'warn', detail: `Unexpected error testing enum: ${msg}` })
        }

        // Clean up any test row that somehow got created
        await admin.from('notifications').delete().eq('title', '__diagnostic_test__')
      } else {
        // Somehow inserted — clean up
        await admin.from('notifications').delete().eq('title', '__diagnostic_test__')
        checks.push({ name: 'Notification Enum', status: 'pass', detail: 'Enum types exist in DB' })
      }
    } else {
      const values = (enumValues as string[]) || []
      const missing = requiredTypes.filter((t) => !values.includes(t))
      if (missing.length > 0) {
        checks.push({
          name: 'Notification Enum',
          status: 'fail',
          detail: `Missing enum values in DB: ${missing.join(', ')}. Run migration 20260222000001_sync_notification_type_enum.sql`,
        })
      } else {
        checks.push({ name: 'Notification Enum', status: 'pass', detail: `All ${requiredTypes.length} required types exist` })
      }
    }
  } catch (err) {
    checks.push({ name: 'Notification Enum', status: 'warn', detail: `Could not verify enum: ${err}` })
  }

  // 5. Check recent notifications exist
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('notifications')
      .select('id, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      checks.push({ name: 'Recent Notifications', status: 'fail', detail: `Query failed: ${error.message}` })
    } else if (!data || data.length === 0) {
      checks.push({ name: 'Recent Notifications', status: 'fail', detail: 'ZERO notifications exist in the database. Notifications have never been created successfully.' })
    } else {
      const latest = data[0]
      checks.push({
        name: 'Recent Notifications',
        status: 'pass',
        detail: `Found ${data.length} recent notification(s). Latest: type="${latest.type}" at ${latest.created_at}`,
      })
    }
  } catch (err) {
    checks.push({ name: 'Recent Notifications', status: 'fail', detail: `Error: ${err}` })
  }

  // 6. Test creating an actual notification for current user
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createAdminClient()
      const { data: inserted, error: insertError } = await admin
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'status_change' as const,  // Use original enum value that definitely exists
          title: 'Notification System Test',
          message: 'If you see this, notifications are working. You can dismiss this.',
        })
        .select()
        .single()

      if (insertError) {
        checks.push({
          name: 'Test Insert',
          status: 'fail',
          detail: `Failed to create test notification: ${insertError.message} (code: ${insertError.code})`,
        })
      } else {
        checks.push({
          name: 'Test Insert',
          status: 'pass',
          detail: `Successfully created test notification ${inserted.id}. Check your notification bell!`,
        })
      }
    }
  } catch (err) {
    checks.push({ name: 'Test Insert', status: 'fail', detail: `Error: ${err}` })
  }

  const ok = checks.every((c) => c.status !== 'fail')
  return { ok, checks }
}
