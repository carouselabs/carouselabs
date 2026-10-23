import * as React from "react"
import { Heading, Section, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailCard, EmailFeatures, EmailLayout, EmailPanel, EmailSteps, emailStyles } from "./EmailLayout"
import type { EmailSticker } from "./art"
import { GRANT_COVERS, type GrantPlatform } from "@/lib/engage/grants"
import type { EngagePlatform } from "@/lib/engage/features"

export type GrantedExtensions = GrantPlatform

// Each extension's button, and its page on the website when it has no store
// listing yet.
const GET_LABELS: Record<EngagePlatform, string> = {
  linkedin: "Get Engage for LinkedIn",
  x: "Get Engage for X",
  reddit: "Get Engage for Reddit",
}
const WEBSITE_PAGES: Record<EngagePlatform, string> = { linkedin: "/extension", x: "/extension/x", reddit: "/extension/reddit" }

const NAMES: Record<GrantedExtensions, string> = {
  linkedin: "CarouseLabs Engage",
  x: "CarouseLabs Engage for X",
  reddit: "CarouseLabs Engage for Reddit",
  both: "CarouseLabs Engage for LinkedIn and X",
}

export const engageAccessGrantedSubject = (platform: GrantedExtensions) =>
  `Your profile qualified: free, unlimited ${NAMES[platform]}`

// Subject: engageAccessGrantedSubject(platform)
// Sent when an admin gives someone Engage access and ticks "Send invitation":
// for LinkedIn, X, or both — two separate extensions, each with its own
// Chrome Web Store link. Opens with a painted hero that carries the headline
// (art made with gpt-image-2), then a "what you get" card and setup steps.

type Feature = { sticker: EmailSticker; title: string; text: string }

const FEATURES: Record<GrantedExtensions, Feature[]> = {
  linkedin: [
    {
      sticker: "comment",
      title: "Comments that sound like you",
      text: "Generate a thoughtful comment on any post in seconds. Train the AI on your own writing, so it comments in your tone and your language.",
    },
    {
      sticker: "note",
      title: "Connection notes that get accepted",
      text: "Write a personal note for every connection request, based on their profile, so more of your requests get accepted.",
    },
    {
      sticker: "chat",
      title: "An assistant for your messages",
      text: "Train an AI agent to chat with your clients and leads in your voice. It drafts every reply; you choose what gets sent.",
    },
    {
      sticker: "shield",
      title: "Free, and safe for your account",
      text: "Engage never posts, likes or sends anything on its own. Every word goes out because you clicked send, so your LinkedIn account stays safe.",
    },
  ],
  x: [
    {
      sticker: "comment",
      title: "Replies that sound like you",
      text: "Generate a sharp reply to any post in seconds. Train the AI on your own writing, so it replies in your tone and your language.",
    },
    {
      sticker: "chat",
      title: "An assistant for your DMs",
      text: "Train an AI agent to chat with your clients and leads in your voice. It drafts every reply; you choose what gets sent.",
    },
    {
      sticker: "shield",
      title: "Free, and safe for your account",
      text: "Engage never posts, likes or sends anything on its own. Every word goes out because you clicked send, so your X account stays safe.",
    },
  ],
  reddit: [
    {
      sticker: "comment",
      title: "Comments that sound like a real Redditor",
      text: "Generate a reply to any post or comment in seconds. It reads the thread and the subreddit's rules first, and writes in your tone and your language.",
    },
    {
      sticker: "chat",
      title: "An assistant for your chats",
      text: "Train an AI agent to chat with the people you meet on Reddit, in your voice. It drafts every reply; you choose what gets sent.",
    },
    {
      sticker: "shield",
      title: "Free, and safe for your account",
      text: "Engage never posts, votes or sends anything on its own. Every word goes out because you clicked send, so your Reddit account stays safe.",
    },
  ],
  both: [
    {
      sticker: "comment",
      title: "Comments and replies that sound like you",
      text: "Generate a thoughtful LinkedIn comment or X reply in seconds. Train the AI on your own writing, so it writes in your tone and your language.",
    },
    {
      sticker: "note",
      title: "LinkedIn connection notes that get accepted",
      text: "Write a personal note for every connection request, based on their profile, so more of your requests get accepted.",
    },
    {
      sticker: "chat",
      title: "An assistant for your messages",
      text: "Train an AI agent to chat with your clients and leads in your voice, in LinkedIn messages and X DMs. It drafts every reply; you choose what gets sent.",
    },
    {
      sticker: "shield",
      title: "Free, and safe for your accounts",
      text: "Engage never posts, likes or sends anything on its own. Every word goes out because you clicked send, so your accounts stay safe.",
    },
  ],
}

const COPY: Record<GrantedExtensions, { product: string; site: string; install: string; open: string }> = {
  linkedin: {
    product: "CarouseLabs Engage, our AI assistant for LinkedIn",
    site: "LinkedIn",
    install: "Install Engage from the Chrome Web Store.",
    open: "Open LinkedIn. Engage is right there when you comment, connect or message.",
  },
  x: {
    product: "CarouseLabs Engage for X, our AI assistant for X",
    site: "X",
    install: "Install Engage for X from the Chrome Web Store.",
    open: "Open X. Engage is right there when you reply or open a DM.",
  },
  reddit: {
    product: "CarouseLabs Engage for Reddit, our AI assistant for Reddit",
    site: "Reddit",
    install: "Install Engage for Reddit from the Chrome Web Store.",
    open: "Open Reddit. Engage is right there when you reply to a post or a comment.",
  },
  both: {
    product: "CarouseLabs Engage, our AI assistants for LinkedIn and X",
    site: "LinkedIn and X",
    install: "Install the ones you'll use from the Chrome Web Store. They're two separate Chrome extensions.",
    open: "Open LinkedIn or X. Engage is right there when you write.",
  },
}

export function EngageAccessGrantedEmail({
  until,
  platform = "linkedin",
  storeUrls,
  email,
}: {
  // Formatted end date, or null for lifetime access. The email never shows
  // the date; it only says "for life" when there isn't one.
  until: string | null
  platform?: GrantedExtensions
  storeUrls: Record<EngagePlatform, string | null>
  // The address the access is on; it's what they sign in with.
  email?: string
}) {
  const storeOf = (p: EngagePlatform) => storeUrls[p] ?? `${APP_URL}${WEBSITE_PAGES[p]}`
  const covers = GRANT_COVERS[platform]
  const copy = COPY[platform]
  const signInAs = email ? <strong style={emailStyles.strong}>{email}</strong> : "this email address"
  const install = (align: "center" | "left", single: string) =>
    covers.length > 1 ? (
      <>
        {covers.map((p) => (
          <EmailButton key={p} href={storeOf(p)} align={align}>
            {GET_LABELS[p]}
          </EmailButton>
        ))}
      </>
    ) : (
      <EmailButton href={storeOf(covers[0])} align={align}>
        {single}
      </EmailButton>
    )

  return (
    <EmailLayout
      preview="We're giving a small group of creators free, unlimited access, and your profile made the list."
      hero="engage-invite"
      footerNote={<>You&apos;re getting this because the CarouseLabs team gave {email ?? "this email address"} free access to Engage.</>}
    >
      {/* Pitch + first call to action */}
      <Section style={{ textAlign: "center", padding: "0 8px 12px" }}>
        <Text style={{ ...emailStyles.text, margin: "0 0 20px", fontSize: "17px" }}>
          We&apos;re giving a small group of creators free, unlimited access to {copy.product}. Your profile qualified, so your
          access is already on
          {/* A grant's end date is never shown; only a lifetime grant says so. */}
          {until === null && (
            <>
              , free and unlimited <strong style={emailStyles.strong}>for life</strong>
            </>
          )}
          .
        </Text>
        {install("center", "Claim your free access")}
        <Text style={{ ...emailStyles.muted, margin: "8px 0 0" }}>
          {platform === "both" ? "Two separate Chrome extensions. Install the ones you'll use and sign in" : "Install the Chrome extension and sign in"}{" "}
          with {signInAs}.
        </Text>
      </Section>

      {/* What you get */}
      <EmailCard>
        <Heading as="h2" style={{ ...emailStyles.heading, margin: "0 0 10px", fontSize: "28px" }}>
          Your {copy.site}, in your own voice.
        </Heading>
        <Text style={{ ...emailStyles.text, margin: "0 0 22px" }}>
          Engage works right inside {copy.site}. It writes the first draft; you read it, tweak it and post it yourself. Here&apos;s
          what&apos;s unlocked for you:
        </Text>
        <EmailFeatures items={FEATURES[platform]} />
        <Section style={{ paddingTop: "4px" }}>{install("left", "Get the extension")}</Section>
      </EmailCard>

      {/* Setup */}
      <EmailPanel>
        <Heading as="h3" style={{ ...emailStyles.heading, margin: "0 0 16px", fontSize: "24px" }}>
          Up and running in two minutes
        </Heading>
        <EmailSteps steps={[copy.install, <>Sign in with {signInAs}. Your free access is already on it.</>, copy.open]} />
        <Text style={{ ...emailStyles.text, margin: "12px 0 4px", fontSize: "15px" }}>
          Stuck anywhere? Just reply to this email. A real person on our team reads every one.
        </Text>
      </EmailPanel>
    </EmailLayout>
  )
}
