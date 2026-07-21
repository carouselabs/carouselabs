import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your Pro subscription renews in 3 days"
export function RenewalReminderEmail({
  name,
  renewalDate,
  amount,
  planName = "Pro",
}: {
  name?: string
  renewalDate: string
  amount: string
  planName?: "Pro" | "Growth"
}) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview={`Your ${planName} plan renews on ${renewalDate}.`}>
      <Heading style={emailStyles.heading}>Your {planName} plan renews soon</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, this is a friendly reminder that your CarouseLabs {planName} subscription
        renews in 3 days.
      </Text>
      <ul style={emailStyles.list}>
        <li>
          <strong>Renewal date:</strong> {renewalDate}
        </li>
        <li>
          <strong>Amount:</strong> {amount}
        </li>
      </ul>
      <Text style={emailStyles.text}>
        No action is needed — your plan and monthly credits will continue automatically. You can
        review or change your subscription any time.
      </Text>
      <EmailButton href={`${APP_URL}/settings`}>Manage Subscription</EmailButton>
    </EmailLayout>
  )
}
