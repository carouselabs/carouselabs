import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your extra credits are ready" (or, for a purchased top-up,
// "500 credits added to your account" — see lib/email.ts sendTopUpEmail)
export function ExtraCreditsEmail({
  name,
  creditsAdded,
  expiryDate,
}: {
  name?: string
  creditsAdded: number
  expiryDate: string
}) {
  const greeting = name?.trim() ? name : "there"
  const added = creditsAdded.toLocaleString("en-US")
  return (
    <EmailLayout hero="credits-added" preview={`${added} extra credits are in your account and ready to use.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        We&apos;ve added <strong style={emailStyles.strong}>{added} credits</strong> to your account. They&apos;re ready to
        use now, on captions, images or carousels.
      </Text>
      <EmailFacts
        items={[
          ["Credits added", added],
          ["Use them by", expiryDate],
        ]}
      />
      <EmailButton href={`${APP_URL}/dashboard`}>Start creating</EmailButton>
    </EmailLayout>
  )
}
