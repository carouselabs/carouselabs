import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, EmailPanel, EmailSteps, emailStyles } from "./EmailLayout"

// Subject: "You've used all your credits for this cycle"
// Sent to paid plans when the balance reaches zero (lib/chargeCredits.ts).
export function CreditsExhaustedEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout hero="credits-out" preview="You've used every credit this cycle. Here's how to keep going.">
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        You&apos;ve used every credit in this billing cycle. That&apos;s a productive month, and there are two ways to keep
        going:
      </Text>
      <EmailPanel>
        <EmailSteps
          steps={[
            <>
              <strong style={emailStyles.strong}>Top up now.</strong> Extra credits are added to your balance straight away.
            </>,
            <>
              <strong style={emailStyles.strong}>Or wait for your refill.</strong> Your monthly credits come back
              automatically at the start of your next billing cycle.
            </>,
          ]}
        />
      </EmailPanel>
      <EmailButton href={`${APP_URL}/settings/billing`}>Top up credits</EmailButton>
    </EmailLayout>
  )
}
