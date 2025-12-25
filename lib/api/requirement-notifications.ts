import { createClient } from '@/lib/supabase/server'

/**
 * Check for newly unblocked requirements after one is completed
 * and send notifications to assignees
 */
export async function checkAndNotifyUnblockedRequirements(
  completedRequirementId: string
): Promise<void> {
  const supabase = await createClient()

  // Find requirements that depend on the completed one
  const { data: blockedRequirements, error } = await supabase
    .from('requirement_dependencies')
    .select('requirement_id')
    .eq('depends_on_id', completedRequirementId)

  if (error || !blockedRequirements || blockedRequirements.length === 0) {
    return
  }

  // Check each potentially unblocked requirement
  for (const blocked of blockedRequirements) {
    const reqId = blocked.requirement_id

    // Get all dependencies for this requirement
    const { data: allDeps } = await supabase
      .from('requirement_dependencies')
      .select('depends_on_id')
      .eq('requirement_id', reqId)

    if (!allDeps || allDeps.length === 0) continue

    // Get status of all dependencies
    const depIds = allDeps.map((d) => d.depends_on_id)
    const { data: depStatuses } = await supabase
      .from('project_requirements')
      .select('id, status')
      .in('id', depIds)

    // Check if ALL dependencies are now complete
    const stillBlocked = (depStatuses || []).some((d) => d.status !== 'completed')

    if (!stillBlocked) {
      // This requirement is now unblocked - send notification
      await sendUnblockedNotification(reqId)
    }
  }
}

/**
 * Send notification when a requirement becomes unblocked
 */
async function sendUnblockedNotification(requirementId: string): Promise<void> {
  const supabase = await createClient()

  // Get requirement details with project info
  const { data: requirement } = await supabase
    .from('project_requirements')
    .select(
      `
      id,
      title,
      project_id,
      assigned_to,
      assigned_role,
      project:projects(
        project_name,
        dfy_partner_id,
        client_id
      )
    `
    )
    .eq('id', requirementId)
    .single()

  if (!requirement) return

  // Determine recipient based on assignment
  let recipientId: string | null = requirement.assigned_to

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = requirement.project as any
  if (!recipientId && project) {
    // Fall back to role-based recipient
    recipientId =
      requirement.assigned_role === 'client'
        ? project.client_id
        : project.dfy_partner_id // DFY handles admin tasks
  }

  if (!recipientId) {
    console.log('[NOTIFICATION] No recipient found for requirement:', requirement.title)
    return
  }

  // Get recipient email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', recipientId)
    .single()

  if (!profile?.email) {
    console.log('[NOTIFICATION] No email found for recipient:', recipientId)
    return
  }

  // Log the notification (in-app notifications can be added later)
  console.log('[NOTIFICATION] Requirement unblocked:', {
    to: profile.email,
    name: profile.name,
    requirement: requirement.title,
    project: project?.project_name,
  })

  // TODO: Send actual email via Resend
  // await sendEmail({
  //   to: profile.email,
  //   subject: `Action Required: ${requirement.title}`,
  //   template: 'requirement-unblocked',
  //   data: {
  //     recipientName: profile.name,
  //     requirementTitle: requirement.title,
  //     projectName: project?.project_name,
  //     projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${requirement.project_id}`,
  //   },
  // })
}

/**
 * Placeholder for email sending (to be implemented with Resend)
 */
// export async function sendEmail(payload: {
//   to: string
//   subject: string
//   template: string
//   data: Record<string, unknown>
// }): Promise<void> {
//   // TODO: Implement with Resend
//   // const resend = new Resend(process.env.RESEND_API_KEY)
//   // await resend.emails.send({
//   //   from: 'hexOS <noreply@hexona.io>',
//   //   to: payload.to,
//   //   subject: payload.subject,
//   //   react: EmailTemplate(payload.template, payload.data),
//   // })
// }
