// lib/razorpay.ts
import Razorpay from "razorpay"

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Billing is in USD. Razorpay amounts use the currency's smallest unit, so USD
// amounts are in cents. The Pro subscription is a $24/month plan that must be
// created in the Razorpay dashboard (amount 2400, currency USD) with its id set
// as RAZORPAY_PLAN_ID; international payments must be enabled on the account.
export const BILLING_CURRENCY = "USD"
export const PRICE_PER_CREDIT_CENTS = 200 // $2 per extra credit
export const MIN_EXTRA_CREDITS = 5 // minimum 5 credits = $10
export const PRO_MONTHLY_CREDITS = 30
export const PRO_MONTHLY_PRICE_CENTS = 2400 // $24 / month
