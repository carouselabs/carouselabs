import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You have 100 credits left this cycle"
// Sent to paid plans when the balance drops to 100 credits or fewer
// (lib/chargeCredits.ts).
export function CreditsLowEmail({ name, creditsLeft }: { name?: string; creditsLeft: number }) {
  const greeting = name?.trim() ? name : "there"
  const left = creditsLeft.toLocaleString("en-US")
  return (
    <EmailLayout hero="credits-low" preview={`You have ${left} credits left in this billing cycle.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        A quick heads-up: you have <strong style={emailStyles.strong}>{left} credits</strong> left in this billing cycle.
        Here&apos;s what that covers:
      </Text>
      <EmailFacts
        items={[
          ["Caption", "5 credits"],
          ["Image + caption", "15 credits"],
          ["Carousel", "40 credits"],
        ]}
      />
      <Text style={emailStyles.text}>
        If you need more before your plan refills, add a credit top-up. It lands in your balance straight away, so nothing
        you&apos;re working on gets interrupted.
      </Text>
      <EmailButton href={`${APP_URL}/settings/billing`}>Top up credits</EmailButton>
      <Text style={emailStyles.muted}>Your monthly credits refill automatically at the start of your next billing cycle.</Text>
    </EmailLayout>
  )
}
