// The "Your profile qualified" email an admin's grant sends
// (emails/EngageAccessGrantedEmail): the extension it names and links to is
// the one the grant unlocks: LinkedIn's, X's, or both (separate listings).
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { EngageAccessGrantedEmail, engageAccessGrantedSubject } from "@/emails/EngageAccessGrantedEmail"
import { APP_URL } from "@/emails/EmailLayout"

const storeUrls = { linkedin: "https://store.example/linkedin", x: "https://store.example/x" }
const html = (platform: "linkedin" | "x" | "both") =>
  renderToStaticMarkup(<EngageAccessGrantedEmail until="10 Nov 2026" platform={platform} storeUrls={storeUrls} />)

describe("Engage access granted email", () => {
  it("an X grant names X and links X's listing only", () => {
    const out = html("x")
    expect(engageAccessGrantedSubject("x")).toBe("Your profile qualified: free, unlimited CarouseLabs Engage for X")
    expect(out).toContain("CarouseLabs Engage for X, our AI assistant for X")
    expect(out).toContain("An assistant for your DMs")
    expect(out).toContain('href="https://store.example/x"')
    expect(out).not.toContain("https://store.example/linkedin")
    expect(out).not.toContain("LinkedIn")
    expect(out).not.toContain("engage-linkedin.png")
  })

  it("a LinkedIn grant links LinkedIn's listing and covers what it does", () => {
    const out = html("linkedin")
    expect(engageAccessGrantedSubject("linkedin")).toBe("Your profile qualified: free, unlimited CarouseLabs Engage")
    expect(out).toContain('href="https://store.example/linkedin"')
    expect(out).not.toContain("https://store.example/x")
    for (const feature of ["Comments that sound like you", "Connection notes that get accepted", "An assistant for your messages", "safe for your account"]) {
      expect(out).toContain(feature)
    }
    expect(out).toContain("until <strong")
    expect(out).toContain("10 Nov 2026")
  })

  it("a grant for both links both, as two separate extensions", () => {
    const out = html("both")
    expect(out).toContain('href="https://store.example/linkedin"')
    expect(out).toContain('href="https://store.example/x"')
    expect(out).toContain("two separate Chrome extensions")
    expect(out).toContain("Get Engage for LinkedIn")
    expect(out).toContain("Get Engage for X")
  })

  it("without a listing, it links the website's install steps for that extension", () => {
    const out = renderToStaticMarkup(
      <EngageAccessGrantedEmail until={null} platform="x" storeUrls={{ linkedin: null, x: null }} />,
    )
    expect(out).toMatch(/href="[^"]*\/extension\/x"/)
    expect(out).toContain("for life")
  })

  it("names the address to sign in with, when it's given", () => {
    const out = renderToStaticMarkup(
      <EngageAccessGrantedEmail until={null} platform="linkedin" storeUrls={storeUrls} email="priya@example.com" />,
    )
    expect(out).toContain("sign in with <strong")
    expect(out).toContain("priya@example.com")
    expect(html("linkedin")).toContain("sign in with this email address")
  })

  it("loads its images from the live site, never a dev URL", () => {
    const out = html("linkedin")
    expect(out).toContain(`src="${APP_URL}/images/email/hero-engage-invite.jpg"`)
    expect(out).toContain('alt="You made the cut. Engage is on us."')
    for (const sticker of ["comment", "note", "chat", "shield"]) {
      expect(out).toContain(`src="${APP_URL}/images/email/sticker-${sticker}.png"`)
    }
    expect(out).not.toContain("localhost")
  })
})
