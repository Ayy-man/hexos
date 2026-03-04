import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from './notifications-utils'

async function sendTestingNotification(params: {
  projectId: string
  deliverableId: string
  type: NotificationType
  title: string
  message: string
}): Promise<void> {
  const supabase = createAdminClient()

  let roles: string[] = []

  switch (params.type) {
    case 'testing_ready_dev': {
      const { data: devAssignment } = await supabase
        .from('deliverables')
        .select('assigned_to')
        .eq('id', params.deliverableId)
        .single()

      if (devAssignment?.assigned_to) {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: devAssignment.assigned_to,
            type: params.type,
            title: params.title,
            message: params.message,
            project_id: params.projectId,
            deliverable_id: params.deliverableId,
          })
        if (error) console.error('[sendTestingNotification] Failed to notify dev:', error)
      }
      return
    }

    case 'testing_ready_admin_int':
      roles = ['admin', 'internal']
      break

    case 'testing_ready_client':
      roles = ['client', 'dfy']
      break

    case 'testing_passed':
    case 'testing_failed':
      roles = ['admin', 'internal']
      break

    case 'testing_escalated':
      roles = ['admin', 'internal', 'client']
      break

    default:
      return
  }

  const { data: users, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .in('role', roles)

  if (fetchError) {
    console.error('[sendTestingNotification] Failed to fetch users:', fetchError)
    return
  }

  if (!users || users.length === 0) return

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(
      users.map(user => ({
        user_id: user.id,
        type: params.type,
        title: params.title,
        message: params.message,
        project_id: params.projectId,
        deliverable_id: params.deliverableId,
      }))
    )

  if (insertError) {
    console.error('[sendTestingNotification] Failed to insert notifications:', insertError)
  }
}

export async function notifyDevTestingReady(
  projectId: string,
  deliverableId: string,
  deliverableTitle: string
): Promise<void> {
  await sendTestingNotification({
    projectId,
    deliverableId,
    type: 'testing_ready_dev',
    title: 'Ready for Testing',
    message: `"${deliverableTitle}" is ready for your self-testing. Complete the testing checklist to proceed.`,
  })
}

export async function notifyAdminIntTestingReady(
  projectId: string,
  deliverableId: string,
  deliverableTitle: string
): Promise<void> {
  await sendTestingNotification({
    projectId,
    deliverableId,
    type: 'testing_ready_admin_int',
    title: 'Ready for QA Review',
    message: `"${deliverableTitle}" has passed dev testing and is ready for Admin/INT review.`,
  })
}

export async function notifyClientTestingReady(
  projectId: string,
  deliverableId: string,
  deliverableTitle: string
): Promise<void> {
  await sendTestingNotification({
    projectId,
    deliverableId,
    type: 'testing_ready_client',
    title: 'Ready for UAT',
    message: `"${deliverableTitle}" has passed internal QA and is ready for your acceptance testing.`,
  })
}

export async function notifyTestingPassed(
  projectId: string,
  deliverableId: string,
  deliverableTitle: string,
  stage: string
): Promise<void> {
  const stageMap: Record<string, string> = { dev: 'Developer', admin_int: 'QA', client: 'Client' }
  const stageLabel = stageMap[stage] || stage
  const stageLabelLower = stageMap[stage]?.toLowerCase() || stage

  await sendTestingNotification({
    projectId,
    deliverableId,
    type: 'testing_passed',
    title: `${stageLabel} Testing Passed`,
    message: `"${deliverableTitle}" has passed ${stageLabelLower} testing.`,
  })
}

export async function notifyTestingFailed(
  projectId: string,
  deliverableId: string,
  deliverableTitle: string,
  stage: string,
  failureCount: number
): Promise<void> {
  const stageMap: Record<string, string> = { dev: 'Developer', admin_int: 'QA', client: 'Client' }
  const stageLabel = stageMap[stage] || stage
  const stageLabelLower = stageMap[stage]?.toLowerCase() || stage

  await sendTestingNotification({
    projectId,
    deliverableId,
    type: 'testing_failed',
    title: `${stageLabel} Testing Failed`,
    message: `"${deliverableTitle}" failed ${stageLabelLower} testing with ${failureCount} issue(s). Blockers have been created.`,
  })
}

export async function notifyTestingEscalated(
  projectId: string,
  deliverableId: string,
  deliverableTitle: string
): Promise<void> {
  await sendTestingNotification({
    projectId,
    deliverableId,
    type: 'testing_escalated',
    title: 'UAT Escalated',
    message: `"${deliverableTitle}" UAT was escalated due to timeout. Admin has approved on client's behalf.`,
  })
}
