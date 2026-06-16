import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You have 5 credits left this month ⚠️"
export function CreditsLowEmail({ name, creditsLeft }: { name?: string; creditsLeft: number }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview={`Heads up — only ${creditsLeft} credits left this month.`}>
      <Heading style={emailStyles.heading}>Running low on credits ⚠️</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, just a heads up — you have <strong>{creditsLeft} credits</strong> left for
        this month.
      </Text>
      <Text style={emailStyles.text}>
        Don&apos;t let your posting streak stop. You can grab extra credits any time — they top up
        your balance instantly and never interrupt your flow.
      </Text>
      <EmailButton href={`${APP_URL}/settings`}>Buy Extra Credits</EmailButton>
      <Text style={emailStyles.muted}>
        Your monthly credits also reset automatically at the start of your next billing cycle.
      </Text>
    </EmailLayout>
  )
}
