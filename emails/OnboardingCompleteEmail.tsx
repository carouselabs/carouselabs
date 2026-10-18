import * as React from "react"
import { Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, EmailSteps, emailStyles } from "./EmailLayout"

// Subject: "You're all set. Let's make your first post"
// Sent when someone finishes their profile during onboarding.
export function OnboardingCompleteEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout hero="ready" preview="CarouseLabs now knows your niche, your audience and your voice.">
      <Text style={emailStyles.text}>Nice work, {greeting}.</Text>
      <Text style={emailStyles.text}>
        Your profile is complete, so CarouseLabs now knows your niche, your audience and how you like to sound. Every idea and
        caption from here on is shaped by it.
      </Text>
      <Text style={emailStyles.label}>Your next three steps</Text>
      <EmailSteps
        steps={[
          "Open your dashboard and generate your first set of ideas.",
          "Pick the one you like best and turn it into a caption, an image or a carousel.",
          "Download it and post it, or on Pro, publish it straight to LinkedIn.",
        ]}
      />
      <EmailButton href={`${APP_URL}/dashboard`}>Generate ideas</EmailButton>
      <Text style={emailStyles.muted}>You can change your profile any time in Settings.</Text>
    </EmailLayout>
  )
}
