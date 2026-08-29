import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Sent to the intern whenever admin replies in Support — see
// app/api/admin/interns/[id]/messages.
export function InternSupportReplyEmail({ name }: { name: string }) {
  const greeting = name.trim() ? name : "there"
  return (
    <EmailLayout preview="You have a new reply from Support">
      <Heading style={emailStyles.heading}>You have a new reply from Support</Heading>
      <Text style={emailStyles.text}>
        Hi {greeting}, we&apos;ve replied to your message in Support.
      </Text>
      <EmailButton href={EMPLOYEE_URL}>View Reply</EmailButton>
    </EmailLayout>
  )
}
