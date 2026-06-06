import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface SubscriptionConfirmedEmailProps {
  firstName: string
  planName: string
  nextBillingDate: string
}

export function SubscriptionConfirmedEmail({
  firstName,
  planName,
  nextBillingDate,
}: SubscriptionConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re now on CarouseLabs {planName}!</Preview>
      <Body style={{ backgroundColor: '#080810', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0 48px', maxWidth: '560px' }}>
          <Heading style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
            Welcome to {planName}, {firstName}!
          </Heading>
          <Text style={{ color: '#a1a1aa', fontSize: '16px', lineHeight: '26px' }}>
            Your subscription is now active. Your next billing date is {nextBillingDate}.
          </Text>
          <Text style={{ color: '#a1a1aa', fontSize: '16px', lineHeight: '26px' }}>
            You now have access to 1 post per day, unlimited ideas, and all CarouseLabs Pro features.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SubscriptionConfirmedEmail
