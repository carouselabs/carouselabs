import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Welcome to CarouseLabs, [name]! 🎉"
export function InternWelcomeEmail({
  name,
  role,
  joinDate,
  leaveAllowance,
  loginUrl,
  email,
}: {
  name: string
  role: string | null
  joinDate: string
  leaveAllowance: number
  loginUrl: string
  email: string
}) {
  return (
    <EmailLayout preview={`Welcome to CarouseLabs, ${name}! Here's how to get started.`}>
      <Heading style={emailStyles.heading}>Welcome to CarouseLabs, {name}!</Heading>
      <Text style={emailStyles.text}>
        We&apos;re excited to have you on the team{role ? ` as our ${role}` : ""}. Here&apos;s what you need
        to know to get started:
      </Text>
      <ul style={emailStyles.list}>
        {role && <li>Your role: {role}</li>}
        <li>Start date: {joinDate}</li>
        <li>
          You have {leaveAllowance} leave day{leaveAllowance === 1 ? "" : "s"} for your internship
        </li>
      </ul>
      <Text style={emailStyles.text}>
        Your admin will assign daily tasks. Check your portal daily to see your points and log your
        attendance.
      </Text>
      <EmailButton href={loginUrl}>Sign in to your intern portal</EmailButton>
      <Text style={emailStyles.muted}>
        Sign in with <strong>{email}</strong> — this must be the exact email address to access your portal.
      </Text>
    </EmailLayout>
  )
}
