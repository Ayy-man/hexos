/**
 * Email utility for sending transactional emails via Resend
 */

import { resend, EMAIL_FROM } from '@/lib/email/resend'

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
 * Generate HTML content for email templates
 * Temporary placeholder - will be replaced with React Email components in plan 02
 */
function getEmailHtml(template: EmailTemplate, data: Record<string, unknown>): string {
  switch (template) {
    case 'invitation':
      return `<p>You've been invited to join hexOS. <a href="${data.inviteUrl}">Accept invitation</a></p>`
    case 'application-received':
      return `<p>Hi ${data.name}, we received your application. We'll be in touch soon.</p>`
    case 'application-approved':
      return `<p>Hi ${data.name}, your application has been approved! <a href="${data.inviteUrl}">Get started</a></p>`
    case 'application-rejected':
      return `<p>Hi ${data.name}, unfortunately we couldn't approve your application at this time.</p>`
    default:
      return '<p>hexOS notification</p>'
  }
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, template, data } = params

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html: getEmailHtml(template, data),
    })

    console.log('[EMAIL] Sent:', { to, subject, template })
    return true
  } catch (error) {
    console.error('[EMAIL] Failed to send:', { to, subject, template, error })
    return false
  }
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

/**
 * Send dev application rejected email
 */
export async function sendApplicationRejectedEmail(
  email: string,
  name: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Update on your hexOS developer application',
    template: 'application-rejected',
    data: { name },
  })
}
