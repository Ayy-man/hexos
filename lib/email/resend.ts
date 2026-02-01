/**
 * Resend email client for sending transactional emails
 *
 * Requires RESEND_API_KEY environment variable
 */
import { Resend } from 'resend'

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || 'hexOS <noreply@hexona.io>'

export const resend = new Resend(process.env.RESEND_API_KEY)
