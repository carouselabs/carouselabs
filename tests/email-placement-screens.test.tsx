// @vitest-environment jsdom
// "Where it landed" on a campaign's page (components/admin/WhereItLanded.tsx):
// where the test copies landed at the top, the column beside each person,
// asking again while a copy is still being looked for, Test again, and the
// page staying up when the report can't be read.
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import { CampaignView } from "@/components/admin/CampaignView"
import { ToastProvider } from "@/components/admin/Toast"

const person = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@example.test`,
  name: null,
  userId: null,
  status: "sent",
  sentAt: "2026-10-25T09:00:00.000Z",
  error: null,
  openedAt: null,
  lastOpenedAt: null,
  openCount: 0,
  clickedAt: null,
  clickCount: 0,
  ...over,
})
const campaign = {
  id: "c1",
  subject: "Quick wins",
  body: "Hi",
  audience: "leads:all",
  audienceValue: null,
  status: "active",
  design: null,
  createdBy: "admin@carouselabs.com",
  createdAt: "2026-10-25T08:00:00.000Z",
  recipients: [person("ana", { openedAt: "2026-10-25T10:00:00.000Z", openCount: 1 }), person("ben"), person("cy"), person("dee"), person("eve", { status: "pending", sentAt: null })],
  progress: { total: 5, pending: 1, sending: 0, sent: 4, failed: 0, complete: false },
  allowance: { limit: 80, sentToday: 4, left: 76 },
}
const test = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  via: "brevo",
  inbox: "gmail",
  status: "found",
  placement: "promotions",
  important: true,
  error: null,
  sentAt: "2026-10-25T09:00:05.000Z",
  checkedAt: "2026-10-25T09:01:00.000Z",
  ...over,
})
const report = (tests = [test()]) => ({
  inbox: { connected: true, address: "carouselabs@gmail.com" },
  tests,
  people: {
    ana: { mailbox: "gmail", via: "brevo", stop: null },
    ben: { mailbox: "gmail", via: "brevo", stop: null },
    cy: { mailbox: "microsoft-365", via: "brevo", stop: null },
    dee: { mailbox: "google-workspace", via: "brevo", stop: { reason: "bounced", at: "2026-10-25T09:05:00.000Z" } },
    eve: { mailbox: null, via: "brevo", stop: null },
  },
})

// Each request answered by its own path.
function serve(answers: Record<string, () => unknown>) {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url, "https://carouselabs.com").pathname
      calls.push(`${init?.method ?? "GET"} ${path}`)
      const answer = Object.entries(answers).find(([p]) => path.endsWith(p))?.[1]
      return Response.json(answer ? answer() : {}, { status: answer ? 200 : 404 })
    }),
  )
  return calls
}

const cellOf = (email: string) => {
  const row = screen.getByText(email).closest("tr")!
  return within(row).getAllByRole("cell").at(-1)!
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("Where it landed on the campaign page", () => {
  it("says where the test copy landed, and each person's place beside them", async () => {
    serve({ "/campaigns/c1": () => ({ campaign }), "/placement": () => report() })
    render(
      <ToastProvider>
        <CampaignView id="c1" />
      </ToastProvider>,
    )
    const summary = await screen.findByLabelText("Where it landed")
    expect(summary.textContent).toContain("Test copy at Gmail")
    expect(summary.textContent).toContain("Promotions tab")
    expect(summary.textContent).toContain("Marked important")
    expect(screen.getByRole("columnheader", { name: "Where it landed" })).toBeTruthy()
    expect(cellOf("ana@example.test").textContent).toContain("Seen")
    expect(cellOf("ana@example.test").textContent).toContain("Gmail test: Promotions tab")
    expect(cellOf("ben@example.test").textContent).toContain("Gmail: Promotions tab")
    expect(cellOf("cy@example.test").textContent).toContain("Microsoft 365: not tested")
    expect(cellOf("dee@example.test").textContent).toContain("Bounced")
    expect(cellOf("eve@example.test").textContent).toBe("—")
  })

  it("asks again every 20 seconds while the copy is still being looked for, and stops once it's found", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let answer = report([test({ status: "waiting", placement: null, important: false })])
    const calls = serve({ "/campaigns/c1": () => ({ campaign }), "/placement": () => answer })
    render(
      <ToastProvider>
        <CampaignView id="c1" />
      </ToastProvider>,
    )
    expect((await screen.findByLabelText("Where it landed")).textContent).toContain("Checking…")
    expect(cellOf("ben@example.test").textContent).toContain("Gmail: Checking…")
    const looks = () => calls.filter((c) => c === "GET /api/admin/campaigns/c1/placement").length
    const before = looks()
    answer = report([test({ placement: "primary", important: false })])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })
    expect(looks()).toBe(before + 1)
    expect(cellOf("ben@example.test").textContent).toContain("Gmail: Primary")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(looks()).toBe(before + 1)
  })

  it("Test again sends a new copy; without a test inbox it says what's needed", async () => {
    const calls = serve({ "/campaigns/c1": () => ({ campaign }), "/placement": () => report() })
    render(
      <ToastProvider>
        <CampaignView id="c1" />
      </ToastProvider>,
    )
    fireEvent.click(await screen.findByRole("button", { name: /Test again/ }))
    await screen.findByText(/Test copy sent/)
    expect(calls).toContain("POST /api/admin/campaigns/c1/placement")
    cleanup()

    serve({ "/campaigns/c1": () => ({ campaign }), "/placement": () => ({ ...report([]), inbox: { connected: false, address: null } }) })
    render(
      <ToastProvider>
        <CampaignView id="c1" />
      </ToastProvider>,
    )
    expect((await screen.findByLabelText("Where it landed")).textContent).toContain("isn't connected yet")
    expect(screen.queryByRole("button", { name: /Test again/ })).toBeNull()
  })

  it("a report it can't read leaves the column empty and the page up", async () => {
    serve({ "/campaigns/c1": () => ({ campaign }), "/placement": () => ({ campaign }) })
    render(
      <ToastProvider>
        <CampaignView id="c1" />
      </ToastProvider>,
    )
    expect(await screen.findByText("ben@example.test")).toBeTruthy()
    expect(screen.queryByLabelText("Where it landed")).toBeNull()
    expect(cellOf("ben@example.test").textContent).toBe("…")
  })
})
