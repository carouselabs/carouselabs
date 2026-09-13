import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"
import { PLATFORM_META, isValidPlatform } from "@/lib/platforms"

// Subject: "Your post just went out 🎉"
export function ScheduledPostPublishedEmail({
  name,
  postTitle,
  platform,
  publishedUrl,
}: {
  name?: string
  postTitle: string
  platform: string
  publishedUrl?: string
}) {
  const greeting = name?.trim() ? name : "there"
  const platformLabel = isValidPlatform(platform) ? PLATFORM_META[platform].label : platform

  return (
    <EmailLayout preview={`Your post just went out on ${platformLabel}.`}>
      <Heading style={emailStyles.heading}>Your post just went out 🎉</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, <strong>&quot;{postTitle}&quot;</strong> just published to {platformLabel}.
      </Text>
      <EmailButton href={publishedUrl || `${APP_URL}/content-hub`}>
        {publishedUrl ? "View the post" : "Open Content Hub"}
      </EmailButton>
      <Text style={emailStyles.muted}>
        You can turn these emails off anytime in Settings &gt; Account &gt; Notifications.
      </Text>
    </EmailLayout>
  )
}
