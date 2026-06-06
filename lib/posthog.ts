import { PostHog } from 'posthog-node'

const globalForPosthog = globalThis as unknown as {
  posthog: PostHog | undefined
}

export const posthog =
  globalForPosthog.posthog ??
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })

if (process.env.NODE_ENV !== 'production') globalForPosthog.posthog = posthog
