import React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components'

interface BaseLayoutProps {
  preview: string
  children: React.ReactNode
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>hexOS</Text>
          </Section>
          {children}
          <Hr style={hrStyle} />
          <Text style={footerStyle}>hexOS by Hexona — Built for agencies and developers</Text>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = {
  backgroundColor: '#f4f4f5',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const containerStyle = {
  maxWidth: '480px',
  margin: '0 auto',
  padding: '40px 20px',
}

const headerStyle = {
  marginBottom: '24px',
}

const logoStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#18181b',
  margin: '0',
}

const hrStyle = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
}

const footerStyle: React.CSSProperties = {
  color: '#71717a',
  fontSize: '12px',
  textAlign: 'center',
}
