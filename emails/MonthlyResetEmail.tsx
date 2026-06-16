import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your 30 credits have been reset 🔄"
export function MonthlyResetEmail({ name, credits }: { name?: string; credits: number }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview={`A fresh ${credits} credits are ready for the new month.`}>
      <Heading style={emailStyles.heading}>Your credits are reset 🔄</Heading>
      <Text style={emailStyles.text}>
        Fresh month, {greeting}! Your <strong>{credits} monthly credits</strong> have been topped
        back up and are ready to use.
      </Text>
      <Text style={emailStyles.text}>
        New month, new content. Plan your posts for the weeks ahead and keep your LinkedIn presence
        growing.
      </Text>
      <EmailButton href={`${APP_URL}/dashboard`}>Start Creating</EmailButton>
    </EmailLayout>
  )
}
