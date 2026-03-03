import { Section, Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface ApplicationReceivedEmailProps {
  name: string
}

export function ApplicationReceivedEmail({ name }: ApplicationReceivedEmailProps) {
  const previewText = 'We received your hexOS developer application'

  return (
    <BaseLayout preview={previewText}>
      <Section style={cardStyle}>
        <Text style={headingStyle}>Application Received</Text>
        <Text style={bodyTextStyle}>Hi {name},</Text>
        <Text style={bodyTextStyle}>
          Thank you for applying to join hexOS as a developer. We&apos;ve received your application
          and our team will review it shortly.
        </Text>
        <Text style={bodyTextStyle}>
          We typically review applications within a few business days. You&apos;ll receive an email
          from us either way, whether we&apos;re able to move forward or not.
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
