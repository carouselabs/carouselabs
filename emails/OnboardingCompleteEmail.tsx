import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You're all set! Let's create your first post"
export function OnboardingCompleteEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview="Your profile is ready — let's generate your first ideas.">
      <Heading style={emailStyles.heading}>You&apos;re all set ✅</Heading>
      <Text style={emailStyles.text}>
        Nice work, {greeting} — your profile is complete. CarouseLabs now knows your niche,
        audience, and voice, so every idea and caption will sound like you.
      </Text>
      <Text style={emailStyles.text}>Next steps:</Text>
      <ul style={emailStyles.list}>
        <li>Generate 10 fresh post ideas tailored to your niche</li>
        <li>Pick one and turn it into a caption, image, or carousel</li>
        <li>Post it to LinkedIn and watch the engagement come in</li>
      </ul>
      <EmailButton href={`${APP_URL}/dashboard`}>Generate Ideas</EmailButton>
    </EmailLayout>
  )
}
