// @vitest-environment jsdom
// The Email report screens: the report page (EmailReport.tsx) with its
// filters, the last-30-days strip on Broadcasts (EmailReportStrip.tsx), the
// "when they read" grid and a campaign's first 48 hours (CampaignActivity.tsx).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { EmailReport } from "@/components/admin/EmailReport"
import { EmailReportStrip } from "@/components/admin/EmailReportStrip"
import { ReadingHeatmap } from "@/components/admin/EmailReportParts"
import { CampaignActivity } from "@/components/admin/CampaignActivity"

// recharts measures its box with ResizeObserver, which jsdom doesn't have.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const grid = () => Array.from({ length: 7 }, () => Array<number>(24).fill(0))
const REPORT = {
  totals: { sent: 40, failed: 2, seen: 12, clicked: 3, scanned: 6, maybeApple: 2, unsubscribed: 1, bounced: 1, spam: 0 },
  daily: [
    { day: "2026-10-23", sent: 10, seen: 4, clicked: 1 },
    { day: "2026-10-24", sent: 30, seen: 8, clicked: 2 },
  ],
  campaigns: [
    { id: "c1", subject: "Quick wins", audience: "all", audienceValue: null, createdAt: "2026-10-23T00:00:00Z", via: "resend", lastSentAt: "2026-10-23T05:00:00Z", sent: 10, failed: 0, seen: 6, clicked: 2, scanned: 0, maybeApple: 0 },
    { id: "c2", subject: "For leads", audience: "leads:all", audienceValue: null, createdAt: "2026-10-24T00:00:00Z", via: "brevo", lastSentAt: "2026-10-24T05:00:00Z", sent: 28, failed: 2, seen: 5, clicked: 1, scanned: 6, maybeApple: 2 },
    { id: "personal", subject: "Personal emails", audience: "personal", audienceValue: null, createdAt: "2026-10-22T00:00:00Z", via: null, lastSentAt: "2026-10-22T05:00:00Z", sent: 2, failed: 0, seen: 1, clicked: 0, scanned: 0, maybeApple: 0 },
  ],
  links: [{ link: "https://carouselabs.com/sign-up", clicks: 4, people: 3 }],
  when: (() => {
    const g = grid()
    g[1][10] = 5
    g[3][20] = 2
    return g
  })(),
  apps: [
    { app: "Gmail", people: 7 },
    { app: "iPhone / iPad", people: 2 },
  ],
}

function server() {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url)
      if (url.startsWith("/api/admin/email-report")) return Response.json(REPORT)
      if (url.includes("/activity")) return Response.json({ timeline: Array.from({ length: 49 }, (_, hour) => ({ hour, seen: hour > 2 ? 3 : 0, clicked: hour > 5 ? 1 : 0 })), links: REPORT.links, apps: REPORT.apps })
      return Response.json({ error: "no route" }, { status: 500 })
    }),
  )
  return calls
}

describe("the email report", () => {
  it("opens on the last 30 days: the headline numbers, people only, and what was left out", async () => {
    const calls = server()
    render(<EmailReport />)
    expect(await screen.findByText("30%")).toBeTruthy()
    expect(calls[0]).toBe("/api/admin/email-report?kind=all&via=all&who=all&days=30")
    expect(screen.getByText("12 of 40 people opened it")).toBeTruthy()
    // Clicked: 3 of 40.
    expect(screen.getByText("3 people clicked a link").parentElement!.textContent).toContain("8%")
    // Click-to-open: 3 of the 12 who saw it.
    expect(screen.getByText("Of those who saw it, how many clicked").parentElement!.textContent).toContain("25%")
    expect(screen.getByText(/Left out: 6 checked by a security scanner, 2 maybe seen in Apple Mail/)).toBeTruthy()
    expect(screen.getByText(/Leads: 1 unsubscribed, 1 bounced, 0 marked it spam/)).toBeTruthy()
  })

  it("filters in one row: dates, which emails, the service, users or leads", async () => {
    const calls = server()
    render(<EmailReport />)
    await screen.findByText("30%")
    fireEvent.click(screen.getByRole("button", { name: "7 days" }))
    await waitFor(() => expect(calls.at(-1)).toContain("days=7"))
    fireEvent.change(screen.getByLabelText("Sent through"), { target: { value: "brevo" } })
    fireEvent.change(screen.getByLabelText("To whom"), { target: { value: "leads" } })
    await waitFor(() => expect(calls.at(-1)).toBe("/api/admin/email-report?kind=all&via=brevo&who=leads&days=7"))
    fireEvent.click(screen.getByRole("button", { name: "All time" }))
    await waitFor(() => expect(calls.at(-1)).toBe("/api/admin/email-report?kind=all&via=brevo&who=leads"))
    fireEvent.click(screen.getByRole("button", { name: "Dates" }))
    expect(screen.getByText("Pick both dates.")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } })
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-24" } })
    await waitFor(() => expect(calls.at(-1)).toContain("from=2026-10-01&to=2026-10-24"))
  })

  it("campaigns side by side, sortable, each opening its page; personal emails as one line", async () => {
    server()
    render(<EmailReport />)
    await screen.findByText("30%")
    const table = screen.getAllByRole("table").find((t) => within(t).queryByText("Quick wins"))!
    const subjects = () => within(table).getAllByRole("link").map((a) => a.textContent)
    // Newest first.
    expect(subjects()).toEqual(["For leads", "Quick wins", "Personal emails"])
    fireEvent.click(within(table).getByRole("button", { name: "Seen" }))
    expect(subjects()).toEqual(["Quick wins", "Personal emails", "For leads"])
    expect(within(table).getByRole("link", { name: "Quick wins" }).getAttribute("href")).toBe("/admin/broadcasts/campaigns/c1")
    expect(within(table).getByText(/Leads: All my leads|All my leads/)).toBeTruthy()
    expect(within(table).getByText("2 failed", { exact: false })).toBeTruthy()
  })

  it("the links people clicked, and where they read it", async () => {
    server()
    render(<EmailReport />)
    await screen.findByText("30%")
    expect(screen.getByLabelText("/sign-up: 3 people")).toBeTruthy()
    expect(screen.getByLabelText("Gmail: 7 people")).toBeTruthy()
  })
})

describe("when people read it", () => {
  it("shows the busiest hours and each hour's count", () => {
    const g = grid()
    g[1][10] = 5
    g[3][20] = 2
    render(<ReadingHeatmap grid={g} />)
    expect(screen.getByText("Tue 10 AM–11 AM, Thu 8 PM–9 PM")).toBeTruthy()
    expect(screen.getByLabelText("Tue 10 AM: 5")).toBeTruthy()
  })

  it("says when there's nothing yet", () => {
    render(<ReadingHeatmap grid={grid()} />)
    expect(screen.getByText(/Nothing yet/)).toBeTruthy()
  })
})

describe("the Broadcasts strip and a campaign's first 48 hours", () => {
  it("the last 30 days in one line, the latest campaigns, and the full report one click away", async () => {
    server()
    render(<EmailReportStrip />)
    const strip = await screen.findByLabelText("Last 30 days")
    await waitFor(() => expect(strip.textContent).toContain("40 sent"))
    expect(strip.textContent).toContain("30% seen")
    expect(strip.textContent).toContain("8% clicked")
    expect(within(strip).getByRole("link", { name: /Full email report/ }).getAttribute("href")).toBe("/admin/broadcasts/report")
    expect(within(strip).queryByText("Personal emails")).toBeNull()
    expect(within(strip).getByText("Quick wins")).toBeTruthy()
  })

  it("a campaign's links and apps show once there's activity", async () => {
    server()
    render(<CampaignActivity campaignId="c1" />)
    expect(await screen.findByText("The first 48 hours: people who had seen and clicked it")).toBeTruthy()
    expect(screen.getByLabelText("/sign-up: 3 people")).toBeTruthy()
  })

  it("nothing when no one has opened it yet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ timeline: Array.from({ length: 49 }, (_, hour) => ({ hour, seen: 0, clicked: 0 })), links: [], apps: [] })))
    const { container } = render(<CampaignActivity campaignId="c1" />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(container.textContent).toBe("")
  })
})
