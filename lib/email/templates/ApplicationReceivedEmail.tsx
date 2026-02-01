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

interface ApplicationReceivedEmailProps {
  name: string
}

export function ApplicationReceivedEmail({
  name,
}: ApplicationReceivedEmailProps) {
  const previewText = 'We received your hexOS developer application'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Application Received</Heading>
          <Text style={text}>
            Hi {name},
          </Text>
          <Text style={text}>
            Thank you for applying to join hexOS as a developer. We've received your application and our team will review it shortly.
          </Text>
          <Text style={text}>
            We typically review applications within a few business days. You'll receive an email from us either way, whether we're able to move forward or not.
          </Text>
          <Text style={text}>
            In the meantime, feel free to reach out if you have any questions.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            This is an automated confirmation. No action is required on your part.
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
