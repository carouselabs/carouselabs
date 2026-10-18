import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your 1,000 credits are ready for a new month"
// Sent when a paid plan renews and its credits refill.
export function MonthlyResetEmail({ name, credits }: { name?: string; credits: number }) {
  const greeting = name?.trim() ? name : "there"
  const amount = credits.toLocaleString("en-US")
  return (
    <EmailLayout hero="reset" preview={`A fresh ${amount} credits are ready for the month ahead.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        Your plan has renewed and your balance is full again: <strong style={emailStyles.strong}>{amount} credits</strong>{" "}
        for the month ahead.
      </Text>
      <Text style={emailStyles.text}>
        The best months start with a plan. Open the Content Hub, line up your next few posts on the calendar, and let
        CarouseLabs handle the writing and design.
      </Text>
      <EmailButton href={`${APP_URL}/content-hub`}>Plan this month</EmailButton>
      <Text style={emailStyles.muted}>Unused credits don&apos;t roll over, so make the most of this cycle.</Text>
    </EmailLayout>
  )
}
