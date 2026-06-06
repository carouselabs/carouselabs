import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'carouselabs:ratelimit',
})

export const ideaRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '1 h'),
  analytics: true,
  prefix: 'carouselabs:ideas',
})
