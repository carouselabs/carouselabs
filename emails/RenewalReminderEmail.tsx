import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"

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
    <EmailLayout hero="renewal" preview={`Your ${planName} plan renews on ${renewalDate}.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        This is a reminder that your CarouseLabs {planName} plan renews in three days. Here are the details:
      </Text>
      <EmailFacts
        items={[
          ["Plan", planName],
          ["Renewal date", renewalDate],
          ["Amount", amount],
        ]}
      />
      <Text style={emailStyles.text}>
        You don&apos;t need to do anything. Your plan and monthly credits continue automatically. If you&apos;d like to
        change or cancel, you can do it from Billing before the renewal date.
      </Text>
      <EmailButton href={`${APP_URL}/settings/billing`}>Manage subscription</EmailButton>
    </EmailLayout>
  )
}
