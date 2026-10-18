import * as React from "react"
import { Text } from "@react-email/components"
import { EmailButton, EmailFacts, EmailLayout, EmailSteps, emailStyles } from "./EmailLayout"

// Subject: "Welcome to CarouseLabs, [name]"
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
    <EmailLayout audience="intern" hero="intern-welcome" preview={`Welcome to CarouseLabs, ${name}. Here's how your first days work.`}>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        Welcome to CarouseLabs. We&apos;re glad to have you on the team{role ? ` as our ${role}` : ""}, and we&apos;re looking
        forward to what you&apos;ll make here.
      </Text>
      <EmailFacts
        items={[
          ...(role ? [["Your role", role] as [string, string]] : []),
          ["Start date", joinDate],
          ["Leave for your internship", `${leaveAllowance} day${leaveAllowance === 1 ? "" : "s"}`],
        ]}
      />
      <Text style={emailStyles.label}>How it works</Text>
      <EmailSteps
        steps={[
          <>
            Sign in to your intern portal with <strong style={emailStyles.strong}>{email}</strong>.
          </>,
          "Check the portal each day. Your admin assigns your tasks there.",
          "Log your attendance and watch your points grow as you complete tasks.",
        ]}
      />
      <EmailButton href={loginUrl}>Open your intern portal</EmailButton>
      <Text style={emailStyles.muted}>
        Sign in with exactly {email}. Other addresses won&apos;t have access to your portal.
      </Text>
    </EmailLayout>
  )
}
