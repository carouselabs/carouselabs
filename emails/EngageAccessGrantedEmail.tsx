import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You've got CarouseLabs Engage"
// Sent when an admin gives someone Engage access and ticks "Send invitation".
export function EngageAccessGrantedEmail({
  until,
  storeUrl,
}: {
  // Formatted end date, or null for lifetime access.
  until: string | null
  storeUrl: string | null
}) {
  return (
    <EmailLayout preview="You've been given CarouseLabs Engage access.">
      <Heading style={emailStyles.heading}>You&apos;ve got CarouseLabs Engage</Heading>
      <Text style={emailStyles.text}>
        You&apos;ve been given unlimited access to CarouseLabs Engage,{" "}
        {until ? (
          <>
            until <strong>{until}</strong>
          </>
        ) : (
          <strong>for life</strong>
        )}
        . It writes LinkedIn comments, replies, connection notes and messages in your own voice, and you post
        every one yourself.
      </Text>
      <Text style={emailStyles.text}>
        Install the Chrome extension, then sign in with this email address. Your access is already waiting.
      </Text>
      <EmailButton href={storeUrl ?? `${APP_URL}/extension`}>Get the extension</EmailButton>
    </EmailLayout>
  )
}
