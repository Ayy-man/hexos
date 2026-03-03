import { Section, Text, Button, Link } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface PasswordResetEmailProps {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  const previewText = 'Reset your hexOS password'

  return (
    <BaseLayout preview={previewText}>
      <Section style={cardStyle}>
        <Text style={headingStyle}>Reset your password</Text>
        <Text style={bodyTextStyle}>
          We received a request to reset your hexOS password. Click the button below to choose a new password.
        </Text>
        <Button style={buttonStyle} href={resetUrl}>
          Reset Password
        </Button>
        <Text style={bodyTextStyle}>Or copy and paste this URL into your browser:</Text>
        <Link href={resetUrl} style={linkStyle}>
          {resetUrl}
        </Link>
        <Text style={expiryStyle}>
          This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  )
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  padding: '32px 24px',
  marginBottom: '24px',
}

const headingStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#18181b',
  margin: '0 0 8px',
}

const bodyTextStyle = {
  color: '#3f3f46',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
}

const buttonStyle = {
  backgroundColor: '#0891b2',
  color: '#ffffff',
  borderRadius: '6px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}

const linkStyle = {
  color: '#0891b2',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
}

const expiryStyle = {
  color: '#71717a',
  fontSize: '12px',
  margin: '16px 0 0',
}
