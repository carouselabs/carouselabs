import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

const MAX_PREVIEW = 300

// Sent to ADMIN_EMAIL whenever an intern sends a new Support message — see
// app/api/intern/messages.
export function AdminNewSupportMessageEmail({
  internName,
  message,
  detailUrl,
}: {
  internName: string
  message: string
  detailUrl: string
}) {
  const preview = message.length > MAX_PREVIEW ? `${message.slice(0, MAX_PREVIEW)}…` : message

  return (
    <EmailLayout preview={`New support message from ${internName}`}>
      <Heading style={emailStyles.heading}>New support message</Heading>
      <Text style={emailStyles.text}>
        <strong>{internName}</strong> just sent a new message in Support:
      </Text>
      <Text style={{ ...emailStyles.text, fontStyle: "italic" }}>&ldquo;{preview}&rdquo;</Text>
      <EmailButton href={detailUrl}>Reply in Admin</EmailButton>
    </EmailLayout>
  )
}
