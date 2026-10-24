// @vitest-environment jsdom
// Choosing what sends an email and who it's from (lib/sendingRules.ts): the
// picker (components/admin/SendingPicker.tsx) and a campaign's Sending line
// with Change (CampaignSending.tsx).
import { afterEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { SendingPicker } from "@/components/admin/SendingPicker"
import { CampaignSending } from "@/components/admin/CampaignSending"
import { ToastProvider } from "@/components/admin/Toast"
import { DEFAULT_SENDING, DEFAULT_SENDING_CHOICE, type SendingChoice } from "@/lib/sendingRules"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const SENDERS = {
  brevoKnown: true,
  senders: [
    { name: "CarouseLabs", email: "support@carouselabs.com", inBrevo: true },
    { name: "Anant from CarouseLabs", email: "anant@carouselabs.com", inBrevo: true },
    { name: "Hello", email: "hello@carouselabs.com", inBrevo: false },
  ],
}

function server(routes: Record<string, (init?: RequestInit) => unknown>) {
  const calls: { url: string; method: string; body: unknown }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null })
      const key = Object.keys(routes).find((k) => k === `${method} ${url}` || k === url)
      return Response.json(key ? routes[key](init) : { error: "no route" }, { status: key ? 200 : 500 })
    }),
  )
  return calls
}

function Picker({ initial = DEFAULT_SENDING_CHOICE, personal = false, forLeads = false, onChange }: { initial?: SendingChoice; personal?: boolean; forLeads?: boolean; onChange?: (c: SendingChoice) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <SendingPicker
      idPrefix="t"
      value={value}
      personal={personal}
      forLeads={forLeads}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const options = (label: string) => within(screen.getByLabelText(label)).getAllByRole("option").map((o) => o.textContent)

describe("the sending picker", () => {
  it("offers automatic, Resend or Brevo, and the senders on the list", async () => {
    server({ "/api/admin/senders": () => SENDERS })
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    await waitFor(() => expect(options("From")).toHaveLength(3))
    expect(options("Sent through")).toEqual(["Automatic: leads by Brevo, everyone else by Resend", "Resend, for everyone", "Brevo, for everyone"])
    expect(options("From")).toEqual([
      "CarouseLabs <support@carouselabs.com>",
      "Anant from CarouseLabs <anant@carouselabs.com>",
      "Hello <hello@carouselabs.com>",
    ])
    // Replies: the sender, or another address on the list.
    expect(options("Replies go to")).toEqual(["The sender", "anant@carouselabs.com", "hello@carouselabs.com"])
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "anant@carouselabs.com" } })
    fireEvent.change(screen.getByLabelText("Replies go to"), { target: { value: "support@carouselabs.com" } })
    expect(onChange).toHaveBeenLastCalledWith({ via: "auto", fromEmail: "anant@carouselabs.com", replyTo: "support@carouselabs.com" })
  })

  it("a personal email: Resend or Brevo", async () => {
    server({ "/api/admin/senders": () => SENDERS })
    render(<Picker personal />)
    await waitFor(() => expect(options("From")).toHaveLength(3))
    expect(options("Sent through")).toEqual(["Resend", "Brevo"])
  })

  it("says when Brevo would send from an address it doesn't have", async () => {
    server({ "/api/admin/senders": () => SENDERS })
    render(<Picker initial={{ via: "brevo", fromEmail: "hello@carouselabs.com", replyTo: null }} />)
    expect(await screen.findByText(/hello@carouselabs.com isn't a sender in Brevo yet/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Sent through"), { target: { value: "resend" } })
    expect(screen.queryByText(/isn't a sender in Brevo yet/)).toBeNull()
  })

  it("warns when leads would go through Resend", async () => {
    server({ "/api/admin/senders": () => SENDERS })
    render(<Picker forLeads />)
    await waitFor(() => expect(options("From")).toHaveLength(3))
    expect(screen.queryByText(/sending leads through Resend can get the account closed/)).toBeNull()
    fireEvent.change(screen.getByLabelText("Sent through"), { target: { value: "resend" } })
    expect(screen.getByText(/sending leads through Resend can get the account closed/)).toBeTruthy()
  })
})

describe("a campaign's Sending line", () => {
  it("says what sends it, and Change saves a new choice for the rest of it", async () => {
    const calls = server({ "/api/admin/senders": () => SENDERS, "PATCH /api/admin/campaigns/c1": () => ({ ok: true }) })
    const onSaved = vi.fn()
    render(
      <ToastProvider>
        <CampaignSending campaignId="c1" sending={DEFAULT_SENDING} forLeads onSaved={onSaved} />
      </ToastProvider>,
    )
    const line = screen.getByLabelText("Sending")
    expect(line.textContent).toMatch(/Sent through Brevo for leads, Resend for everyone elses*·s*From CarouseLabs <support@carouselabs.com>s*·s*Replies go to the sender/)
    fireEvent.click(within(line).getByRole("button", { name: /Change/ }))
    await waitFor(() => expect(options("From")).toHaveLength(3))
    fireEvent.change(screen.getByLabelText("Sent through"), { target: { value: "brevo" } })
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "anant@carouselabs.com" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ sending: { via: "brevo", fromEmail: "anant@carouselabs.com", replyTo: null } })
  })

  it("an archived campaign can't be changed", () => {
    server({})
    render(
      <ToastProvider>
        <CampaignSending campaignId="c1" sending={{ via: "resend", from: "Hello <hello@carouselabs.com>", replyTo: "support@carouselabs.com" }} forLeads={false} disabled onSaved={() => {}} />
      </ToastProvider>,
    )
    expect(screen.getByLabelText("Sending").textContent).toMatch(/Sent through Resends*·s*From Hello <hello@carouselabs.com>s*·s*Replies go to support@carouselabs.com/)
    expect(screen.queryByRole("button", { name: /Change/ })).toBeNull()
  })
})
