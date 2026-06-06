export const APP_NAME = 'CarouseLabs'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://carouselabs.com'

export const PLANS = {
  FREE: {
    name: 'Free',
    postsPerDay: 0,
    lifetimePosts: 1,
    features: ['1 free post lifetime', 'Unlimited idea generation', 'Basic templates'],
  },
  PRO: {
    name: 'Pro',
    price: 3400,
    currency: 'INR',
    postsPerDay: 1,
    features: [
      '1 post per day',
      'Unlimited idea generation',
      'All post formats (caption, image, carousel)',
      'LinkedIn publishing',
      'Analytics',
      'Priority support',
    ],
  },
} as const

export const IDEA_CATEGORIES = ['LATEST_NEWS', 'TRENDING', 'INDUSTRY', 'RANDOM'] as const

export const POST_FORMATS = ['CAPTION', 'IMAGE', 'CAROUSEL'] as const

export const MAX_SLIDES = 10
export const MIN_SLIDES = 4

export const CACHE_TTL = {
  IDEAS: 60 * 60, // 1 hour
  PROFILE: 60 * 5, // 5 minutes
  USER: 60 * 5, // 5 minutes
} as const
