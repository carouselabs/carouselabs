// lib/email.ts
import { Resend } from "resend"
import { render } from "@react-email/render"
import { db } from "@/lib/db"
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
import { InternWelcomeEmail } from "@/emails/InternWelcomeEmail"
import { InternWeeklyDigestEmail, type InternDigestRow } from "@/emails/InternWeeklyDigestEmail"
import { InternDailySummaryEmail, type DailySummaryTask } from "@/emails/InternDailySummaryEmail"
import { InternAbsentWarningEmail } from "@/emails/InternAbsentWarningEmail"
import { InternBroadcastEmail } from "@/emails/InternBroadcastEmail"
import { ScheduledPostFailedEmail } from "@/emails/ScheduledPostFailedEmail"

const resend = new Resend(process.env.RESEND_API_KEY)

// Verified domain sender (carouselabs.com is verified in Resend).
const FROM = "CarouseLabs <support@carouselabs.com>"

export async function sendWelcomeEmail(email: string, name: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to CarouseLabs 🎨",
    html: await render(WelcomeEmail({ name })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendOnboardingCompleteEmail(email: string, name: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're all set! Let's create your first post",
    html: await render(OnboardingCompleteEmail({ name })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendFirstPostEmail(email: string, name: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You just created your first post 🎉",
    html: await render(FirstPostEmail({ name })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendUpgradedToProEmail(
  email: string,
  name: string,
  credits: number,
  planName: "Pro" | "Growth" = "Pro",
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Welcome to ${planName}! You have ${credits} credits ready 🚀`,
    html: await render(UpgradedToProEmail({ name, credits, planName })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendCreditsLowEmail(email: string, name: string, creditsLeft: number) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `You have ${creditsLeft} credits left this month ⚠️`,
    html: await render(CreditsLowEmail({ name, creditsLeft })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendScheduledPostFailedEmail(
  email: string,
  name: string,
  postTitle: string,
  platform: string,
  reason: string,
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "A scheduled post didn't publish",
    html: await render(ScheduledPostFailedEmail({ name, postTitle, platform, reason })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendCreditsExhaustedEmail(email: string, name: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You've used all your credits for this month 🔴",
    html: await render(CreditsExhaustedEmail({ name })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendExtraCreditsEmail(
  email: string,
  name: string,
  creditsAdded: number,
  expiryDate: string,
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your extra credits are ready! ✅",
    html: await render(ExtraCreditsEmail({ name, creditsAdded, expiryDate })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

// Purchased credit top-up confirmation. Reuses the ExtraCreditsEmail template
// (same content: credits added + expiry + CTA) with a purchase-specific subject.
export async function sendTopUpEmail(
  email: string,
  name: string,
  credits: number,
  expiry: Date,
) {
  const expiryDate = expiry.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${credits} credits added to your account! 🎉`,
    html: await render(ExtraCreditsEmail({ name, creditsAdded: credits, expiryDate })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendMonthlyResetEmail(email: string, name: string, credits: number) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${credits} credits have been reset 🔄`,
    html: await render(MonthlyResetEmail({ name, credits })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendRenewalReminderEmail(
  email: string,
  name: string,
  renewalDate: string,
  amount: string,
  planName: "Pro" | "Growth" = "Pro",
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${planName} subscription renews in 3 days`,
    html: await render(RenewalReminderEmail({ name, renewalDate, amount, planName })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendSubscriptionCancelledEmail(
  email: string,
  name: string,
  planName: "Pro" | "Growth" = "Pro",
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${planName} subscription has been cancelled`,
    html: await render(SubscriptionCancelledEmail({ name, planName })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendInternWelcomeEmail(
  email: string,
  name: string,
  role: string | null,
  joinDate: string,
  leaveAllowance: number,
  loginUrl: string,
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Welcome to CarouseLabs, ${name}! 🎉`,
    html: await render(InternWelcomeEmail({ name, role, joinDate, leaveAllowance, loginUrl, email })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendInternWeeklyDigestEmail(
  adminEmail: string,
  weekLabel: string,
  interns: InternDigestRow[],
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Intern Weekly Digest — ${weekLabel}`,
    html: await render(InternWeeklyDigestEmail({ weekLabel, interns })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

// Sent right after an admin submits a Daily Checklist marking the intern
// present/half-day for that day — see app/api/admin/interns/[id]/checklist.
export async function sendInternDailySummaryEmail(
  email: string,
  name: string,
  date: string,
  tasksCompleted: DailySummaryTask[],
  pointsToday: number,
  totalPoints: number,
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your summary for ${date} 📋`,
    html: await render(
      InternDailySummaryEmail({ name, date, tasksCompleted, pointsToday, totalPoints }),
    ),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

// Sent right after an admin marks the intern absent in the Daily Checklist —
// see app/api/admin/interns/[id]/checklist. Skipped when the day is an
// approved self-service leave instead of a genuine unplanned absence.
export async function sendInternAbsentWarningEmail(
  email: string,
  name: string,
  date: string,
  presentDays: number,
  absentDays: number,
  attendanceRate: number,
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Attendance notice — ${date}`,
    html: await render(
      InternAbsentWarningEmail({ name, date, presentDays, absentDays, attendanceRate }),
    ),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

// Admin-authored announcement sent to one intern — see
// app/api/admin/interns/broadcast, which loops this over the recipient list.
export async function sendInternBroadcastEmail(
  email: string,
  name: string,
  subject: string,
  body: string,
) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: await render(InternBroadcastEmail({ name, subject, body })),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

// Sends the celebratory "first post" email only when the post just created is
// this user's first ever (db.post.count === 1). Call right AFTER db.post.create.
// Best-effort: callers should swallow errors so email never breaks post saving.
export async function notifyFirstPostIfFirst(userId: string, email: string, name: string) {
  const count = await db.post.count({ where: { userId } })
  if (count === 1) {
    await sendFirstPostEmail(email, name)
  }
}
