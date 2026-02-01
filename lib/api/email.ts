/**
 * Email utility for sending transactional emails via Resend
 */

import { render } from '@react-email/components'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import {
  InvitationEmail,
  ApplicationReceivedEmail,
  ApplicationApprovedEmail,
  ApplicationRejectedEmail,
} from '@/lib/email/templates'

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
 * Render React Email template to HTML string
 */
async function renderEmailTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>
): Promise<string> {
  switch (template) {
    case 'invitation':
      return await render(
        InvitationEmail({
          inviterName: data.inviterName as string,
          inviteType: data.inviteType as string,
          organizationName: data.organizationName as string | null,
          inviteUrl: data.inviteUrl as string,
        })
      )
    case 'application-received':
      return await render(
        ApplicationReceivedEmail({
          name: data.name as string,
        })
      )
    case 'application-approved':
      return await render(
        ApplicationApprovedEmail({
          name: data.name as string,
          inviteUrl: data.inviteUrl as string,
        })
      )
    case 'application-rejected':
      return await render(
        ApplicationRejectedEmail({
          name: data.name as string,
        })
      )
    default:
      throw new Error(`Unknown email template: ${template}`)
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
      html: await renderEmailTemplate(template, data),
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
