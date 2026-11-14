// The Saved comments announcement, a ready-made email for users (Admin →
// Broadcasts → Ready-made emails): emails/SavedCommentsLaunchEmail.tsx,
// rendered by scripts/ready-email-saved-comments.mjs into
// lib/readyEmailsSavedComments.ts.
import fs from "node:fs"
import path from "node:path"
import * as React from "react"
import { render } from "@react-email/render"
import { describe, expect, it } from "vitest"
import { SAVED_COMMENTS_PREVIEW, SAVED_COMMENTS_SUBJECT, SavedCommentsLaunchEmail } from "@/emails/SavedCommentsLaunchEmail"
import { SAVED_COMMENT_LIMITS } from "@/lib/engageSavedComments"
import { DEFAULT_ACCOUNT } from "@/lib/leadAccounts"
import { EXTENSION_STORE_URL } from "@/lib/plans"
import { personalizePreview, readyAccount, readyDesignOf, readyEmailById, readyEmailHtml, readyEmailText, readySnapshot } from "@/lib/readyEmails"
import { SAVED_COMMENTS_HTML, SAVED_COMMENTS_TEXT } from "@/lib/readyEmailsSavedComments"

const email = readyEmailById("engage-saved-comments")!
// The footer's year is whenever it was rendered.
const sameYear = (html: string) => html.replace(/© \d{4}/g, "© YEAR")

describe("the Saved comments announcement", () => {
  it("is listed as a CarouseLabs ready-made email, with the email's own subject and preview", () => {
    expect(email).toMatchObject({ fromName: "CarouseLabs", subject: SAVED_COMMENTS_SUBJECT, preview: SAVED_COMMENTS_PREVIEW })
    expect(readyAccount(email)).toBe(DEFAULT_ACCOUNT)
    expect(readyEmailHtml(email)).toBe(SAVED_COMMENTS_HTML)
    expect(readyEmailText(email)).toBe(SAVED_COMMENTS_TEXT)
  })

  it("is the email as it stands: run scripts/ready-email-saved-comments.mjs after changing it", async () => {
    expect(sameYear(await render(<SavedCommentsLaunchEmail />))).toBe(sameYear(SAVED_COMMENTS_HTML))
  })

  it("greets each person by name, and has no other blanks to fill", () => {
    expect(SAVED_COMMENTS_HTML.match(/\{\{\s*\w+\s*\}\}/g)).toEqual(["{{firstName}}"])
    expect(personalizePreview(SAVED_COMMENTS_HTML, "Alex")).toContain("Hi <!-- -->Alex<!-- -->,")
  })

  it("links only to the live site and the Chrome Web Store: the button to the Saved comments page", () => {
    const links = [...SAVED_COMMENTS_HTML.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
    expect(links).toContain("https://carouselabs.com/extension/saved")
    if (EXTENSION_STORE_URL) expect(links).toContain(EXTENSION_STORE_URL)
    for (const link of links) {
      expect(link.startsWith("https://carouselabs.com") || link === EXTENSION_STORE_URL || link.startsWith("https://fonts.googleapis.com"), link).toBe(true)
    }
    expect(SAVED_COMMENTS_HTML).not.toMatch(/localhost/)
  })

  it("every picture it shows is in public/images/email, the hero carrying its headline as alt text", () => {
    const pictures = [...SAVED_COMMENTS_HTML.matchAll(/src="https:\/\/carouselabs\.com\/images\/email\/([^"]+)"/g)].map((m) => m[1])
    expect(pictures).toEqual(expect.arrayContaining(["saved-comments/hero.jpg", "saved-comments/step-1.jpg", "saved-comments/step-2.jpg", "saved-comments/step-3.jpg"]))
    for (const picture of pictures) {
      expect(fs.existsSync(path.join(process.cwd(), "public/images/email", picture)), picture).toBe(true)
    }
    expect(SAVED_COMMENTS_HTML).toContain('alt="Your usual comment. One click away."')
  })

  it("says what the product does: its real limit, and nothing is posted for you", () => {
    expect(SAVED_COMMENTS_TEXT).toContain(`Keep up to ${SAVED_COMMENT_LIMITS.perUser} saved comments`)
    expect(SAVED_COMMENTS_TEXT).toContain("Nothing is posted until you press Post.")
  })

  it("its own words have no em dashes, and it fits in Gmail without being clipped", () => {
    const ownWords = SAVED_COMMENTS_TEXT.slice(0, SAVED_COMMENTS_TEXT.indexOf("The CarouseLabs Team"))
    expect(ownWords).not.toContain("—")
    expect(Buffer.byteLength(SAVED_COMMENTS_HTML)).toBeLessThan(100_000)
    expect(SAVED_COMMENTS_HTML).not.toMatch(/<script/i)
  })

  it("a campaign keeps a copy that reads back as this email", () => {
    const kept = readyDesignOf(JSON.parse(JSON.stringify(readySnapshot(email))))
    expect(kept).toMatchObject({ kind: "ready", id: "engage-saved-comments", fromName: "CarouseLabs", html: SAVED_COMMENTS_HTML })
  })
})
