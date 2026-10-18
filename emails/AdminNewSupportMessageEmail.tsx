import * as React from "react"
import { Text } from "@react-email/components"
import { EmailButton, EmailLayout, EmailPanel, emailStyles } from "./EmailLayout"
import { SERIF } from "./theme"

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
    <EmailLayout audience="admin" hero="support-message" preview={`New support message from ${internName}`}>
      <Text style={emailStyles.text}>
        <strong>{internName}</strong> sent a new message in Support:
      </Text>
      <EmailPanel>
        <Text style={{ ...emailStyles.text, fontFamily: SERIF, fontSize: "17px", fontStyle: "italic" }}>&ldquo;{preview}&rdquo;</Text>
      </EmailPanel>
      <EmailButton href={detailUrl}>Reply in admin</EmailButton>
    </EmailLayout>
  )
}
