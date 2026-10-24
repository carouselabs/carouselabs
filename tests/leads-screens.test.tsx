// @vitest-environment jsdom
// The leads screens: uploading a CSV (components/admin/LeadsUpload.tsx), the
// Leads page (LeadsManager.tsx), "My leads" in the audience pickers
// (AudiencePicker.tsx), the composer offering leads for campaigns only, and
// the Brevo setup card (BrevoSetup.tsx).
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/admin/broadcasts" }))

import { LeadsUpload } from "@/components/admin/LeadsUpload"
import { LeadsManager } from "@/components/admin/LeadsManager"
import { AudiencePicker, EMPTY_AUDIENCE, audienceRequest, type Audience } from "@/components/admin/AudiencePicker"
import { BroadcastComposer } from "@/components/admin/BroadcastComposer"
import { ToastProvider } from "@/components/admin/Toast"
import { LEAD_IMPORT_CHUNK } from "@/lib/leadRules"
import { BrevoSetup } from "@/components/admin/BrevoSetup"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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

// jsdom's File may not read itself as text.
function csvFile(text: string, name = "delhi_founders.csv") {
  const file = new File([text], name, { type: "text/csv" })
  if (typeof file.text !== "function") Object.defineProperty(file, "text", { value: async () => text })
  return file
}

const withToasts = (ui: React.ReactNode) => <ToastProvider>{ui}</ToastProvider>

describe("uploading leads", () => {
  it("reads the file, guesses the columns, and saves it in parts to one list", async () => {
    let part = 0
    const calls = server({
      "POST /api/admin/leads": () => {
        part++
        return { listId: "list1", added: part === 1 ? LEAD_IMPORT_CHUNK - 1 : 100, alreadySaved: part === 1 ? 1 : 0, alreadyUsers: part === 1 ? 2 : 0, unsubscribed: 0, invalid: 0 }
      },
    })
    const onSaved = vi.fn()
    render(<LeadsUpload onSaved={onSaved} />)
    const rows = Array.from({ length: LEAD_IMPORT_CHUNK + 100 }, (_, i) => `person${i}@example.test,Person ${i},Company ${i}`)
    const csv = ["Email,First name,Company", ...rows, "not-an-email,Nobody,None", "person0@example.test,Again,Again"].join("\n")
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csvFile(csv)] } })

    expect(await screen.findByLabelText("Name this list")).toHaveProperty("value", "delhi founders")
    expect(screen.getByLabelText<HTMLSelectElement>("Use Email as").value).toBe("email")
    expect(screen.getByLabelText<HTMLSelectElement>("Use First name as").value).toBe("firstName")
    expect(screen.getByLabelText<HTMLSelectElement>("Use Company as").value).toBe("field")
    expect(screen.getByLabelText<HTMLInputElement>("Merge field for Company").value).toBe("company")
    expect(screen.getByText(/\{\{company\}\} becomes each person's value/)).toBeTruthy()
    expect(screen.getByText(/600 people to save · 1 row without a real email \(left out\) · 1 duplicate \(saved once\)/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Name this list"), { target: { value: "Delhi founders" } })
    fireEvent.click(screen.getByRole("button", { name: "Save 600 leads" }))
    expect(await screen.findByText(/Saved “Delhi founders”: 599 new leads, 1 you already had/)).toBeTruthy()
    expect(screen.getByText(/2 people already use CarouseLabs/)).toBeTruthy()
    expect(screen.getByText(/1 row had no real email address/)).toBeTruthy()
    expect(onSaved).toHaveBeenCalled()

    const posts = calls.filter((c) => c.method === "POST").map((c) => c.body as { listId?: string; listName: string; leads: { email: string; firstName: string; fields: Record<string, string> }[]; columns: unknown })
    expect(posts.map((p) => [p.listId, p.leads.length])).toEqual([
      [undefined, LEAD_IMPORT_CHUNK],
      ["list1", 100],
    ])
    expect(posts[0]).toMatchObject({ listName: "Delhi founders", columns: [{ key: "company", label: "Company" }] })
    expect(posts[0].leads[0]).toEqual({ email: "person0@example.test", firstName: "Person 0", lastName: null, name: null, fields: { company: "Company 0" } })
  })

  it("any column can be renamed as a merge field, and the email column is required", async () => {
    server({})
    render(<LeadsUpload onSaved={() => {}} />)
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csvFile("Email,Company Name\na@example.test,Acme")] } })
    const key = await screen.findByLabelText<HTMLInputElement>("Merge field for Company Name")
    expect(key.value).toBe("companyName")
    fireEvent.change(key, { target: { value: "org name!" } })
    expect(key.value).toBe("orgname")
    fireEvent.change(screen.getByLabelText("Use Email as"), { target: { value: "skip" } })
    expect(screen.getByText("Pick the column with the email addresses.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save leads" })).toHaveProperty("disabled", true)
    // Picking the email column elsewhere frees the old one.
    fireEvent.change(screen.getByLabelText("Use Company Name as"), { target: { value: "email" } })
    fireEvent.change(screen.getByLabelText("Use Email as"), { target: { value: "email" } })
    expect(screen.getByLabelText<HTMLSelectElement>("Use Company Name as").value).toBe("skip")
  })

  it("asks for a CSV when given a spreadsheet, and says when a file is empty", async () => {
    server({})
    render(<LeadsUpload onSaved={() => {}} />)
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csvFile("", "leads.xlsx")] } })
    expect(await screen.findByText(/Save the sheet as a CSV file first/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csvFile("Email\n")] } })
    expect(await screen.findByText(/no rows under its header/)).toBeTruthy()
  })

  it("says when saving failed part way, and that uploading again is safe", async () => {
    let part = 0
    server({
      "POST /api/admin/leads": () => {
        part++
        if (part === 2) throw new Error("down")
        return { listId: "list1", added: LEAD_IMPORT_CHUNK, alreadySaved: 0, alreadyUsers: 0, unsubscribed: 0, invalid: 0 }
      },
    })
    render(<LeadsUpload onSaved={() => {}} />)
    const csv = ["Email", ...Array.from({ length: LEAD_IMPORT_CHUNK + 1 }, (_, i) => `p${i}@example.test`)].join("\n")
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csvFile(csv)] } })
    fireEvent.click(await screen.findByRole("button", { name: `Save ${LEAD_IMPORT_CHUNK + 1} leads` }))
    expect(await screen.findByText(/Part of the file was saved; upload it again to add the rest/)).toBeTruthy()
  })
})

const LEADS = {
  totals: { total: 3, unsubscribed: 1, neverEmailed: 2 },
  lists: [
    { id: "list1", name: "Delhi founders", fileName: "delhi.csv", columns: [{ key: "company", label: "Company" }], createdBy: "admin@x", createdAt: "2026-10-24T00:00:00Z", count: 2 },
    { id: "list2", name: "Mumbai", fileName: null, columns: [], createdBy: "admin@x", createdAt: "2026-10-23T00:00:00Z", count: 1 },
  ],
}

describe("the Leads page", () => {
  const page = {
    ...LEADS,
    page: 1,
    pageSize: 50,
    total: 2,
    leads: [
      { id: "l1", email: "asha@example.test", name: "Asha Shah", fields: { company: "Acme" }, lists: [{ id: "list1", name: "Delhi founders" }], createdAt: "2026-10-24T00:00:00Z", lastEmailedAt: "2026-10-24T05:00:00Z", emailCount: 2, unsubscribedAt: null },
      { id: "l2", email: "gone@example.test", name: null, fields: {}, lists: [{ id: "list1", name: "Delhi founders" }], createdAt: "2026-10-24T00:00:00Z", lastEmailedAt: null, emailCount: 0, unsubscribedAt: "2026-10-24T06:00:00Z" },
    ],
  }

  it("shows the numbers, the lists with their merge fields, and the people", async () => {
    server({ "/api/admin/leads": () => page })
    render(withToasts(<LeadsManager />))
    const list = await screen.findByRole("listitem", { name: "List Delhi founders" })
    expect(within(list).getByText("{{company}}")).toBeTruthy()
    expect(within(list).getByText(/2 people · uploaded/)).toBeTruthy()
    expect(screen.getByText("Leads saved").parentElement?.parentElement?.textContent).toContain("3")
    const table = screen.getByRole("table")
    expect(within(table).getByText("asha@example.test")).toBeTruthy()
    expect(within(table).getByText("Acme")).toBeTruthy()
    expect(within(table).getByText(/2× · last/)).toBeTruthy()
    expect(within(table).getByText("Unsubscribed")).toBeTruthy()
  })

  it("filters by list and search, and deletes a list after asking", async () => {
    const calls = server({ "/api/admin/leads": () => page, "DELETE /api/admin/leads/lists/list2": () => ({ removed: 1 }) })
    render(withToasts(<LeadsManager />))
    const mumbai = await screen.findByRole("listitem", { name: "List Mumbai" })
    fireEvent.click(within(mumbai).getByRole("button", { name: "See people" }))
    await waitFor(() => expect(calls.some((c) => c.url.includes("list=list2"))).toBe(true))
    fireEvent.change(screen.getByLabelText("Search leads"), { target: { value: "asha" } })
    await waitFor(() => expect(calls.some((c) => c.url.includes("q=asha"))).toBe(true))

    fireEvent.click(within(mumbai).getByRole("button", { name: "Delete" }))
    const dialog = within(await screen.findByRole("alertdialog"))
    expect(dialog.getByText(/anyone who unsubscribed is kept/)).toBeTruthy()
    fireEvent.click(dialog.getByRole("button", { name: "Delete list" }))
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/admin/leads/lists/list2")).toBe(true))
  })

  it("says to run the SQL when the tables aren't there yet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Run scripts/leads.sql in Supabase first: the leads tables aren't there yet." }, { status: 503 })))
    render(withToasts(<LeadsManager />))
    expect(await screen.findByText(/Run scripts\/leads.sql in Supabase first/)).toBeTruthy()
  })
})

describe("the Brevo card", () => {
  const today = { via: "brevo", limit: 280, sentToday: 30, left: 250 }

  it("asks for the API key first", async () => {
    server({ "/api/admin/brevo": () => ({ status: { key: false }, from: "support@carouselabs.com", today }) })
    render(<BrevoSetup />)
    expect(await screen.findByText(/Add BREVO_API_KEY in Vercel/)).toBeTruthy()
    expect(screen.getByText("Today: 250 of 280 emails left through Brevo")).toBeTruthy()
  })

  it("shows what's done and what isn't, and turns on the webhook", async () => {
    const calls = server({
      "GET /api/admin/brevo": () => ({
        status: { key: true, sender: { email: "support@carouselabs.com", active: true }, domain: { name: "carouselabs.com", authenticated: false }, webhook: false },
        from: "support@carouselabs.com",
        today,
      }),
      "POST /api/admin/brevo": () => ({
        status: { key: true, sender: { email: "support@carouselabs.com", active: true }, domain: { name: "carouselabs.com", authenticated: false }, webhook: true },
        from: "support@carouselabs.com",
        today,
      }),
    })
    render(<BrevoSetup />)
    const sender = (await screen.findByText("Sender support@carouselabs.com")).closest("li")!
    expect(within(sender).getByLabelText("Done")).toBeTruthy()
    const domain = screen.getByText("Domain carouselabs.com authenticated").closest("li")!
    expect(within(domain).getByLabelText("To do")).toBeTruthy()
    expect(within(domain).getByText(/add the DNS records it shows/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Turn on" })).toBeNull())
    expect(calls.some((c) => c.method === "POST" && c.url === "/api/admin/brevo")).toBe(true)
  })

  it("says when Brevo turned the key down", async () => {
    server({ "/api/admin/brevo": () => ({ status: { key: true, error: "Key not found", sender: null, domain: null, webhook: false }, from: "support@carouselabs.com", today }) })
    render(<BrevoSetup />)
    expect(await screen.findByText("Brevo didn't accept the key")).toBeTruthy()
    expect(screen.getByText("Key not found")).toBeTruthy()
  })

  it("says what to change when Brevo only takes approved IP addresses", async () => {
    const error = "We have detected you are using an unrecognised IP address 203.0.113.9. If you performed this action make sure to add the new IP address in this link: https://app.brevo.com/security/authorised_ips"
    server({ "/api/admin/brevo": () => ({ status: { key: true, error, sender: null, domain: null, webhook: false }, from: "support@carouselabs.com", today }) })
    render(<BrevoSetup />)
    expect(await screen.findByText(/Security → Authorised IPs, turn off IP blocking/)).toBeTruthy()
  })
})

describe("My leads in the pickers", () => {
  function Picker({ onChange }: { onChange: (a: Audience) => void }) {
    return <AudiencePicker id="who" value={EMPTY_AUDIENCE} onChange={onChange} />
  }

  it("offers all leads, never emailed, and each list once some are uploaded", async () => {
    server({ "/api/admin/leads?only=lists": () => LEADS })
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    const select = screen.getByLabelText<HTMLSelectElement>("Who it's for")
    await waitFor(() => expect(within(select).getByRole("option", { name: "All my leads (2)" })).toBeTruthy())
    expect(within(select).getByRole("option", { name: "Leads never emailed (2)" })).toBeTruthy()
    expect(within(select).getByRole("option", { name: "List: Delhi founders (2)" })).toHaveProperty("value", "leads:list:list1")
    fireEvent.change(select, { target: { value: "leads:list:list2" } })
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_AUDIENCE, audience: "leads:list:list2" })
  })

  it("shows no leads group before any are uploaded (or before the SQL is run)", async () => {
    const calls = server({ "/api/admin/leads?only=lists": () => ({ totals: { total: 0, unsubscribed: 0, neverEmailed: 0 }, lists: [] }) })
    render(<Picker onChange={() => {}} />)
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(screen.queryByRole("option", { name: /my leads/i })).toBeNull()
  })

  it("a lead audience is sent as itself", () => {
    expect(audienceRequest({ ...EMPTY_AUDIENCE, audience: "leads:new" })).toEqual({ recipients: "leads:new" })
    expect(audienceRequest({ ...EMPTY_AUDIENCE, audience: "leads:list:list1" })).toEqual({ recipients: "leads:list:list1" })
    expect(audienceRequest({ ...EMPTY_AUDIENCE, audience: "leads:nope" })).toBeNull()
  })

  it("the composer offers leads only for a campaign, never to send now or schedule", async () => {
    server({ "/api/admin/leads?only=lists": () => LEADS })
    render(withToasts(<BroadcastComposer />))
    const to = () => screen.getByText("To").parentElement!.querySelector("select")!
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/leads?only=lists"))
    expect(within(to()).queryByRole("option", { name: /All my leads/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Campaign: send in batches" }))
    expect(within(to()).getByRole("option", { name: "All my leads (2)" })).toBeTruthy()
    fireEvent.change(to(), { target: { value: "leads:all" } })
    fireEvent.click(screen.getByRole("button", { name: "Send Now" }))
    expect(to().value).toBe("all")
  })
})
