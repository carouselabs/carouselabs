// @vitest-environment jsdom
// Using emails again (Admin → Broadcasts → Sent emails, lib/sentEmails.ts):
// the library, loading any sent email or template, the "still says Priya"
// check, starring templates, adding people to a campaign (nobody twice),
// personal emails kept in full, the screens that use them, and ready-made
// emails (components/admin/ReadyEmails.tsx).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

const m = vi.hoisted(() => ({
  db: {
    emailCampaign: { findUnique: vi.fn(), findMany: vi.fn() },
    emailCampaignRecipient: { groupBy: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    personalEmailTrack: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    emailTemplate: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
  audit: vi.fn(),
  resolve: vi.fn(),
  push: vi.fn(),
  send: vi.fn(),
}))
vi.mock("@/lib/db", () => ({ db: m.db }))
vi.mock("@/lib/auditLog", () => ({ logAdminAction: m.audit, getRequestIp: () => null }))
vi.mock("@/lib/broadcast", () => ({ resolveRecipients: m.resolve, sendUserBroadcast: vi.fn() }))
vi.mock("@/lib/adminAuth", () => ({
  getAdminUser: vi.fn(async () => ({ id: "admin1", email: "admin@carouselabs.com" })),
  adminForbidden: () => new Response("forbidden", { status: 403 }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }))
vi.mock("resend", () => ({ Resend: class { emails = { send: m.send } } }))
vi.mock("@/lib/broadcastVariables", () => ({
  resolveVariables: vi.fn(async () => ({ firstName: "Priya", email: "priya@example.com", plan: "FREE", creditsRemaining: "20", daysSinceSignup: "12", referralCode: "X", referralLink: "https://carouselabs.com/?ref=X" })),
  resolveVariablesMany: vi.fn(async () => new Map()),
}))

import type { EmailDesign } from "@/lib/emailDesign"
import { emailContent, listSentEmails, mentionsName, parseSource, renameTemplate, saveTemplate } from "@/lib/sentEmails"
import { CampaignError, addCampaignRecipients } from "@/lib/campaigns"
import { GET as contentRoute } from "@/app/api/admin/sent-emails/content/route"
import { POST as templatesPost } from "@/app/api/admin/email-templates/route"
import { PATCH as templatePatch } from "@/app/api/admin/email-templates/[id]/route"
import { POST as recipientsRoute } from "@/app/api/admin/campaigns/[id]/recipients/route"
import { GET as historyRoute, POST as personalRoute } from "@/app/api/admin/users/[userId]/email/route"
import { UseAgainDialog } from "@/components/admin/UseAgainDialog"
import { SentEmailsLibrary } from "@/components/admin/SentEmailsLibrary"
import { AddPeopleDialog } from "@/components/admin/AddPeopleDialog"
import { EmailWriter } from "@/components/admin/EmailWriter"
import { ReadyEmails } from "@/components/admin/ReadyEmails"

const R2 = "https://art.example.test"
const art = (name: string) => `${R2}/email-art/2026-10/${name}`
const NOW = new Date("2026-10-22T10:00:00.000Z")

function design(text = "Hi {{firstName}},\n\nTry one comment today.", subject = "A quick one for you, {{firstName}}"): EmailDesign {
  return {
    version: 1,
    subject,
    preview: "One thing worth trying first in Engage, picked for how you write on LinkedIn.",
    hero: { lead: "One thing", accent: "worth trying.", scene: "two paper cups", paintingUrl: art("p.jpg"), imageUrl: art("h.jpg") },
    blocks: [
      { type: "text", text },
      { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
    ],
  }
}
const priya = { id: "u1", email: "priya@example.com", deletedAt: null, profile: { name: "Priya Sharma" } }

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", R2)
  for (const group of Object.values(m.db)) for (const fn of Object.values(group)) (fn as ReturnType<typeof vi.fn>).mockReset()
  for (const fn of [m.audit, m.resolve, m.push, m.send]) fn.mockReset()
  m.db.user.findUnique.mockResolvedValue(priya)
  m.db.user.findMany.mockResolvedValue([priya])
  m.send.mockResolvedValue({ data: { id: "re_1" }, error: null })
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("finding an email to use again", () => {
  it("reads where it comes from", () => {
    expect(parseSource("campaign:c1")).toEqual({ kind: "campaign", id: "c1" })
    expect(parseSource("template:t-9")).toEqual({ kind: "template", id: "t-9" })
    for (const bad of ["", "campaign:", "user:u1", "campaign:a b", null]) expect(parseSource(bad)).toBeNull()
  })

  it("notices an email that greets someone by name, but not the name field or a longer name", () => {
    const content = (text: string, subject = "Hello") => ({ subject, body: text, design: design(text, subject) })
    expect(mentionsName(content("Hi Priya,\n\nTry this."), "Priya")).toBe("Priya")
    expect(mentionsName(content("Hi there", "Priya, one quick thing"), "Priya")).toBe("Priya")
    expect(mentionsName(content("Hi {{firstName}},"), "Priya")).toBeNull()
    expect(mentionsName(content("Hi Priyanka,"), "Priya")).toBeNull()
    expect(mentionsName(content("Hi Priya,"), null)).toBeNull()
  })

  it("loads a campaign (AI-written or plain), a kept personal email, and a template", async () => {
    m.db.emailCampaign.findUnique.mockResolvedValueOnce({ subject: "x", body: "plain text", design: design() })
    expect(await emailContent({ kind: "campaign", id: "c1" })).toMatchObject({ subject: design().subject, design: design(), mentionsName: null })
    m.db.emailCampaign.findUnique.mockResolvedValueOnce({ subject: "Plain", body: "Hi {{firstName}}", design: null })
    expect(await emailContent({ kind: "campaign", id: "c2" })).toEqual({ subject: "Plain", body: "Hi {{firstName}}", design: null, mentionsName: null })

    m.db.personalEmailTrack.findUnique.mockResolvedValue({ design: design("Hi Priya,\n\nThanks."), userId: "u1" })
    expect((await emailContent({ kind: "personal", id: "e1" }))?.mentionsName).toBe("Priya")
    m.db.personalEmailTrack.findUnique.mockResolvedValueOnce({ design: null })
    expect(await emailContent({ kind: "personal", id: "old" })).toBeNull()

    m.db.emailTemplate.findUnique.mockResolvedValueOnce({ subject: "s", body: "b", design: design("Hi Priya,"), sourceKind: "personal", sourceId: "e1" })
    expect((await emailContent({ kind: "template", id: "t1" }))?.mentionsName).toBe("Priya")
  })

  it("the content route says when an email wasn't kept", async () => {
    m.db.personalEmailTrack.findUnique.mockResolvedValue({ design: null })
    expect((await contentRoute(new Request("http://x/?source=personal:old"))).status).toBe(404)
    expect((await contentRoute(new Request("http://x/?source=nonsense"))).status).toBe(400)
  })
})

describe("the library", () => {
  it("lists templates, campaigns with seen and clicked, and personal emails, marking starred ones", async () => {
    m.db.emailCampaign.findMany.mockResolvedValue([
      { id: "c1", subject: "Quick wins", audience: "all", audienceValue: null, status: "active", design: design(), createdAt: NOW, createdBy: "admin@carouselabs.com" },
      { id: "c2", subject: "Plain one", audience: "custom", audienceValue: null, status: "archived", design: null, createdAt: NOW, createdBy: "admin@carouselabs.com" },
    ])
    m.db.emailCampaignRecipient.groupBy.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.clickedAt) return [{ campaignId: "c1", _count: { _all: 1 } }]
      if (where.openedAt) return [{ campaignId: "c1", _count: { _all: 2 } }]
      if (where.status) return [{ campaignId: "c1", _count: { _all: 3 } }]
      return [{ campaignId: "c1", _count: { _all: 4 } }, { campaignId: "c2", _count: { _all: 2 } }]
    })
    m.db.personalEmailTrack.findMany.mockResolvedValue([
      { emailId: "e1", userId: "u1", subject: "A quick one for you, Priya", design: design(), createdAt: NOW, openedAt: NOW, openCount: 1, clickedAt: null, clickCount: 0 },
      { emailId: "e0", userId: "u1", subject: null, design: null, createdAt: NOW, openedAt: null, openCount: 0, clickedAt: null, clickCount: 0 },
    ])
    m.db.emailTemplate.findMany.mockResolvedValue([
      { id: "t1", name: "Quick wins", subject: "x", body: "b", design: design(), sourceKind: "campaign", sourceId: "c1", createdAt: NOW, createdBy: "admin@carouselabs.com" },
      { id: "t0", name: "Old plain", subject: "Plain subject", body: "b", design: null, sourceKind: null, sourceId: null, createdAt: NOW, createdBy: "admin@carouselabs.com" },
    ])

    const lib = await listSentEmails()
    expect(lib.campaigns[0]).toMatchObject({ id: "c1", designed: true, picture: art("h.jpg"), people: 4, sent: 3, seen: 2, clicked: 1, templateId: "t1" })
    expect(lib.campaigns[1]).toMatchObject({ id: "c2", designed: false, archived: true, people: 2, sent: 0, templateId: null })
    expect(lib.personal[0]).toMatchObject({ id: "e1", reusable: true, to: { id: "u1", name: "Priya Sharma" }, openCount: 1 })
    expect(lib.personal[1]).toMatchObject({ id: "e0", reusable: false })
    expect(lib.templates.map((t) => [t.name, t.designed, t.from])).toEqual([["Quick wins", true, "campaign:c1"], ["Old plain", false, null]])
  })

  it("before the SQL, the newer parts are just empty", async () => {
    const missing = Object.assign(new Error("no table"), { code: "P2021" })
    Object.setPrototypeOf(missing, (await import("@prisma/client")).Prisma.PrismaClientKnownRequestError.prototype)
    m.db.emailCampaign.findMany.mockResolvedValue([])
    m.db.personalEmailTrack.findMany.mockRejectedValue(missing)
    m.db.emailTemplate.findMany.mockRejectedValue(missing)
    expect(await listSentEmails()).toEqual({ templates: [], campaigns: [], personal: [] })
  })
})

describe("templates", () => {
  it("starring keeps a copy of the email, the AI-written one included, and where it came from", async () => {
    m.db.emailCampaign.findUnique.mockResolvedValue({ subject: "x", body: "plain", design: design() })
    m.db.emailTemplate.create.mockResolvedValue({ id: "t1", name: "Quick wins" })
    const res = await templatesPost(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Quick wins", source: "campaign:c1" }) }))
    expect(res.status).toBe(200)
    expect(m.db.emailTemplate.create).toHaveBeenCalledWith({
      data: { name: "Quick wins", subject: design().subject, body: "plain", design: design(), sourceKind: "campaign", sourceId: "c1", createdBy: "admin@carouselabs.com" },
      select: { id: true, name: true },
    })
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "SAVE_EMAIL_TEMPLATE" }))
  })

  it("can't star an email that wasn't kept, or a template; plain templates still save as before", async () => {
    m.db.personalEmailTrack.findUnique.mockResolvedValue({ design: null })
    await expect(saveTemplate({ source: { kind: "personal", id: "old" }, name: "x", adminEmail: "a" })).rejects.toThrow("wasn't kept")
    await expect(saveTemplate({ source: { kind: "template", id: "t1" }, name: "x", adminEmail: "a" })).rejects.toThrow("already a template")

    m.db.emailTemplate.create.mockResolvedValue({ id: "t2" })
    const plain = await templatesPost(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "N", subject: "S", body: "B" }) }))
    expect(plain.status).toBe(200)
    expect(m.db.emailTemplate.create).toHaveBeenLastCalledWith({ data: { name: "N", subject: "S", body: "B", createdBy: "admin@carouselabs.com" } })
  })

  it("renames, with the change in the audit log", async () => {
    m.db.emailTemplate.findUnique.mockResolvedValue({ name: "Old" })
    const res = await templatePatch(new Request("http://x", { method: "PATCH", body: JSON.stringify({ name: "New name" }) }), { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(200)
    expect(m.db.emailTemplate.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { name: "New name" } })
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "RENAME_EMAIL_TEMPLATE", details: 'Template "Old" renamed "New name"' }))
    m.db.emailTemplate.findUnique.mockResolvedValue(null)
    await expect(renameTemplate({ id: "nope", name: "x", adminEmail: "a" })).rejects.toThrow("not found")
  })
})

describe("adding people to a campaign", () => {
  beforeEach(() => {
    m.db.emailCampaign.findUnique.mockResolvedValue({ subject: "Quick wins", status: "active" })
    m.db.emailCampaignRecipient.findMany.mockResolvedValue([{ email: "ana@example.test" }])
    m.resolve.mockResolvedValue([
      { userId: "u1", email: "Ana@example.test" },
      { userId: "u2", email: "ben@example.test" },
      { userId: null, email: "ben@example.test" },
      { userId: null, email: "cy@example.test" },
    ])
    m.db.emailCampaignRecipient.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }))
  })

  it("adds only people not already on it, once each", async () => {
    const add = (dryRun?: boolean) => addCampaignRecipients({ campaignId: "c1", adminEmail: "admin@carouselabs.com", recipients: "all", audienceValue: null, dryRun })
    expect(await add(true)).toEqual({ added: 2, already: 1 })
    expect(m.db.emailCampaignRecipient.createMany).not.toHaveBeenCalled()

    expect(await add()).toEqual({ added: 2, already: 1 })
    const { data, skipDuplicates } = m.db.emailCampaignRecipient.createMany.mock.calls[0][0]
    expect(skipDuplicates).toBe(true)
    expect(data.map((r: { email: string; campaignId: string }) => [r.email, r.campaignId])).toEqual([["ben@example.test", "c1"], ["cy@example.test", "c1"]])
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "ADD_CAMPAIGN_RECIPIENTS" }))
  })

  it("won't add to an archived campaign, or past the size limit", async () => {
    m.db.emailCampaign.findUnique.mockResolvedValueOnce({ subject: "x", status: "archived" })
    await expect(addCampaignRecipients({ campaignId: "c1", adminEmail: "a", recipients: "all", audienceValue: null })).rejects.toBeInstanceOf(CampaignError)
    m.db.emailCampaignRecipient.findMany.mockResolvedValueOnce(Array.from({ length: 10_000 }, (_, i) => ({ email: `p${i}@x.test` })))
    await expect(addCampaignRecipients({ campaignId: "c1", adminEmail: "a", recipients: "all", audienceValue: null })).rejects.toThrow("up to 10,000")
  })

  it("the route checks who to add", async () => {
    const post = (body: unknown) =>
      recipientsRoute(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1" }) })
    expect((await post({ recipients: [] })).status).toBe(400)
    expect(await (await post({ recipients: ["dee@example.test"], dryRun: true })).json()).toMatchObject({ ok: true, added: 2 })
  })
})

describe("personal emails", () => {
  it("are kept in full when sent, and the history says which can be used again", async () => {
    m.db.personalEmailTrack.create.mockResolvedValue({})
    const res = await personalRoute(new Request("http://x", { method: "POST", body: JSON.stringify({ design: design() }) }), { params: Promise.resolve({ userId: "u1" }) })
    expect(res.status).toBe(200)
    expect(m.db.personalEmailTrack.create.mock.calls[0][0].data).toMatchObject({ userId: "u1", subject: "A quick one for you, Priya", design: design() })

    m.db.auditLog.findMany.mockResolvedValue([
      { id: "a2", createdAt: NOW, adminEmail: "admin@carouselabs.com", newValue: { subject: "Kept", emailId: "e2" } },
      { id: "a1", createdAt: NOW, adminEmail: "admin@carouselabs.com", newValue: { subject: "Older", emailId: "e1" } },
    ])
    m.db.personalEmailTrack.findMany.mockResolvedValue([
      { emailId: "e2", design: design(), openedAt: null, openCount: 0, clickedAt: null, clickCount: 0 },
      { emailId: "e1", design: null, openedAt: null, openCount: 0, clickedAt: null, clickCount: 0 },
    ])
    const { emails } = await (await historyRoute(new Request("http://x"), { params: Promise.resolve({ userId: "u1" }) })).json()
    expect(emails.map((e: { reuse: string | null }) => e.reuse)).toEqual(["personal:e2", null])
  })

  it("the writer writes their name only as the name field", async () => {
    const src = (await import("node:fs")).readFileSync("lib/ai/emailWriter.ts", "utf8")
    expect(src).toContain("Write their name only as {{firstName}}, never spelled out")
    expect(src).not.toContain("You may use their first name directly")
  })
})

// ── Screens ──
type Route = (url: string, init?: RequestInit) => unknown
function server(routes: Record<string, Route>) {
  const calls: { url: string; method: string; body: unknown }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null })
      const key = Object.keys(routes).find((k) => url.startsWith(k.split(" ").pop()!) && (k.includes(" ") ? k.startsWith(method + " ") : method === "GET"))
      const answer = key ? routes[key](url, init) : { error: `no route for ${method} ${url}` }
      return Response.json(answer, { status: key ? 200 : 500 })
    }),
  )
  return calls
}

describe("Use again", () => {
  it("sends it to new people as a new campaign: checks how many, then makes it", async () => {
    const calls = server({
      "/api/admin/sent-emails/content": () => ({ subject: "Quick wins", body: "b", design: design(), mentionsName: null }),
      "POST /api/admin/campaigns": (_u, init) => (JSON.parse(String(init?.body)).dryRun ? { count: 42 } : { id: "c9" }),
    })
    render(<UseAgainDialog source="campaign:c1" subject="Quick wins" onClose={() => {}} />)
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.click(await dialog.findByRole("button", { name: "Check who it reaches" }))
    fireEvent.click(await dialog.findByRole("button", { name: "Make campaign for 42" }))
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/admin/broadcasts/campaigns/c9"))
    const made = calls.filter((c) => c.method === "POST")
    expect(made.map((c) => (c.body as { dryRun?: boolean }).dryRun ?? false)).toEqual([true, false])
    expect(made[1].body).toMatchObject({ design: design(), recipients: "engage_linkedin" })
  })

  it("an email that still names someone needs editing or a clear yes first", async () => {
    server({ "/api/admin/sent-emails/content": () => ({ subject: "Hi Priya", body: "b", design: design("Hi Priya,"), mentionsName: "Priya" }) })
    render(<UseAgainDialog source="personal:e1" subject="Hi Priya" onClose={() => {}} />)
    const dialog = within(await screen.findByRole("dialog"))
    expect(await dialog.findByText(/greeted as Priya/)).toBeTruthy()
    expect((dialog.getByRole("button", { name: "Check who it reaches" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(dialog.getByLabelText("Send it as it is anyway"))
    expect((dialog.getByRole("button", { name: "Check who it reaches" }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("opens it in the writer, or for one person found by email", async () => {
    server({
      "/api/admin/sent-emails/content": () => ({ subject: "Quick wins", body: "b", design: design(), mentionsName: null }),
      "/api/admin/users": () => ({ users: [{ id: "u7", email: "sam@example.test", name: "Sam Lee" }] }),
    })
    render(<UseAgainDialog source="template:t1" subject="Quick wins" onClose={() => {}} />)
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.click(await dialog.findByRole("radio", { name: "Edit first" }))
    fireEvent.click(dialog.getByRole("button", { name: "Open in the writer" }))
    expect(m.push).toHaveBeenLastCalledWith("/admin/broadcasts/writer?reuse=template%3At1")

    fireEvent.click(dialog.getByRole("radio", { name: "Send to one person" }))
    fireEvent.change(dialog.getByLabelText("Find a person by email"), { target: { value: "sam" } })
    fireEvent.click(await dialog.findByRole("button", { name: /Sam Lee/ }, { timeout: 2000 }))
    expect(m.push).toHaveBeenLastCalledWith("/admin/users/u7/email?reuse=template%3At1")
  })

  it("a plain-text email can only go to new people", async () => {
    server({ "/api/admin/sent-emails/content": () => ({ subject: "Plain", body: "Hi", design: null, mentionsName: null }) })
    render(<UseAgainDialog source="campaign:c2" subject="Plain" onClose={() => {}} />)
    const dialog = within(await screen.findByRole("dialog"))
    await dialog.findByRole("button", { name: "Check who it reaches" })
    expect((dialog.getByRole("radio", { name: "Edit first" }) as HTMLButtonElement).disabled).toBe(true)
    expect((dialog.getByRole("radio", { name: "Send to one person" }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("the Sent emails page", () => {
  const library = {
    templates: [{ id: "t1", name: "Welcome back offer", subject: "Back?", picture: null, designed: true, from: "campaign:c1", createdAt: NOW.toISOString(), createdBy: "a" }],
    campaigns: [
      { id: "c1", subject: "Quick wins", audience: "all", audienceValue: null, archived: false, picture: art("h.jpg"), designed: true, createdAt: NOW.toISOString(), people: 10, sent: 4, seen: 2, clicked: 1, templateId: "t1" },
      { id: "c2", subject: "Spring note", audience: "all", audienceValue: null, archived: false, picture: null, designed: false, createdAt: NOW.toISOString(), people: 3, sent: 0, seen: 0, clicked: 0, templateId: null },
    ],
    personal: [
      { id: "e1", subject: "For Priya", to: { id: "u1", email: "priya@example.com", name: "Priya Sharma" }, sentAt: NOW.toISOString(), picture: null, reusable: true, openedAt: NOW.toISOString(), openCount: 1, clickedAt: null, clickCount: 0, templateId: null },
      { id: "e0", subject: null, to: null, sentAt: NOW.toISOString(), picture: null, reusable: false, openedAt: null, openCount: 0, clickedAt: null, clickCount: 0, templateId: null },
    ],
  }

  it("shows templates, campaigns with seen and clicked, and personal emails; stars and unstars", async () => {
    const calls = server({
      "/api/admin/sent-emails": () => library,
      "POST /api/admin/email-templates": () => ({ ok: true }),
      "DELETE /api/admin/email-templates/": () => ({ ok: true }),
    })
    render(<SentEmailsLibrary />)
    expect(await screen.findByRole("listitem", { name: "Template Welcome back offer" })).toBeTruthy()
    const quick = within(screen.getByRole("listitem", { name: "Campaign Quick wins" }))
    expect(quick.getByText(/4 of 10 sent · seen 50% · clicked 25%/)).toBeTruthy()
    expect(within(screen.getByRole("listitem", { name: "Personal email (subject not kept)" })).getByText("Not kept")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: 'Star "Spring note" as a template' }))
    const naming = within(await screen.findByRole("dialog"))
    fireEvent.change(naming.getByLabelText("Template name"), { target: { value: "Spring" } })
    fireEvent.click(naming.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "Spring", source: "campaign:c2" }))

    fireEvent.click(screen.getByRole("button", { name: 'Remove "Quick wins" from templates' }))
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/admin/email-templates/t1")).toBe(true))
  })

  it("searches by subject, name or email", async () => {
    server({ "/api/admin/sent-emails": () => library })
    render(<SentEmailsLibrary />)
    await screen.findByRole("listitem", { name: "Campaign Quick wins" })
    fireEvent.change(screen.getByLabelText("Search sent emails"), { target: { value: "priya" } })
    expect(screen.queryByRole("listitem", { name: "Campaign Quick wins" })).toBeNull()
    expect(screen.getByRole("listitem", { name: "Personal email For Priya" })).toBeTruthy()
  })
})

describe("Add people", () => {
  it("checks who's new, then adds them", async () => {
    const calls = server({ "POST /api/admin/campaigns/c1/recipients": (_u, init) => (JSON.parse(String(init?.body)).dryRun ? { added: 3, already: 2 } : { added: 3, already: 2 }) })
    const onAdded = vi.fn()
    render(<AddPeopleDialog campaignId="c1" onClose={() => {}} onAdded={onAdded} />)
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.click(dialog.getByRole("button", { name: "Check who's new" }))
    expect(await dialog.findByText(/3 new people/)).toBeTruthy()
    expect(dialog.getByText(/2 already on it/)).toBeTruthy()
    fireEvent.click(dialog.getByRole("button", { name: "Add 3" }))
    await waitFor(() => expect(onAdded).toHaveBeenCalled())
    // (The picker also loads the leads lists, a GET.)
    expect(calls.filter((c) => c.method === "POST").map((c) => (c.body as { dryRun: boolean }).dryRun)).toEqual([true, false])
  })
})

describe("the writer opens an email to use again", () => {
  it("loads it, painted art and all, ready to send", async () => {
    localStorage.clear()
    server({
      "/api/admin/sent-emails/content": () => ({ subject: "Quick wins", body: "b", design: design(), mentionsName: null }),
      "POST /api/admin/email-writer/preview": () => ({ html: "<p>preview</p>" }),
    })
    render(<EmailWriter reuse="campaign:c1" />)
    expect(await screen.findByText(/Loaded "Quick wins" to use again/)).toBeTruthy()
    expect(screen.getByText("All painted")).toBeTruthy()
    expect((screen.getByLabelText("What the picture shows") as HTMLTextAreaElement).value).toBe("two paper cups")
  })
})

describe("the plain template picker", () => {
  it("lists only plain templates; AI-written ones are used from Sent emails", async () => {
    const { TemplatePicker } = await import("@/components/admin/TemplatePicker")
    server({
      "/api/admin/email-templates": () => ({
        templates: [
          { id: "t0", name: "Old plain", subject: "S", body: "B" },
          { id: "t1", name: "Starred AI email", subject: "S", body: "B", design: design() },
        ],
      }),
    })
    render(<TemplatePicker currentSubject="" currentBody="" onLoad={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: /Load Template/ }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(await dialog.findByText("Old plain")).toBeTruthy()
    expect(dialog.queryByText("Starred AI email")).toBeNull()
  })
})

describe("Ready-made emails", () => {
  it("shows each one as people get it, with an example name and the button replying to the sender", () => {
    server({})
    render(<ReadyEmails />)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Dharma Ramasamy · Email 1", "Dharma Ramasamy · Email 2"])
    expect(screen.getByText("App registrations in your Entra tenant")).toBeTruthy()
    expect(screen.getByText("Quick question about your Entra tenant")).toBeTruthy()
    expect(screen.getAllByText("Dharma Ramasamy <support@carouselabs.com>")).toHaveLength(2)
    const preview = screen.getByTitle("Dharma Ramasamy · Email 2 preview").getAttribute("srcdoc")!
    expect(preview).toContain("Hello Priya,")
    expect(preview).not.toContain("{{firstName}}")
    expect(preview).toContain('href="mailto:support@carouselabs.com?subject=Re%3A%20Quick%20question%20about%20your%20Entra%20tenant"')
  })

  it("Use this email makes a campaign of it as it is: it can't be edited or sent to one person", async () => {
    const calls = server({
      "/api/admin/sent-emails/content": () => ({ subject: "Quick question about your Entra tenant", body: "b", design: null, readyEmail: "dharma-2", mentionsName: null }),
      "POST /api/admin/campaigns": (_u, init) => (JSON.parse(String(init?.body)).dryRun ? { count: 3 } : { id: "c7" }),
    })
    render(<ReadyEmails />)
    fireEvent.click(screen.getAllByRole("button", { name: "Use this email" })[1])
    const dialog = within(await screen.findByRole("dialog", { name: "Send this email" }))
    fireEvent.click(await dialog.findByRole("button", { name: "Check who it reaches" }))
    expect(calls[0].url).toBe("/api/admin/sent-emails/content?source=ready%3Adharma-2")
    expect(dialog.getByText(/this email, exactly as it is/)).toBeTruthy()
    expect(dialog.getByRole("radio", { name: "Edit first" })).toHaveProperty("disabled", true)
    expect(dialog.getByRole("radio", { name: "Edit first" }).getAttribute("title")).toBe("A ready-made email is sent as it is")
    expect(dialog.getByRole("radio", { name: "Send to one person" })).toHaveProperty("disabled", true)
    fireEvent.click(await dialog.findByRole("button", { name: "Make campaign for 3" }))
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/admin/broadcasts/campaigns/c7"))
    const made = calls.filter((c) => c.method === "POST").at(-1)!.body as Record<string, unknown>
    expect(made).toMatchObject({ readyEmail: "dharma-2", recipients: "engage_linkedin" })
    expect(made).not.toHaveProperty("design")
    expect(made).not.toHaveProperty("body")
  })

  it("the content route hands out a ready-made email by its id", async () => {
    const res = await contentRoute(new Request("https://carouselabs.test/api/admin/sent-emails/content?source=ready:dharma-1"))
    expect(await res.json()).toMatchObject({ readyEmail: "dharma-1", design: null, subject: "App registrations in your Entra tenant" })
    expect((await contentRoute(new Request("https://carouselabs.test/api/admin/sent-emails/content?source=ready:nope"))).status).toBe(404)
  })
})
