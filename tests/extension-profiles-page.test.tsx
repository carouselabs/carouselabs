// @vitest-environment jsdom
// Custom tones (Extension → Custom tones, and Engage for X → Reply profiles):
// the pages load everything on the server, so the browser fetches nothing on
// load or when switching tabs; and the extension routes and the pages read
// the very same lists (lib/extensionData.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getExtensionUser: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`)
  }),
  db: {
    commentProfile: { findMany: vi.fn() },
    connectionProfile: { findMany: vi.fn() },
    messageProfile: { findMany: vi.fn() },
    xProfile: { findMany: vi.fn() },
    xUserSettings: { findUnique: vi.fn() },
    contactContext: { findMany: vi.fn() },
  },
}))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock("@/lib/extensionCommentAuth", () => ({ getExtensionUser: mocks.getExtensionUser }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/lib/db", () => ({ db: mocks.db }))

import ProfilesPage from "@/app/(app)/extension/profiles/page"
import XProfilesPage from "@/app/(app)/extension/x/profiles/page"
import { ProfilesManager, type ProfilesInitial } from "@/components/extension/ProfilesManager"
import { XReplyProfiles, type XProfilesInitial } from "@/components/extension/XExtensionViews"
import { GET as getCommentProfiles } from "@/app/api/ext/profiles/route"
import { GET as getConnectionProfiles } from "@/app/api/ext/connection-profiles/route"
import { GET as getMessageProfiles } from "@/app/api/ext/message-profiles/route"
import { GET as getXProfiles } from "@/app/api/ext/x/profiles/route"
import { GET as getContacts } from "@/app/api/ext/contacts/route"
import { GET as getSettings } from "@/app/api/ext/settings/route"
import { GET as getXSettings } from "@/app/api/ext/x/settings/route"

const at = (day: string) => new Date(`2026-10-${day}T09:00:00.000Z`)
const ORDER = [{ isRecommended: "desc" }, { isSystem: "desc" }, { createdAt: "asc" }]
const VISIBLE = { OR: [{ isSystem: true }, { userId: "u1" }] }

const base = { alwaysDo: null, neverDo: null, samples: [], isRecommended: false, isDefault: false, createdAt: at("01"), updatedAt: at("01") }
const comment = (id: string, name: string, extra = {}) => ({
  ...base, id, name, userId: null, isSystem: true, whoIAm: "", goal: "adds one useful insight", tone: "friendly",
  length: "110-460 characters", emoji: "none", language: "English", ...extra,
})
const COMMENTS = [
  comment("c-sys", "Friendly expert", { isDefault: true }),
  comment("c-other", "Straight talker"),
  comment("c-mine", "My launch voice", { userId: "u1", isSystem: false, createdAt: at("05") }),
]
const CONNECTIONS = [
  { ...base, id: "n-sys", name: "Warm intro", userId: null, isSystem: true, angle: "shared interest", goal: "start a conversation", tone: "Warm", length: "150-280 characters", isDefault: true },
]
const MESSAGES = [{ ...base, id: "m-sys", name: "Natural follow-up", userId: null, isSystem: true, goal: "keep it going", tone: "Natural", isDefault: true }]
const X_PROFILES = [comment("x-sys", "Sharp replier", { isDefault: true }), comment("x-mine", "My X voice", { userId: "u1", isSystem: false })]
const CONTACT = {
  id: "k1", userId: "u1", contactUrl: "/in/priya", contactName: "Priya Sharma", choice: "profile", profileId: "m-sys",
  agentId: null, purpose: "", tone: "Natural", createdAt: at("10"), updatedAt: at("12"),
}
const USER = {
  id: "u1",
  email: "priya@example.com",
  defaultCommentProfileId: "c-mine",
  defaultConnectionProfileId: null,
  defaultMessageProfileId: null,
  defaultLanguage: null,
  connectNoteContext: { choice: "custom", purpose: "I help SaaS founders with pricing" },
  connectNoteLength: { preset: "short", min: 80, max: 150 },
  linkedinProfile: null,
  insertButtonHidden: null,
}

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getCurrentUser.mockResolvedValue(USER)
  mocks.getExtensionUser.mockResolvedValue(USER)
  mocks.db.commentProfile.findMany.mockResolvedValue(COMMENTS)
  mocks.db.connectionProfile.findMany.mockResolvedValue(CONNECTIONS)
  mocks.db.messageProfile.findMany.mockResolvedValue(MESSAGES)
  mocks.db.xProfile.findMany.mockResolvedValue(X_PROFILES)
  mocks.db.xUserSettings.findUnique.mockResolvedValue({ defaultProfileId: "x-mine", maxReplyLength: 280, insertButtonHidden: false })
  mocks.db.contactContext.findMany.mockResolvedValue([CONTACT])
  // What the routes would answer, for the parts that fetch their own (the preview).
  fetchMock = vi.fn(async (input: string) => {
    const path = String(input)
    const body =
      path === "/api/ext/settings" ? { ...USER, insertWarningHidden: true }
      : path === "/api/ext/profiles" ? { profiles: JSON.parse(JSON.stringify(COMMENTS)) }
      : path === "/api/ext/connection-profiles" ? { profiles: JSON.parse(JSON.stringify(CONNECTIONS)) }
      : path === "/api/ext/message-profiles" ? { profiles: JSON.parse(JSON.stringify(MESSAGES)) }
      : path === "/api/ext/contacts" ? { contacts: [{ ...CONTACT, updatedAt: CONTACT.updatedAt.toISOString() }] }
      : null
    return new Response(JSON.stringify(body ?? { error: "unexpected" }), { status: body ? 200 : 500 })
  })
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0))
  vi.stubGlobal("matchMedia", () => ({ matches: true }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const fetched = () => fetchMock.mock.calls.map(([path]) => String(path))

async function pageInitial(): Promise<ProfilesInitial> {
  const element = (await ProfilesPage()) as ReactElement<{ initial: ProfilesInitial }>
  expect(element.type).toBe(ProfilesManager)
  return element.props.initial
}

describe("the routes and the pages read the same lists", () => {
  it("each kind lists the built-ins and the user's own, recommended first", async () => {
    await pageInitial()
    for (const model of [mocks.db.commentProfile, mocks.db.connectionProfile, mocks.db.messageProfile]) {
      expect(model.findMany).toHaveBeenCalledWith({ where: VISIBLE, orderBy: ORDER })
    }
    expect(mocks.db.contactContext.findMany).toHaveBeenCalledWith({ where: { userId: "u1" }, orderBy: { updatedAt: "desc" }, take: 200 })
  })

  it("the extension routes still answer as before", async () => {
    const req = (path: string) => new Request(`https://app.test${path}`)
    const json = async (res: Response) => JSON.parse(await res.text())

    expect((await json(await getCommentProfiles(req("/api/ext/profiles")))).profiles.map((p: { id: string }) => p.id)).toEqual(["c-sys", "c-other", "c-mine"])
    expect((await json(await getConnectionProfiles(req("/api/ext/connection-profiles")))).profiles[0].id).toBe("n-sys")
    expect((await json(await getMessageProfiles(req("/api/ext/message-profiles")))).profiles[0].id).toBe("m-sys")
    expect(await json(await getXProfiles(req("/api/ext/x/profiles")))).toMatchObject({ defaultProfileId: "x-mine", profiles: [{ id: "x-sys" }, { id: "x-mine" }] })
    expect(mocks.db.xProfile.findMany).toHaveBeenCalledWith({ where: VISIBLE, orderBy: ORDER })

    expect((await json(await getContacts(req("/api/ext/contacts")))).contacts).toEqual([
      { id: "k1", contactUrl: "/in/priya", contactName: "Priya Sharma", choice: "profile", profileId: "m-sys", agentId: null, purpose: "", tone: "Natural", updatedAt: "2026-10-12T09:00:00.000Z" },
    ])
    expect(await json(await getSettings(req("/api/ext/settings")))).toEqual({
      defaultCommentProfileId: "c-mine",
      defaultConnectionProfileId: null,
      defaultMessageProfileId: null,
      defaultLanguage: null,
      insertWarningHidden: true,
      connectNoteContext: USER.connectNoteContext,
      connectNoteLength: USER.connectNoteLength,
      linkedinProfile: null,
      insertButtonHidden: null,
    })
    mocks.db.xUserSettings.findUnique.mockResolvedValueOnce(null)
    expect(await json(await getXSettings(req("/api/ext/x/settings")))).toEqual({ defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false })
  })
})

describe("Custom tones page (server)", () => {
  it("loads every kind, the note settings and the conversations, as the routes' JSON", async () => {
    const initial = await pageInitial()
    expect(initial.settings.defaultCommentProfileId).toBe("c-mine")
    expect(initial.settings.connectNoteContext).toEqual(USER.connectNoteContext)
    expect(initial.lists.comment.profiles.map((p) => p.id)).toEqual(["c-sys", "c-other", "c-mine"])
    expect(initial.lists.connection.profiles.map((p) => p.id)).toEqual(["n-sys"])
    expect(initial.lists.message.profiles.map((p) => p.id)).toEqual(["m-sys"])
    // Dates as strings, exactly as the routes send them.
    expect(initial.lists.comment.profiles[2].createdAt).toBe("2026-10-05T09:00:00.000Z")
    expect(initial.contacts).toEqual([expect.objectContaining({ contactName: "Priya Sharma", updatedAt: "2026-10-12T09:00:00.000Z" })])
  })

  it("sends someone signed out to sign in, reading nothing", async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    await expect(ProfilesPage()).rejects.toThrow("redirect:/sign-in")
    expect(mocks.db.commentProfile.findMany).not.toHaveBeenCalled()
  })
})

describe("Custom tones in the browser", () => {
  const tab = (name: string) => fireEvent.click(screen.getByRole("button", { name }))
  const row = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) })

  it("shows the page at once and fetches nothing, on load or switching tabs", async () => {
    render(<ProfilesManager initial={await pageInitial()} />)

    expect(row("My launch voice").textContent).toContain("Default")
    expect(screen.queryByText("Loading…")).toBeNull()

    tab("Connection notes")
    expect(row("Warm intro")).toBeTruthy()
    expect(screen.getByPlaceholderText(/I help SaaS founders fix their pricing/)).toHaveProperty("value", "I help SaaS founders with pricing")
    expect(screen.queryByText("Loading note settings…")).toBeNull()

    tab("Conversations")
    expect(row("Natural follow-up")).toBeTruthy()
    expect(screen.getByText("Priya Sharma")).toBeTruthy()

    tab("Comments & replies")
    expect(row("My launch voice")).toBeTruthy()
    await new Promise((r) => setTimeout(r, 20))
    expect(fetched()).toEqual([])
  })

  it("keeps what each tab had open when switching away and back", async () => {
    render(<ProfilesManager initial={await pageInitial()} />)
    fireEvent.click(row("Straight talker"))
    expect(row("Straight talker").getAttribute("aria-current")).toBe("true")

    tab("Connection notes")
    expect(screen.queryByRole("button", { name: /^Straight talker/ })).toBeNull()
    tab("Comments & replies")
    expect(row("Straight talker").getAttribute("aria-current")).toBe("true")
  })

  it("without server data (the design preview), fetches each part itself, never the heavy /api/ext/me", async () => {
    render(<ProfilesManager />)
    expect((await screen.findByRole("button", { name: /^My launch voice/ })).textContent).toContain("Default")
    await waitFor(() =>
      expect(new Set(fetched())).toEqual(
        new Set(["/api/ext/settings", "/api/ext/profiles", "/api/ext/connection-profiles", "/api/ext/message-profiles", "/api/ext/contacts"]),
      ),
    )
  })
})

describe("Engage for X → Reply profiles", () => {
  it("loads X's settings and list on the server, with the default from X's settings", async () => {
    const element = (await XProfilesPage()) as ReactElement<{ initial: XProfilesInitial }>
    expect(element.type).toBe(XReplyProfiles)
    expect(element.props.initial.list.defaultProfileId).toBe("x-mine")
    expect(element.props.initial.settings.maxReplyLength).toBe(280)

    render(element)
    expect(screen.getByRole("button", { name: /^My X voice/ }).textContent).toContain("Default")
    await new Promise((r) => setTimeout(r, 20))
    expect(fetched()).toEqual([])
  })
})
