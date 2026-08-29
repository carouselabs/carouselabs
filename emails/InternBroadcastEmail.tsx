import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

// Subject and body are admin-authored per send (see InternBroadcastComposer)
// rather than fixed at build time like the other intern templates.
export function InternBroadcastEmail({
  name,
  subject,
  body,
}: {
  name: string
  subject: string
  body: string
}) {
  const greeting = name.trim() ? name : "there"
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <EmailLayout preview={subject}>
      <Heading style={emailStyles.heading}>{subject}</Heading>
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      {paragraphs.map((paragraph, i) => (
        <Text key={i} style={emailStyles.text}>
          {paragraph.split("\n").map((line, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </Text>
      ))}
      <EmailButton href={EMPLOYEE_URL}>Go to Your Portal</EmailButton>
    </EmailLayout>
  )
}
