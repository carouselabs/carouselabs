import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your Pro subscription has been cancelled"
export function SubscriptionCancelledEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview="Your Pro subscription has been cancelled.">
      <Heading style={emailStyles.heading}>Your Pro subscription is cancelled</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, we&apos;ve cancelled your CarouseLabs Pro subscription as requested. We&apos;re
        sorry to see you go.
      </Text>
      <Text style={emailStyles.text}>What changes:</Text>
      <ul style={emailStyles.list}>
        <li>You&apos;ll keep Pro access and any remaining credits until the end of your current billing period</li>
        <li>After that, your account moves to the Free plan</li>
        <li>Unused monthly credits expire when the period ends</li>
      </ul>
      <Text style={emailStyles.text}>
        Changed your mind? You can reactivate Pro any time and pick up right where you left off.
      </Text>
      <EmailButton href={`${APP_URL}/settings`}>Reactivate Pro</EmailButton>
    </EmailLayout>
  )
}
