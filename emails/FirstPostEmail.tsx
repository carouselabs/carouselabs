import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Your first post is done"
export function FirstPostEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout hero="first-post" preview="The first post is the hardest one. Here's how to keep the momentum.">
      <Text style={emailStyles.text}>Congratulations, {greeting}.</Text>
      <Text style={emailStyles.text}>
        Your first post is done, and the first one is always the hardest. What grows an audience from here is showing up
        consistently.
      </Text>
      <Text style={emailStyles.text}>
        If you&apos;re ready to post every day, Pro and Growth add carousels, one-click LinkedIn posting, voice guidelines and
        fresh trending ideas daily.
      </Text>
      <EmailFacts
        items={[
          ["Pro", "1,000 credits a month · $24.99"],
          ["Growth", "2,000 credits a month · $45.99"],
        ]}
      />
      <EmailButton href={`${APP_URL}/settings/billing`}>Compare plans</EmailButton>
    </EmailLayout>
  )
}
