import * as React from "react"
import { Text } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "You have a new reply from Support"
// Sent to the intern whenever admin replies in Support — see
// app/api/admin/interns/[id]/messages.
export function InternSupportReplyEmail({ name }: { name: string }) {
  const greeting = name.trim() ? name : "there"
  return (
    <EmailLayout audience="intern" hero="support-reply" preview="The team has replied to your message in Support.">
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>
        The team has replied to your message in Support. Open your portal to read it and continue the conversation.
      </Text>
      <EmailButton href={EMPLOYEE_URL}>Read the reply</EmailButton>
    </EmailLayout>
  )
}
