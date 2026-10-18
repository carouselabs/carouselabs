import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"
import { PLATFORM_META, isValidPlatform } from "@/lib/platforms"

// Subject: "Your post is live"
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
    <EmailLayout hero="post-live" preview={`Your post just went out on ${platformLabel}.`}>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        Your scheduled post <strong style={emailStyles.strong}>&ldquo;{postTitle}&rdquo;</strong> is now live on{" "}
        {platformLabel}, right on time.
      </Text>
      <EmailButton href={publishedUrl || `${APP_URL}/content-hub`}>{publishedUrl ? "View the post" : "Open Content Hub"}</EmailButton>
      <Text style={emailStyles.muted}>
        You can turn these emails off any time in Settings &gt; Account &gt; Notifications.
      </Text>
    </EmailLayout>
  )
}
