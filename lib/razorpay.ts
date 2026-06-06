import Razorpay from 'razorpay'

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export const PLANS = {
  PRO: {
    name: 'CarouseLabs Pro',
    amount: 3400,
    currency: 'INR',
    interval: 'monthly',
    planId: process.env.RAZORPAY_PLAN_ID!,
  },
} as const
