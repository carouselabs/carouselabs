import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Welcome to Pro! You have 30 credits ready 🚀"
export function UpgradedToProEmail({
  name,
  credits,
  planName = "Pro",
}: {
  name?: string
  credits: number
  planName?: "Pro" | "Growth"
}) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview={`Welcome to ${planName} — ${credits} credits are ready to use.`}>
      <Heading style={emailStyles.heading}>Welcome to {planName} 🚀</Heading>
      <Text style={emailStyles.text}>
        You&apos;re in, {greeting}! Your {planName} plan is active and{" "}
        <strong>{credits} credits</strong> are ready to use right now.
      </Text>
      <Text style={emailStyles.text}>With {planName} you get:</Text>
      <ul style={emailStyles.list}>
        <li>{credits} content credits every month</li>
        <li>Unlimited post idea generation</li>
        <li>Full image + carousel generation</li>
        <li>PDF downloads for every carousel</li>
      </ul>
      <Text style={emailStyles.text}>
        Each credit creates one piece of content — a caption, an image, or a carousel. Credits
        refresh at the start of every billing cycle.
      </Text>
      <EmailButton href={`${APP_URL}/dashboard`}>Start Creating</EmailButton>
    </EmailLayout>
  )
}
