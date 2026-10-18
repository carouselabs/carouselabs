import * as React from "react"
import { Text } from "@react-email/components"
import { EmailFacts, EmailLayout, EmailPanel, emailStyles } from "./EmailLayout"

// Subject: "[CarouseLabs Contact] [subject] from [name]"
// Sent to the support inbox for every contact-form message (app/api/contact).
// Replying answers the sender: the route sets their address as Reply-To.
export function ContactMessageEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string
  email: string
  subject: string
  message: string
}) {
  return (
    <EmailLayout audience="admin" hero="contact" preview={`${name}: ${subject}`}>
      <Text style={emailStyles.text}>A new message came in through the contact form on carouselabs.com.</Text>
      <EmailFacts
        items={[
          ["Name", name],
          ["Email", email],
          ["Subject", subject],
        ]}
      />
      <EmailPanel>
        <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>{message}</Text>
      </EmailPanel>
      <Text style={emailStyles.muted}>Reply to this email to answer {name} directly.</Text>
    </EmailLayout>
  )
}
