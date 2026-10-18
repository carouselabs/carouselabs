import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, EmailPanel, EmailSteps, emailStyles } from "./EmailLayout"

// Subject: "Your Pro subscription has been cancelled"
// Sent when a cancellation starts; the plan stays active until the period ends
// (app/api/webhooks/lemonsqueezy, subscription_cancelled).
export function SubscriptionCancelledEmail({
  name,
  planName = "Pro",
}: {
  name?: string
  planName?: "Pro" | "Growth"
}) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout hero="cancelled" preview={`Your ${planName} subscription is cancelled. Here's what happens next.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        We&apos;ve cancelled your CarouseLabs {planName} subscription, as you asked. We&apos;re sorry to see you go. Here&apos;s
        what happens next:
      </Text>
      <EmailPanel>
        <EmailSteps
          steps={[
            `You keep ${planName} and your remaining credits until the end of this billing period.`,
            "After that, your account moves to the Free plan, and unused monthly credits expire.",
            "Everything you've created stays in your account.",
          ]}
        />
      </EmailPanel>
      <Text style={emailStyles.text}>
        Changed your mind? You can reactivate {planName} at any time and pick up exactly where you left off.
      </Text>
      <EmailButton href={`${APP_URL}/settings/billing`}>Reactivate {planName}</EmailButton>
      <Text style={emailStyles.muted}>If something wasn&apos;t right, reply to this email. We read every message.</Text>
    </EmailLayout>
  )
}
