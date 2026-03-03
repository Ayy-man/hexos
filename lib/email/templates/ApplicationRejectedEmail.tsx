import { Section, Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface ApplicationRejectedEmailProps {
  name: string
}

export function ApplicationRejectedEmail({ name }: ApplicationRejectedEmailProps) {
  const previewText = 'Update on your hexOS developer application'

  return (
    <BaseLayout preview={previewText}>
      <Section style={cardStyle}>
        <Text style={headingStyle}>Application Update</Text>
        <Text style={bodyTextStyle}>Hi {name},</Text>
        <Text style={bodyTextStyle}>
          Thank you for your interest in joining hexOS as a developer. After careful consideration,
          we&apos;re unable to move forward with your application at this time.
        </Text>
        <Text style={bodyTextStyle}>
          This doesn&apos;t mean the door is closed. We encourage you to apply again in the future
          as our needs evolve and new opportunities arise.
        </Text>
        <Text style={bodyTextStyle}>
          We appreciate the time you took to apply and wish you the best in your endeavors.
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
