import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
}

// Subject: "A scheduled post didn't publish"
export function ScheduledPostFailedEmail({
  name,
  postTitle,
  platform,
  reason,
}: {
  name?: string
  postTitle: string
  platform: string
  reason: string
}) {
  const greeting = name?.trim() ? name : "there"
  const platformLabel = PLATFORM_LABELS[platform] ?? platform

  return (
    <EmailLayout preview={`Your scheduled post to ${platformLabel} didn't go out.`}>
      <Heading style={emailStyles.heading}>A scheduled post didn&apos;t publish</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, we tried to publish <strong>&quot;{postTitle}&quot;</strong> to {platformLabel}{" "}
        but it failed after 3 attempts.
      </Text>
      <Text style={emailStyles.text}>Reason: {reason}</Text>
      <EmailButton href={`${APP_URL}/content-hub`}>Review in Content Hub</EmailButton>
      <Text style={emailStyles.muted}>
        You can reschedule it, fix the connection, or discard it from your queue.
      </Text>
    </EmailLayout>
  )
}
