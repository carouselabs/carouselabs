import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You just created your first post 🎉"
export function FirstPostEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview="Congrats on your first post — here's how to do more.">
      <Heading style={emailStyles.heading}>You just created your first post 🎉</Heading>
      <Text style={emailStyles.text}>
        Congrats, {greeting} — your first piece of content is done! This is the start of a
        consistent, standout presence on LinkedIn.
      </Text>
      <Text style={emailStyles.text}>
        Ready to go further? Upgrade to <strong>Pro</strong> for 30 monthly credits, unlimited
        ideas, and full carousel generation — everything you need to post every single day.
      </Text>
      <EmailButton href={`${APP_URL}/settings`}>Upgrade to Pro</EmailButton>
    </EmailLayout>
  )
}
