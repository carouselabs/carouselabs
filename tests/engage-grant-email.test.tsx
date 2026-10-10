// The "You've got CarouseLabs Engage" email an admin's grant sends
// (emails/EngageAccessGrantedEmail): the extension it names and links to is
// the one the grant unlocks: LinkedIn's, X's, or both (separate listings).
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { EngageAccessGrantedEmail, engageAccessGrantedSubject } from "@/emails/EngageAccessGrantedEmail"

const storeUrls = { linkedin: "https://store.example/linkedin", x: "https://store.example/x" }
const html = (platform: "linkedin" | "x" | "both") =>
  renderToStaticMarkup(<EngageAccessGrantedEmail until="10 Nov 2026" platform={platform} storeUrls={storeUrls} />)

describe("Engage access granted email", () => {
  it("an X grant names X and links X's listing only", () => {
    const out = html("x")
    expect(engageAccessGrantedSubject("x")).toBe("You've got CarouseLabs Engage for X")
    expect(out).toContain("X replies and messages")
    expect(out).toContain('href="https://store.example/x"')
    expect(out).not.toContain("https://store.example/linkedin")
    expect(out).not.toContain("LinkedIn comments")
  })

  it("a LinkedIn grant is as before", () => {
    const out = html("linkedin")
    expect(engageAccessGrantedSubject("linkedin")).toBe("You've got CarouseLabs Engage")
    expect(out).toContain('href="https://store.example/linkedin"')
    expect(out).not.toContain("https://store.example/x")
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
})
