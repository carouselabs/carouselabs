import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailFeatures, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Welcome to Pro. Your 1,000 credits are ready"
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
  const amount = credits.toLocaleString("en-US")
  return (
    <EmailLayout hero="upgraded" preview={`Your ${planName} plan is active, with ${amount} credits ready to use.`}>
      <Text style={emailStyles.text}>Welcome to {planName}, {greeting}.</Text>
      <Text style={emailStyles.text}>
        Your plan is active and <strong style={emailStyles.strong}>{amount} credits</strong> are in your account, ready to
        use right now. Thank you for backing CarouseLabs.
      </Text>
      <Text style={emailStyles.label}>What&apos;s unlocked</Text>
      <EmailFeatures
        items={[
          { sticker: "carousel", title: "Carousels", text: "Turn any idea into a 7–8 slide carousel, downloadable as a PDF." },
          { sticker: "publish", title: "One-click LinkedIn posting", text: "Publish straight to LinkedIn without leaving CarouseLabs." },
          { sticker: "voice", title: "Voice guidelines", text: "Set your tone once, and every caption follows it." },
          { sticker: "idea", title: "Trending ideas, daily", text: "Fresh post ideas based on what's working right now." },
        ]}
      />
      <Text style={emailStyles.label}>What credits buy</Text>
      <EmailFacts
        items={[
          ["Caption", "5 credits"],
          ["Image + caption", "15 credits"],
          ["Carousel", "40 credits"],
        ]}
      />
      <EmailButton href={`${APP_URL}/dashboard`}>Start creating</EmailButton>
      <Text style={emailStyles.muted}>
        Your credits refill at the start of every billing cycle. Unused credits don&apos;t roll over.
      </Text>
    </EmailLayout>
  )
}
