/**
 * Email utility for sending transactional emails
 *
 * TODO: Install Resend and implement email sending
 * npm install resend @react-email/components
 */

export type EmailTemplate =
  | 'invitation'
  | 'application-received'
  | 'application-approved'
  | 'application-rejected'

export interface SendEmailParams {
  to: string
  subject: string
  template: EmailTemplate
  data: Record<string, unknown>
}

/**
 * Send an email using the configured email provider
 *
 * Currently logs to console - implement with Resend when ready
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  // TODO: Implement with Resend
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'hexOS <noreply@hexona.io>',
  //   to: params.to,
  //   subject: params.subject,
  //   react: getEmailTemplate(params.template, params.data),
  // })

  console.log('[EMAIL] Would send email:', {
    to: params.to,
    subject: params.subject,
    template: params.template,
    data: params.data,
  })

  return true
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  inviteType: string,
  organizationName: string | null,
  token: string
): Promise<boolean> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

  let subject = 'You\'ve been invited to join hexOS'
  if (organizationName) {
    subject = `You've been invited to join ${organizationName} on hexOS`
  }

  return sendEmail({
    to: email,
    subject,
    template: 'invitation',
    data: {
      inviterName,
      inviteType,
      organizationName,
      inviteUrl,
    },
  })
}

/**
 * Send dev application received confirmation
 */
export async function sendApplicationReceivedEmail(
  email: string,
  name: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'We received your hexOS developer application',
    template: 'application-received',
    data: {
      name,
    },
  })
}

/**
 * Send dev application approved email
 */
export async function sendApplicationApprovedEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

  return sendEmail({
    to: email,
    subject: 'Your hexOS developer application has been approved!',
    template: 'application-approved',
    data: {
      name,
      inviteUrl,
    },
  })
}
