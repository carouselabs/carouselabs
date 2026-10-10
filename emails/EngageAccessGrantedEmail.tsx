import * as React from "react"
import { Heading, Section, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

export type GrantedExtensions = "linkedin" | "x" | "both"

const NAMES = {
  linkedin: "CarouseLabs Engage",
  x: "CarouseLabs Engage for X",
  both: "CarouseLabs Engage for LinkedIn and X",
}

export const engageAccessGrantedSubject = (platform: GrantedExtensions) => `You've got ${NAMES[platform]}`

// Subject: engageAccessGrantedSubject(platform)
// Sent when an admin gives someone Engage access and ticks "Send invitation":
// for LinkedIn, X, or both — two separate extensions, each with its own
// Chrome Web Store link.
export function EngageAccessGrantedEmail({
  until,
  platform = "linkedin",
  storeUrls,
}: {
  // Formatted end date, or null for lifetime access.
  until: string | null
  platform?: GrantedExtensions
  storeUrls: { linkedin: string | null; x: string | null }
}) {
  const what =
    platform === "x"
      ? "It writes X replies and messages in your own voice, and you post every one yourself."
      : platform === "both"
        ? "They write LinkedIn comments, replies, connection notes and messages, and X replies and messages, in your own voice. You post every one yourself."
        : "It writes LinkedIn comments, replies, connection notes and messages in your own voice, and you post every one yourself."
  const linkedin = storeUrls.linkedin ?? `${APP_URL}/extension`
  const x = storeUrls.x ?? `${APP_URL}/extension/x`

  return (
    <EmailLayout preview={`You've been given ${NAMES[platform]} access.`}>
      <Heading style={emailStyles.heading}>You&apos;ve got {NAMES[platform]}</Heading>
      <Text style={emailStyles.text}>
        You&apos;ve been given unlimited access to {NAMES[platform]},{" "}
        {until ? (
          <>
            until <strong>{until}</strong>
          </>
        ) : (
          <strong>for life</strong>
        )}
        . {what}
      </Text>
      <Text style={emailStyles.text}>
        {platform === "both"
          ? "They're two separate Chrome extensions. Install the ones you'll use, then sign in with this email address. Your access is already waiting."
          : "Install the Chrome extension, then sign in with this email address. Your access is already waiting."}
      </Text>
      {platform === "both" ? (
        <>
          <Section style={{ marginBottom: "12px" }}>
            <EmailButton href={linkedin}>Get Engage for LinkedIn</EmailButton>
          </Section>
          <EmailButton href={x}>Get Engage for X</EmailButton>
        </>
      ) : (
        <EmailButton href={platform === "x" ? x : linkedin}>Get the extension</EmailButton>
      )}
    </EmailLayout>
  )
}
