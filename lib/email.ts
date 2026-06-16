// lib/email.ts
import { Resend } from "resend"
import { WelcomeEmail } from "@/emails/WelcomeEmail"
import { OnboardingCompleteEmail } from "@/emails/OnboardingCompleteEmail"
import { FirstPostEmail } from "@/emails/FirstPostEmail"
import { UpgradedToProEmail } from "@/emails/UpgradedToProEmail"
import { CreditsLowEmail } from "@/emails/CreditsLowEmail"
import { CreditsExhaustedEmail } from "@/emails/CreditsExhaustedEmail"
import { ExtraCreditsEmail } from "@/emails/ExtraCreditsEmail"
import { MonthlyResetEmail } from "@/emails/MonthlyResetEmail"
import { RenewalReminderEmail } from "@/emails/RenewalReminderEmail"
import { SubscriptionCancelledEmail } from "@/emails/SubscriptionCancelledEmail"

const resend = new Resend(process.env.RESEND_API_KEY)

// onboarding@resend.dev is Resend's shared sender for testing (no domain
// verification needed). Swap for a verified domain sender in production.
const FROM = "CarouseLabs <onboarding@resend.dev>"

export function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to CarouseLabs 🎨",
    react: WelcomeEmail({ name }),
  })
}

export function sendOnboardingCompleteEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're all set! Let's create your first post",
    react: OnboardingCompleteEmail({ name }),
  })
}

export function sendFirstPostEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You just created your first post 🎉",
    react: FirstPostEmail({ name }),
  })
}

export function sendUpgradedToProEmail(email: string, name: string, credits: number) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to Pro! You have 30 credits ready 🚀",
    react: UpgradedToProEmail({ name, credits }),
  })
}

export function sendCreditsLowEmail(email: string, name: string, creditsLeft: number) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You have 5 credits left this month ⚠️",
    react: CreditsLowEmail({ name, creditsLeft }),
  })
}

export function sendCreditsExhaustedEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You've used all your credits for this month 🔴",
    react: CreditsExhaustedEmail({ name }),
  })
}

export function sendExtraCreditsEmail(
  email: string,
  name: string,
  creditsAdded: number,
  expiryDate: string,
) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your extra credits are ready! ✅",
    react: ExtraCreditsEmail({ name, creditsAdded, expiryDate }),
  })
}

export function sendMonthlyResetEmail(email: string, name: string, credits: number) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your 30 credits have been reset 🔄",
    react: MonthlyResetEmail({ name, credits }),
  })
}

export function sendRenewalReminderEmail(
  email: string,
  name: string,
  renewalDate: string,
  amount: string,
) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Pro subscription renews in 3 days",
    react: RenewalReminderEmail({ name, renewalDate, amount }),
  })
}

export function sendSubscriptionCancelledEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Pro subscription has been cancelled",
    react: SubscriptionCancelledEmail({ name }),
  })
}
