import * as React from "react"
import { Img, Link, Text } from "@react-email/components"
import { APP_URL, EMAIL_IMAGES, EmailButton, EmailFeatures, EmailLayout, emailStyles } from "./EmailLayout"
import { EMAIL_COLORS as C } from "./theme"
import { SAVED_COMMENT_LIMITS } from "@/lib/engageSavedComments"
import { EXTENSION_STORE_URL } from "@/lib/plans"

// The announcement of Saved comments in CarouseLabs Engage for LinkedIn, sent
// to users as a ready-made email (Admin → Broadcasts → Ready-made emails).
// It isn't sent from here: scripts/ready-email-saved-comments.mjs renders it
// once into lib/readyEmailsSavedComments.ts, which lib/readyEmails.ts lists.
// Its pictures (public/images/email/saved-comments/) are the real side panel
// (the 1.4.4 store build, with example comments) on painted paper, the hero
// carrying the headline like every CarouseLabs email's.

export const SAVED_COMMENTS_SUBJECT = "New in Engage: your usual comment, one click away"
export const SAVED_COMMENTS_PREVIEW = "Save the comment you post every time, and add it to any LinkedIn post in one click."

const PICTURES = `${EMAIL_IMAGES}/saved-comments`
export const SAVED_COMMENTS_HERO_ALT = "Your usual comment. One click away."

const STEPS: { title: string; text: React.ReactNode; picture: string; alt: string; height: number }[] = [
  {
    title: "Save it once",
    text: (
      <>
        Open the Engage side panel and click <strong style={emailStyles.strong}>New</strong> under Saved comments. Paste your
        comment and give it a name. Line breaks, emoji and links stay exactly as you write them.
      </>
    ),
    picture: "step-1.jpg",
    alt: "The New saved comment form in the Engage side panel",
    height: 360,
  },
  {
    title: "Engage reminds you",
    text: (
      <>
        The first time you open one of your own posts, Engage asks if you&apos;d like to add your usual comment, and you pick
        which one. It asks once per post. You choose where each comment is offered: your own posts, every post, or never.
      </>
    ),
    picture: "step-2.jpg",
    alt: "Engage asking: First time on this post. Add your usual comment?",
    height: 321,
  },
  {
    title: "Insert or copy in one click",
    text: (
      <>
        Click <strong style={emailStyles.strong}>Insert</strong> and Engage puts it in LinkedIn&apos;s comment box, or{" "}
        <strong style={emailStyles.strong}>Copy</strong> it and paste it yourself. Nothing is posted until you press Post.
      </>
    ),
    picture: "step-3.jpg",
    alt: "Saved comments in the Engage side panel, each with Insert and Copy",
    height: 380,
  },
]

export function SavedCommentsLaunchEmail() {
  return (
    <EmailLayout
      preview={SAVED_COMMENTS_PREVIEW}
      hero={{ src: `${PICTURES}/hero.jpg`, alt: SAVED_COMMENTS_HERO_ALT }}
      footerNote="You're getting this because you have a CarouseLabs account."
    >
      <Text style={emailStyles.text}>Hi {"{{firstName}}"},</Text>
      <Text style={emailStyles.text}>
        Most creators leave the same comment under their posts: a link to a free guide, an invite to their newsletter, a
        booking link. Until now that meant keeping it in a notes app and pasting it in by hand, every time.
      </Text>
      <Text style={emailStyles.text}>
        CarouseLabs Engage for LinkedIn now keeps those comments for you. Save one once, and it&apos;s a click away on every
        post.
      </Text>

      <Text style={emailStyles.label}>How it works</Text>
      {STEPS.map((step, i) => (
        <React.Fragment key={step.title}>
          <Text style={{ margin: "6px 0 6px", fontSize: "18px", fontWeight: 600, lineHeight: "1.4", color: C.ink }}>
            <span
              style={{
                display: "inline-block",
                width: "26px",
                height: "26px",
                marginRight: "10px",
                borderRadius: "999px",
                backgroundColor: C.violetSoft,
                color: C.violet,
                fontSize: "13px",
                fontWeight: 700,
                lineHeight: "26px",
                textAlign: "center",
                verticalAlign: "1px",
              }}
            >
              {i + 1}
            </span>
            {step.title}
          </Text>
          <Text style={{ ...emailStyles.text, margin: "0 0 16px" }}>{step.text}</Text>
          <Img
            src={`${PICTURES}/${step.picture}`}
            width="560"
            height={String(step.height)}
            alt={step.alt}
            style={{ display: "block", width: "100%", maxWidth: "560px", height: "auto", borderRadius: "14px", margin: "0 0 30px" }}
          />
        </React.Fragment>
      ))}

      <Text style={{ ...emailStyles.label, margin: "8px 0 16px" }}>Good to know</Text>
      <EmailFeatures
        items={[
          {
            sticker: "note",
            title: "As many as you need",
            text: `Keep up to ${SAVED_COMMENT_LIMITS.perUser} saved comments on any plan. Using one never counts toward your plan's comments.`,
          },
          {
            sticker: "comment",
            title: "Keep what Engage writes",
            text: "Liked a comment Engage wrote for you? Click Save under it, and it's there next time.",
          },
          {
            sticker: "publish",
            title: "Manage them on the website",
            text: "Add, edit and search them in your CarouseLabs account, and import or export a list as a CSV file.",
          },
        ]}
      />

      <EmailButton href={`${APP_URL}/extension/saved`}>Add your saved comments</EmailButton>

      {EXTENSION_STORE_URL && (
        <Text style={emailStyles.muted}>
          Don&apos;t have Engage yet?{" "}
          <Link href={EXTENSION_STORE_URL} style={emailStyles.link}>
            Add CarouseLabs Engage to Chrome
          </Link>
          , sign in with your CarouseLabs account, and your saved comments are ready on every post.
        </Text>
      )}
    </EmailLayout>
  )
}

export default SavedCommentsLaunchEmail
