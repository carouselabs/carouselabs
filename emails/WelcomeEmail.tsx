import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Welcome to CarouseLabs 🎨"
export function WelcomeEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview="Welcome to CarouseLabs — let's create your first post.">
      <Heading style={emailStyles.heading}>Welcome to CarouseLabs 🎨</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, welcome aboard! CarouseLabs turns your ideas into scroll-stopping
        LinkedIn posts — captions, single images, and full carousels — in minutes.
      </Text>
      <Text style={emailStyles.text}>Here&apos;s what you can do:</Text>
      <ul style={emailStyles.list}>
        <li>Generate 10 personalized post ideas in one click</li>
        <li>Turn any idea into a polished caption</li>
        <li>Create matching images and 7–8 slide carousels</li>
        <li>Download everything as a ready-to-post PDF</li>
      </ul>
      <EmailButton href={`${APP_URL}/dashboard`}>Start Creating</EmailButton>
    </EmailLayout>
  )
}
