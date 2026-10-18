import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailFeatures, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Welcome to CarouseLabs"
// Sent when someone signs up (Free plan: 25 lifetime credits).
export function WelcomeEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout hero="welcome" preview="Turn one idea into captions, images and carousels that sound like you.">
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        Thanks for joining CarouseLabs. You bring the ideas; we turn them into captions, images and carousels that sound like
        you, in minutes instead of an afternoon.
      </Text>
      <Text style={emailStyles.label}>Where to start</Text>
      <EmailFeatures
        items={[
          { sticker: "idea", title: "Get post ideas", text: "Ten ideas shaped around your niche and audience, in one click." },
          { sticker: "caption", title: "Write the caption", text: "Turn any idea into a polished caption for the platform you post on." },
          { sticker: "image", title: "Add an image", text: "Generate an image made for the post, so it stops the scroll." },
          { sticker: "carousel", title: "Build a carousel", text: "7–8 slides from a single idea, ready as a PDF. Included with Pro and Growth." },
        ]}
      />
      <Text style={emailStyles.label}>Your free plan</Text>
      <EmailFacts
        items={[
          ["Credits to start", "25"],
          ["Caption", "5 credits"],
          ["Image + caption", "15 credits"],
        ]}
      />
      <EmailButton href={`${APP_URL}/dashboard`}>Open your dashboard</EmailButton>
      <Text style={emailStyles.muted}>Questions? Reply to this email. A real person on our team reads every one.</Text>
    </EmailLayout>
  )
}
