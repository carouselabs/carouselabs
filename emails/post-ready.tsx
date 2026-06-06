import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface PostReadyEmailProps {
  firstName: string
  postId: string
  postTitle: string
}

export function PostReadyEmail({ firstName, postId, postTitle }: PostReadyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your CarouseLabs post is ready to publish!</Preview>
      <Body style={{ backgroundColor: '#080810', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0 48px', maxWidth: '560px' }}>
          <Heading style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
            Your post is ready, {firstName}!
          </Heading>
          <Text style={{ color: '#a1a1aa', fontSize: '16px', lineHeight: '26px' }}>
            &ldquo;{postTitle}&rdquo; has been generated and is ready for your review.
          </Text>
          <Link
            href={`https://carouselabs.com/library/${postId}`}
            style={{
              backgroundColor: '#7C3AED',
              borderRadius: '8px',
              color: '#ffffff',
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              padding: '12px 20px',
              textAlign: 'center',
              textDecoration: 'none',
              marginTop: '24px',
            }}
          >
            View &amp; Publish
          </Link>
        </Container>
      </Body>
    </Html>
  )
}

export default PostReadyEmail
