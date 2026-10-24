// @vitest-environment jsdom
// The leads screens: uploading a CSV (components/admin/LeadsUpload.tsx), the
// Leads page (LeadsManager.tsx: All leads with its filters, ticking and smart
// lists, a lead's panel, Lists, Add & upload), "My leads" in the audience pickers
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
    { id: "list1", name: "Delhi founders", fileName: "delhi.csv", columns: [{ key: "company", label: "Company" }], createdBy: "admin@x", createdAt: "2026-10-24T00:00:00Z", kind: "static", filter: null, count: 2 },
    { id: "list2", name: "Mumbai", fileName: null, columns: [], createdBy: "admin@x", createdAt: "2026-10-23T00:00:00Z", kind: "static", filter: null, count: 1 },
    { id: "list3", name: "Clicked recently", fileName: null, columns: [], createdBy: "admin@x", createdAt: "2026-10-22T00:00:00Z", kind: "smart", filter: { activity: "clicked", days: 30 }, count: 1 },
  ],
  columns: [{ key: "company", label: "Company" }],
}

describe("the Leads page", () => {
  const page = {
    page: 1,
    pageSize: 50,
    total: 2,
    leads: [
      {
        id: "l1",
        email: "asha@example.test",
        name: "Asha Shah",
        fields: { company: "Acme" },
        lists: [{ id: "list1", name: "Delhi founders" }],
        createdAt: "2026-10-24T00:00:00Z",
        lastEmailedAt: "2026-10-24T05:00:00Z",
        emailCount: 2,
        lastSeenAt: "2026-10-24T05:10:00Z",
        lastClickedAt: "2026-10-24T05:12:00Z",
        unsubscribedAt: null,
      },
      {
        id: "l2",
        email: "gone@example.test",
        name: null,
        fields: {},
        lists: [{ id: "list1", name: "Delhi founders" }],
        createdAt: "2026-10-24T00:00:00Z",
        lastEmailedAt: null,
        emailCount: 0,
        lastSeenAt: null,
        lastClickedAt: null,
        unsubscribedAt: "2026-10-24T06:00:00Z",
      },
    ],
  }
  const routes = (more: Record<string, Route> = {}, leads: unknown = page) => ({ ...more, "/api/admin/leads?only=lists": () => LEADS, "/api/admin/leads?only=leads": () => leads })
  // The filters the table asked for, in order.
  const filtersAsked = (calls: { url: string }[]) =>
    calls.filter((c) => c.url.startsWith("/api/admin/leads?only=leads")).map((c) => JSON.parse(new URL(c.url, "https://x.test").searchParams.get("filter")!))
  const openTab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }))

  it("opens on All leads: the numbers, and everyone with their columns, lists and what they did", async () => {
    server(routes())
    render(withToasts(<LeadsManager />))
    const table = await screen.findByRole("table")
    expect(screen.getByRole("tab", { name: "All leads" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["All leads", "Lists", "Add & upload", "Brevo setup"])
    expect(screen.getByText("Leads saved").parentElement?.parentElement?.textContent).toContain("3")
    expect(screen.getByText("All leads (2)")).toBeTruthy()
    expect(within(table).getByText("asha@example.test")).toBeTruthy()
    expect(within(table).getByText("Acme")).toBeTruthy()
    expect(within(table).getByText(/2 sent · last/)).toBeTruthy()
    expect(within(table).getByText(/^Seen /)).toBeTruthy()
    expect(within(table).getByText(/^Clicked /)).toBeTruthy()
    expect(within(table).getByText("Unsubscribed")).toBeTruthy()
  })

  it("every filter goes to the server as one; See people in Lists shows that list", async () => {
    const calls = server(routes())
    render(withToasts(<LeadsManager />))
    await screen.findByRole("table")
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "active" } })
    fireEvent.change(screen.getByLabelText("Activity"), { target: { value: "seen" } })
    fireEvent.change(screen.getByLabelText("Within"), { target: { value: "30" } })
    fireEvent.change(screen.getByLabelText("Column"), { target: { value: "company" } })
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "bank" } })
    fireEvent.change(screen.getByLabelText("Search leads"), { target: { value: "asha " } })
    await waitFor(() =>
      expect(filtersAsked(calls).at(-1)).toEqual({ status: "active", activity: "seen", days: 30, field: { key: "company", op: "contains", value: "bank" }, q: "asha" }),
    )
    // What's typed stays as typed, trailing space and all.
    expect(screen.getByLabelText<HTMLInputElement>("Search leads").value).toBe("asha ")
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    await waitFor(() => expect(filtersAsked(calls).at(-1)).toEqual({}))
    expect(screen.getByLabelText<HTMLInputElement>("Search leads").value).toBe("")

    openTab("Lists")
    fireEvent.click(within(screen.getByRole("listitem", { name: "List Mumbai" })).getByRole("button", { name: "See people" }))
    await waitFor(() => expect(filtersAsked(calls).at(-1)).toEqual({ listId: "list2" }))
    expect(screen.getByRole("tab", { name: "All leads" }).getAttribute("aria-selected")).toBe("true")
    expect(await screen.findByText("Mumbai (2)")).toBeTruthy()
  })

  it("ticked leads go on a new list; all that match can be deleted, after asking", async () => {
    const calls = server(routes({ "POST /api/admin/leads/bulk": (_u, init) => (JSON.parse(String(init!.body)).action === "add" ? { affected: 1, kept: 0, listId: "list9" } : { affected: 118, kept: 2 }) }, { ...page, total: 120 }))
    render(withToasts(<LeadsManager />))
    fireEvent.click(await screen.findByLabelText("Tick asha@example.test"))
    const ticked = screen.getByRole("region", { name: "Ticked leads" })
    expect(within(ticked).getByText("1 ticked")).toBeTruthy()
    fireEvent.click(within(ticked).getByRole("button", { name: "Add to list" }))
    const add = within(await screen.findByRole("dialog"))
    fireEvent.change(add.getByLabelText("Which list"), { target: { value: "__new__" } })
    fireEvent.change(add.getByLabelText("New list name"), { target: { value: "Hot" } })
    fireEvent.click(add.getByRole("button", { name: "Add to list" }))
    expect(await screen.findByText('Added 1 to "Hot"')).toBeTruthy()
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ action: "add", newListName: "Hot", ids: ["l1"] })

    fireEvent.click(screen.getByLabelText("Tick everyone on this page"))
    fireEvent.click(await screen.findByRole("button", { name: "Tick all 120 that match" }))
    expect(screen.getByText("120 ticked")).toBeTruthy()
    fireEvent.click(within(screen.getByRole("region", { name: "Ticked leads" })).getByRole("button", { name: "Delete" }))
    const confirm = within(await screen.findByRole("alertdialog"))
    expect(confirm.getByText(/Anyone who unsubscribed, bounced or marked an email as spam is kept/)).toBeTruthy()
    fireEvent.click(confirm.getByRole("button", { name: "Delete leads" }))
    expect(await screen.findByText(/Deleted 118 leads. Kept 2 who stopped getting emails/)).toBeTruthy()
    expect(calls.filter((c) => c.method === "POST").at(-1)?.body).toEqual({ action: "delete", filter: {} })
  })

  it("the filters can be saved as a smart list", async () => {
    const calls = server(routes({ "POST /api/admin/leads/lists": () => ({ id: "list9" }) }))
    render(withToasts(<LeadsManager />))
    await screen.findByRole("table")
    expect(screen.queryByRole("button", { name: "Save as smart list" })).toBeNull()
    fireEvent.change(screen.getByLabelText("Activity"), { target: { value: "clicked" } })
    fireEvent.change(screen.getByLabelText("Within"), { target: { value: "30" } })
    fireEvent.click(screen.getByRole("button", { name: "Save as smart list" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByText("Clicked in the last 30 days")).toBeTruthy()
    fireEvent.change(dialog.getByLabelText("Smart list name"), { target: { value: "Clicked this month" } })
    fireEvent.click(dialog.getByRole("button", { name: "Save smart list" }))
    expect(await screen.findByText(/Saved the smart list "Clicked this month"/)).toBeTruthy()
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "Clicked this month", kind: "smart", filter: { activity: "clicked", days: 30 } })
    // Then it shows that list.
    await waitFor(() => expect(filtersAsked(calls).at(-1)).toEqual({ listId: "list9" }))
  })

  it("Lists: fixed and smart, a new empty list, renaming, and deleting keeping the leads", async () => {
    const calls = server(
      routes({
        "POST /api/admin/leads/lists": () => ({ id: "list9" }),
        "PATCH /api/admin/leads/lists/list2": () => ({ ok: true }),
        "DELETE /api/admin/leads/lists/list1": () => ({ removed: 0 }),
        "DELETE /api/admin/leads/lists/list3": () => ({ removed: 0 }),
      }),
    )
    render(withToasts(<LeadsManager />))
    await screen.findByRole("table")
    openTab("Lists")
    const delhi = screen.getByRole("listitem", { name: "List Delhi founders" })
    expect(within(delhi).getByText("Fixed")).toBeTruthy()
    expect(within(delhi).getByText("{{company}}")).toBeTruthy()
    expect(within(delhi).getByText(/2 people · uploaded .* from delhi.csv/)).toBeTruthy()
    const smart = screen.getByRole("listitem", { name: "List Clicked recently" })
    expect(within(smart).getByText("Smart")).toBeTruthy()
    expect(within(smart).getByText("1 person now · Clicked in the last 30 days")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "New list" }))
    let dialog = within(await screen.findByRole("dialog"))
    fireEvent.change(dialog.getByLabelText("List name"), { target: { value: "Shortlist" } })
    fireEvent.click(dialog.getByRole("button", { name: "Make list" }))
    expect(await screen.findByText(/Made "Shortlist"/)).toBeTruthy()
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "Shortlist", kind: "static" })

    fireEvent.click(within(screen.getByRole("listitem", { name: "List Mumbai" })).getByRole("button", { name: "Rename" }))
    dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByLabelText<HTMLInputElement>("New name").value).toBe("Mumbai")
    fireEvent.change(dialog.getByLabelText("New name"), { target: { value: "Mumbai founders" } })
    fireEvent.click(dialog.getByRole("button", { name: "Rename" }))
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ name: "Mumbai founders" }))

    fireEvent.click(within(screen.getByRole("listitem", { name: "List Delhi founders" })).getByRole("button", { name: "Delete" }))
    dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByText(/Anyone who unsubscribed is always kept/)).toBeTruthy()
    fireEvent.click(dialog.getByRole("button", { name: "Delete list, keep leads" }))
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/admin/leads/lists/list1?leads=keep")).toBe(true))

    fireEvent.click(within(screen.getByRole("listitem", { name: "List Clicked recently" })).getByRole("button", { name: "Delete" }))
    const confirm = within(await screen.findByRole("alertdialog"))
    expect(confirm.getByText(/nobody is deleted/)).toBeTruthy()
    fireEvent.click(confirm.getByRole("button", { name: "Delete smart list" }))
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/admin/leads/lists/list3?leads=keep")).toBe(true))
  })

  it("a smart list's filters are changed in All leads and saved to it", async () => {
    const calls = server(routes({ "PATCH /api/admin/leads/lists/list3": () => ({ ok: true }) }))
    render(withToasts(<LeadsManager />))
    await screen.findByRole("table")
    openTab("Lists")
    fireEvent.click(within(screen.getByRole("listitem", { name: "List Clicked recently" })).getByRole("button", { name: "Edit filters" }))
    expect(await screen.findByText(/Changing the filters of the smart list/)).toBeTruthy()
    expect(screen.getByLabelText<HTMLSelectElement>("Activity").value).toBe("clicked")
    // A smart list can't be built on itself, or on another smart list.
    expect(within(screen.getByLabelText("List")).queryByRole("option", { name: "Clicked recently" })).toBeNull()
    fireEvent.change(screen.getByLabelText("Within"), { target: { value: "7" } })
    await waitFor(() => expect(filtersAsked(calls).at(-1)).toEqual({ activity: "clicked", days: 7 }))
    fireEvent.click(screen.getByRole("button", { name: 'Save to "Clicked recently"' }))
    expect(await screen.findByText('Saved the filters of "Clicked recently"')).toBeTruthy()
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ filter: { activity: "clicked", days: 7 } })
    expect(screen.queryByText(/Changing the filters/)).toBeNull()
  })

  it("a lead opens with their details, lists and emails; changes are saved", async () => {
    const detail = {
      lead: { id: "l1", email: "asha@example.test", firstName: "Asha", lastName: "Shah", name: null, fields: { company: "Acme" }, createdAt: "2026-10-24T00:00:00Z", unsubscribedAt: null, stopReason: null },
      lists: [{ id: "list1", name: "Delhi founders" }],
      emails: [
        { id: "r1", status: "sent", sentAt: "2026-10-24T05:00:00Z", error: null, openedAt: "2026-10-24T05:10:00Z", openCount: 1, clickedAt: "2026-10-24T05:12:00Z", clickCount: 1, campaign: { id: "c1", subject: "Hello banks" } },
        { id: "r2", status: "failed", sentAt: null, error: "Mailbox full", openedAt: null, openCount: 0, clickedAt: null, clickCount: 0, campaign: { id: "c2", subject: "Second try" } },
      ],
      columns: [{ key: "company", label: "Company" }],
    }
    const calls = server(routes({ "PATCH /api/admin/leads/l1": () => ({ ok: true }), "/api/admin/leads/l1": () => detail }))
    render(withToasts(<LeadsManager />))
    fireEvent.click(await screen.findByRole("button", { name: "Open asha@example.test" }))
    const panel = within(await screen.findByRole("dialog"))
    expect(await panel.findByLabelText<HTMLInputElement>("First name")).toHaveProperty("value", "Asha")
    expect(panel.getByText("Delhi founders")).toBeTruthy()
    expect(panel.getByRole("link", { name: "Hello banks" })).toHaveProperty("href", expect.stringContaining("/admin/broadcasts/campaigns/c1"))
    expect(panel.getByText(/^Seen /)).toBeTruthy()
    expect(panel.getByRole("button", { name: "History for asha@example.test" })).toBeTruthy()
    expect(panel.getByText("Didn't send: Mailbox full")).toBeTruthy()
    fireEvent.change(panel.getByLabelText(/^Company/), { target: { value: "Acme Inc" } })
    fireEvent.click(panel.getByRole("button", { name: "Save changes" }))
    expect(await panel.findByText("Saved")).toBeTruthy()
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ firstName: "Asha", lastName: "Shah", name: null, fields: { company: "Acme Inc" } })
  })

  it("Add & upload: one lead by hand, or many pasted, through the same save as an upload", async () => {
    const calls = server(
      routes({
        "POST /api/admin/leads": (_u, init) =>
          JSON.parse(String(init!.body)).listId
            ? { listId: "list1", added: 1, alreadySaved: 1, alreadyUsers: 0, unsubscribed: 0, invalid: 0 }
            : { listId: "list9", added: 1, alreadySaved: 0, alreadyUsers: 0, unsubscribed: 0, invalid: 0 },
      }),
    )
    render(withToasts(<LeadsManager />))
    await screen.findByRole("table")
    openTab("Add & upload")
    expect(screen.getByLabelText("CSV file")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "kiran@example.test" } })
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Kiran" } })
    fireEvent.change(screen.getByLabelText(/^Company/), { target: { value: "Initech" } })
    const [oneList, manyList] = screen.getAllByLabelText<HTMLSelectElement>("Add to list")
    expect(oneList.value).toBe("__new__")
    // Smart lists fill themselves, so they aren't offered.
    expect(within(oneList).queryByRole("option", { name: /Clicked recently/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }))
    expect(await screen.findByText("Added kiran@example.test.")).toBeTruthy()
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      listName: "Added by hand",
      columns: [{ key: "company", label: "Company" }],
      leads: [{ email: "kiran@example.test", firstName: "Kiran", lastName: null, name: null, fields: { company: "Initech" } }],
    })

    fireEvent.change(screen.getByLabelText("Leads, one per line"), { target: { value: "a@example.test\nRavi Kumar <ravi@example.test>\nnot an email" } })
    expect(screen.getByText(/2 to add · 1 without a real email \(left out\)/)).toBeTruthy()
    fireEvent.change(manyList, { target: { value: "list1" } })
    fireEvent.click(screen.getByRole("button", { name: "Add 2 leads" }))
    expect(await screen.findByText("1 added · 1 already saved (now on this list too) · 1 without a real email (left out)")).toBeTruthy()
    expect(calls.filter((c) => c.method === "POST").at(-1)?.body).toMatchObject({
      listId: "list1",
      listName: "Delhi founders",
      leads: [
        { email: "a@example.test", name: null },
        { email: "ravi@example.test", name: "Ravi Kumar" },
      ],
    })
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
    expect(within(select).getByRole("option", { name: "Smart list: Clicked recently (1)" })).toHaveProperty("value", "leads:list:list3")
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
