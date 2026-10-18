import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"
import { PLATFORM_META, isValidPlatform } from "@/lib/platforms"

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
  const platformLabel = isValidPlatform(platform) ? PLATFORM_META[platform].label : platform
  return (
    <EmailLayout hero="post-failed" preview={`Your scheduled post to ${platformLabel} didn't go out.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        We tried to publish one of your scheduled posts to {platformLabel}, but it didn&apos;t go through after three
        attempts.
      </Text>
      <EmailFacts
        items={[
          ["Post", postTitle],
          ["Platform", platformLabel],
          ["What went wrong", reason],
        ]}
      />
      <Text style={emailStyles.text}>
        Open the Content Hub to reschedule it, reconnect your account, or remove it from your queue.
      </Text>
      <EmailButton href={`${APP_URL}/content-hub`}>Review in Content Hub</EmailButton>
    </EmailLayout>
  )
}
