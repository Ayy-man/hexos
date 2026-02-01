import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Hr,
  Preview,
} from '@react-email/components'

interface ApplicationRejectedEmailProps {
  name: string
}

export function ApplicationRejectedEmail({
  name,
}: ApplicationRejectedEmailProps) {
  const previewText = 'Update on your hexOS developer application'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Application Update</Heading>
          <Text style={text}>
            Hi {name},
          </Text>
          <Text style={text}>
            Thank you for your interest in joining hexOS as a developer. After careful consideration, we're unable to move forward with your application at this time.
          </Text>
          <Text style={text}>
            This doesn't mean the door is closed. We encourage you to apply again in the future as our needs evolve and new opportunities arise.
          </Text>
          <Text style={text}>
            We appreciate the time you took to apply and wish you the best in your endeavors.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you believe this decision was made in error, please reach out to our team.
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
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#6b7280', fontSize: '14px' }
