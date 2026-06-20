// lib/email.ts
import { Resend } from "resend"
import { render } from "@react-email/render"
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

// Verified domain sender (carouselabs.com is verified in Resend).
const FROM = "CarouseLabs <support@carouselabs.com>"

export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to CarouseLabs 🎨",
    html: await render(WelcomeEmail({ name })),
  })
}

export async function sendOnboardingCompleteEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're all set! Let's create your first post",
    html: await render(OnboardingCompleteEmail({ name })),
  })
}

export async function sendFirstPostEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You just created your first post 🎉",
    html: await render(FirstPostEmail({ name })),
  })
}

export async function sendUpgradedToProEmail(email: string, name: string, credits: number) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to Pro! You have 30 credits ready 🚀",
    html: await render(UpgradedToProEmail({ name, credits })),
  })
}

export async function sendCreditsLowEmail(email: string, name: string, creditsLeft: number) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You have 5 credits left this month ⚠️",
    html: await render(CreditsLowEmail({ name, creditsLeft })),
  })
}

export async function sendCreditsExhaustedEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "You've used all your credits for this month 🔴",
    html: await render(CreditsExhaustedEmail({ name })),
  })
}

export async function sendExtraCreditsEmail(
  email: string,
  name: string,
  creditsAdded: number,
  expiryDate: string,
) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your extra credits are ready! ✅",
    html: await render(ExtraCreditsEmail({ name, creditsAdded, expiryDate })),
  })
}

export async function sendMonthlyResetEmail(email: string, name: string, credits: number) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your 30 credits have been reset 🔄",
    html: await render(MonthlyResetEmail({ name, credits })),
  })
}

export async function sendRenewalReminderEmail(
  email: string,
  name: string,
  renewalDate: string,
  amount: string,
) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Pro subscription renews in 3 days",
    html: await render(RenewalReminderEmail({ name, renewalDate, amount })),
  })
}

export async function sendSubscriptionCancelledEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Pro subscription has been cancelled",
    html: await render(SubscriptionCancelledEmail({ name })),
  })
}
