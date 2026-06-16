import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You've used all your credits for this month 🔴"
export function CreditsExhaustedEmail({ name }: { name?: string }) {
  const greeting = name?.trim() ? name : "there"
  return (
    <EmailLayout preview="You're out of credits — here's how to keep creating.">
      <Heading style={emailStyles.heading}>You&apos;re out of credits 🔴</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, you&apos;ve used all your credits for this month. Nice work staying
        consistent!
      </Text>
      <Text style={emailStyles.text}>You have two options:</Text>
      <ul style={emailStyles.list}>
        <li>Buy extra credits to keep creating right now</li>
        <li>Wait for your monthly credits to reset on your next billing date</li>
      </ul>
      <EmailButton href={`${APP_URL}/settings`}>Buy Extra Credits</EmailButton>
    </EmailLayout>
  )
}
