// Personal emails from a person's admin profile (Send email with AI): the
// writer is told their account facts (lib/emailRecipientFacts.ts), and the
// send route (/api/admin/users/[userId]/email) sends only to them, only with
// painted art of ours, and keeps a record their profile shows.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const m = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
  send: vi.fn(),
  audit: vi.fn(),
  auditRows: [] as Record<string, unknown>[],
  anthropic: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(async () => m.user) },
    auditLog: { findMany: vi.fn(async () => m.auditRows) },
  },
}))
vi.mock("@/lib/adminAuth", () => ({
  getAdminUser: vi.fn(async () => ({ id: "admin1", email: "admin@carouselabs.com" })),
  adminForbidden: () => new Response("forbidden", { status: 403 }),
}))
vi.mock("@/lib/auditLog", () => ({ logAdminAction: m.audit, getRequestIp: () => null }))
vi.mock("resend", () => ({ Resend: class { emails = { send: m.send } } }))
vi.mock("@/lib/broadcastVariables", () => ({
  resolveVariables: vi.fn(async () => ({ firstName: "Priya", email: "priya@example.com", plan: "FREE", creditsRemaining: "20", daysSinceSignup: "12", referralCode: "X", referralLink: "https://carouselabs.com/?ref=X" })),
  resolveVariablesMany: vi.fn(),
}))
vi.mock("@/lib/engage/access", () => ({
  loadEngageAccess: vi.fn(async () => ({
    platforms: {
      linkedin: { access: "free", source: "free", subscriptionActive: false, activeGrant: null, freeUsed: 1, freeRemaining: 9 },
      x: { access: "free", source: "free", subscriptionActive: false, activeGrant: null, freeUsed: 0, freeRemaining: 10 },
    },
  })),
}))
vi.mock("@/lib/engage/audience", () => ({
  signedInToEngage: vi.fn(async (platform: string) => platform === "linkedin"),
  engageUsage: vi.fn(async (platform: string, users: { id: string }[]) =>
    new Map(users.map((u) => [u.id, platform === "linkedin" ? { generations: 1, lastUsedAt: new Date("2026-10-08T10:00:00Z") } : { generations: 0, lastUsedAt: null }])),
  ),
}))
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: m.anthropic } } }))

import { recipientFacts } from "@/lib/emailRecipientFacts"
import { writeEmail } from "@/lib/ai/emailWriter"
import { GET, POST } from "@/app/api/admin/users/[userId]/email/route"

const R2 = "https://art.example.test"
const art = (n: string) => `${R2}/email-art/2026-10/${n}`
const NOW = new Date("2026-10-20T10:00:00Z")

const priya = {
  id: "u1",
  email: "priya@example.com",
  deletedAt: null,
  createdAt: new Date("2026-10-08T09:00:00Z"),
  updatedAt: new Date("2026-10-18T09:00:00Z"),
  extensionTrialUsed: 1,
  xTrialUsed: 0,
  profile: { name: "Priya Sharma", headline: "Growth coach for founders", industry: "Coaching", targetAudience: "early-stage founders" },
  _count: { posts: 3 },
}

const design = (heroUrl?: string) => ({
  version: 1,
  subject: "A quick one for you, {{firstName}}",
  preview: "One thing worth trying in Engage this week.",
  hero: { lead: "One small step", accent: "goes a long way.", scene: "a single paper airplane", paintingUrl: art("p.jpg"), imageUrl: heroUrl },
  blocks: [
    { type: "text", text: "Hi {{firstName}},\n\nTry one comment today." },
    { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
  ],
})
const post = (body: unknown) =>
  POST(new Request("http://x/api/admin/users/u1/email", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ userId: "u1" }) })

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", R2)
  m.user = priya
  m.send.mockReset().mockResolvedValue({ data: { id: "e1" }, error: null })
  m.audit.mockReset()
  m.anthropic.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

describe("what the writer is told about the person", () => {
  it("their name, plan, credits, profile and how they've used each extension", async () => {
    const facts = await recipientFacts("u1", NOW)
    expect(facts?.user).toEqual({ id: "u1", email: "priya@example.com", name: "Priya Sharma", firstName: "Priya" })
    const text = facts!.text
    expect(text).toContain("First name: Priya (full name Priya Sharma)")
    expect(text).toContain("Joined CarouseLabs 12 days ago")
    expect(text).toContain("Web app plan: Free, 20 credits left. Posts created: 3.")
    expect(text).toContain("Their headline: Growth coach for founders")
    expect(text).toContain("Who they write for: early-stage founders")
    expect(text).toMatch(/Engage for LinkedIn: signed in; on the free trial, 9 free generations left; 1 generation so far; last used 12 days ago/)
    expect(text).toMatch(/Engage for X: hasn't signed in to it/)
  })

  it("nothing for a deleted account", async () => {
    m.user = { ...priya, deletedAt: new Date() }
    expect(await recipientFacts("u1", NOW)).toBeNull()
  })

  it("the writer gets the person's facts only for a personal email", async () => {
    const answer = { content: [{ type: "text", text: JSON.stringify({ reply: "Draft.", design: design() }) }], stop_reason: "end_turn" }
    m.anthropic.mockResolvedValue(answer)
    await writeEmail({ history: [], request: "Nudge her", current: null, about: { facts: "First name: Priya" } })
    expect(m.anthropic.mock.calls[0][0].system).toContain("THIS EMAIL GOES TO ONE PERSON")
    expect(m.anthropic.mock.calls[0][0].system).toContain("First name: Priya")
    expect(m.anthropic.mock.calls[0][0].system).toContain("never recite numbers back at them")
    await writeEmail({ history: [], request: "A broadcast", current: null })
    expect(m.anthropic.mock.calls[1][0].system).not.toContain("THIS EMAIL GOES TO ONE PERSON")
  })
})

describe("sending it to them", () => {
  it("sends to their address only, with their name filled in, and records it", async () => {
    const res = await post({ design: design(art("h.jpg")) })
    expect(res.status).toBe(200)
    expect(m.send).toHaveBeenCalledTimes(1)
    const email = m.send.mock.calls[0][0]
    expect(email.to).toBe("priya@example.com")
    expect(email.subject).toBe("A quick one for you, Priya")
    expect(email.html).toContain("Hi Priya,")
    expect(email.html).toContain(`src="${art("h.jpg")}"`)
    expect(m.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SEND_PERSONAL_EMAIL",
        targetUserId: "u1",
        targetEmail: "priya@example.com",
        newValue: { subject: "A quick one for you, Priya", picture: art("h.jpg") },
      }),
    )
  })

  it("won't send before the picture is painted, or with a picture that isn't ours", async () => {
    expect((await post({ design: design(undefined) })).status).toBe(400)
    expect((await post({ design: design("https://elsewhere.example.com/x.jpg") })).status).toBe(400)
    expect(m.send).not.toHaveBeenCalled()
    expect(m.audit).not.toHaveBeenCalled()
  })

  it("won't send to a deleted account", async () => {
    m.user = { ...priya, deletedAt: new Date() }
    expect((await post({ design: design(art("h.jpg")) })).status).toBe(404)
    expect(m.send).not.toHaveBeenCalled()
  })

  it("says why when Resend refuses, and doesn't record it as sent", async () => {
    m.send.mockResolvedValue({ data: null, error: { message: "daily_quota_exceeded" } })
    const res = await post({ design: design(art("h.jpg")) })
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/daily_quota_exceeded/)
    expect(m.audit).not.toHaveBeenCalled()
  })

  it("lists the personal emails sent to them, newest first", async () => {
    m.auditRows = [{ id: "a1", createdAt: NOW, adminEmail: "admin@carouselabs.com", newValue: { subject: "Hi", picture: art("h.jpg") } }]
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ userId: "u1" }) })
    expect((await res.json()).emails).toEqual([
      { id: "a1", sentAt: NOW.toISOString(), by: "admin@carouselabs.com", subject: "Hi", picture: art("h.jpg") },
    ])
  })
})
