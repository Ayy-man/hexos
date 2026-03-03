import { Section, Text, Button, Link } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface InvitationEmailProps {
  inviterName: string
  inviteType: string
  organizationName: string | null
  inviteUrl: string
}

function getSubtitle(inviteType: string, organizationName: string | null): string {
  if (inviteType === 'admin' || inviteType === 'internal') {
    return 'Join the hexOS team'
  }
  if (inviteType === 'dfy_first') {
    return 'Set up your agency'
  }
  if (inviteType === 'dfy_team') {
    return `Join ${organizationName || 'your organization'}`
  }
  return 'Start building'
}

export function InvitationEmail({
  inviterName,
  inviteType,
  organizationName,
  inviteUrl,
}: InvitationEmailProps) {
  const previewText = `${inviterName} invited you to join ${organizationName || 'hexOS'}`
  const subtitle = getSubtitle(inviteType, organizationName)

  return (
    <BaseLayout preview={previewText}>
      <Section style={cardStyle}>
        <Text style={headingStyle}>You&apos;re invited</Text>
        <Text style={bodyTextStyle}>{subtitle}</Text>
        <Text style={bodyTextStyle}>
          {inviterName} has invited you to join {organizationName || 'hexOS'}. Click the button
          below to accept your invitation and get started.
        </Text>
        <Button style={buttonStyle} href={inviteUrl}>
          Accept Invitation
        </Button>
        <Text style={bodyTextStyle}>Or copy and paste this URL into your browser:</Text>
        <Link href={inviteUrl} style={linkStyle}>
          {inviteUrl}
        </Link>
        <Text style={expiryStyle}>This invitation expires in 7 days.</Text>
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
