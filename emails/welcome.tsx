import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  firstName: string
}

export function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to CarouseLabs — let&apos;s build your LinkedIn presence.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to CarouseLabs, {firstName}!</Heading>
          <Text style={text}>
            You&apos;re now ready to create stunning LinkedIn carousels and content with AI.
          </Text>
          <Section style={btnContainer}>
            <Link style={button} href="https://carouselabs.com/dashboard">
              Get Started
            </Link>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>CarouseLabs · carouselabs.com</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#080810', fontFamily: 'Inter, sans-serif' }
const container = { margin: '0 auto', padding: '20px 0 48px', maxWidth: '560px' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '40px 0 20px' }
const text = { color: '#a1a1aa', fontSize: '16px', lineHeight: '26px' }
const btnContainer = { textAlign: 'center' as const, marginTop: '32px' }
const button = {
  backgroundColor: '#7C3AED',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}
const hr = { borderColor: '#1E1E2E', margin: '32px 0' }
const footer = { color: '#52525b', fontSize: '12px', lineHeight: '24px' }

export default WelcomeEmail
