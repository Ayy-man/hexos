import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Heading,
  Hr,
  Preview,
} from '@react-email/components'

interface InvitationEmailProps {
  inviterName: string
  inviteType: string
  organizationName: string | null
  inviteUrl: string
}

export function InvitationEmail({
  inviterName,
  inviteType,
  organizationName,
  inviteUrl,
}: InvitationEmailProps) {
  const previewText = organizationName
    ? `${inviterName} invited you to join ${organizationName}`
    : `${inviterName} invited you to join hexOS`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're invited!</Heading>
          <Text style={text}>
            {inviterName} has invited you to join {organizationName || 'hexOS'} as a {inviteType.replace('_', ' ')}.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>
          <Link href={inviteUrl} style={link}>
            {inviteUrl}
          </Link>
          <Hr style={hr} />
          <Text style={footer}>
            This invitation expires in 7 days. If you didn't expect this invitation, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' }
const h1 = { color: '#1f2937', fontSize: '24px', fontWeight: '600', marginBottom: '24px' }
const text = { color: '#1f2937', fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }
const buttonContainer = { marginBottom: '24px' }
const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
}
const link = { color: '#2563eb', fontSize: '14px', wordBreak: 'break-all' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#6b7280', fontSize: '14px' }
