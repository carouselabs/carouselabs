import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your extra credits are ready! ✅"
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
  return (
    <EmailLayout preview={`${creditsAdded} extra credits have been added to your account.`}>
      <Heading style={emailStyles.heading}>Your extra credits are ready ✅</Heading>
      <Text style={emailStyles.text}>
        All set, {greeting}! We&apos;ve added <strong>{creditsAdded} extra credits</strong> to your
        account — they&apos;re available to use immediately.
      </Text>
      <Text style={emailStyles.text}>
        These credits are valid until <strong>{expiryDate}</strong>, so put them to good use before
        then.
      </Text>
      <EmailButton href={`${APP_URL}/dashboard`}>Start Creating</EmailButton>
    </EmailLayout>
  )
}
