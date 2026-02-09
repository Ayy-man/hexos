/**
 * Resend email client for sending transactional emails
 *
 * Requires RESEND_API_KEY environment variable
 */
import { Resend } from 'resend'

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || 'hexOS <noreply@hexona.io>'

// Use a placeholder key during build if not set - Resend will throw at runtime if used
export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_for_build')
