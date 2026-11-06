// @vitest-environment jsdom
// Share a post's page (components/admin/postEmail): what's still needed before
// it can go out, the live preview as fields change (whole or cut text, each
// kind of post), uploads and the pictures made for them, the AI filling the
// form from a screenshot and writing the words, the draft kept in the
// browser, and "Make a campaign". The server is faked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }))

import { PostEmailEditor } from "@/components/admin/postEmail/PostEmailEditor"
import { newPostEmail, pictureKeys, type PostEmail } from "@/lib/postEmail"

const R2 = "https://media.test/email-post"
type Call = { url: string; body: unknown }
let calls: Call[] = []
let uploads = 0

function respond(url: string, init?: RequestInit): Response {
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body
  calls.push({ url, body })
  if (url === "/api/admin/post-email/upload") {
    uploads++
    return Response.json({ url: `${R2}/up/${uploads}.jpg`, width: 400, height: 400 })
  }
  if (url === "/api/admin/post-email/pictures") {
    const email = (body as { email: Pick<PostEmail, "post" | "built"> }).email
    const full = { ...newPostEmail("2026-11-06"), post: { ...newPostEmail("2026-11-06").post, ...email.post } }
    const key = pictureKeys(full).header
    return Response.json({ built: key ? { header: { url: `${R2}/built/header-x-1116x236.jpg`, width: 1116, height: 236, key } } : {} })
  }
  if (url === "/api/admin/post-email/words") {
    return Response.json({
      words: { subject: "Comment before you post", preview: "Maya's 30 days", greeting: "Hi {{firstName}},", intro: "Maya tried something simple.", outro: "", signoff: "See you there,", button: { show: true, label: "Try Engage", url: "https://carouselabs.com/#extension" } },
    })
  }
  if (url === "/api/admin/post-email/screenshot") {
    return Response.json({
      read: {
        type: "image",
        author: { name: "Daniel Okafor", bio: "Founder, Northbeam", followers: "9,870", time: "5d" },
        caption: "Every founder made 3 of these.",
        captionCut: true,
        counts: { reactions: "1,204", comments: "186", reposts: "42" },
        photosTotal: 0,
        slides: { title: "", pages: 0 },
        videoDuration: "",
        poll: { question: "", options: [], votes: "", timeLeft: "" },
        article: { title: "", source: "", readTime: "", blurb: "" },
        link: { title: "", domain: "" },
        repost: { name: "", bio: "", time: "", text: "" },
        event: { title: "", date: "", when: "", place: "", attendees: "" },
        topComment: null,
        boxes: { authorPhoto: null, media: null, commentPhoto: null, repostPhoto: null },
      },
      pictures: { authorPhoto: { url: `${R2}/up/daniel.jpg`, width: 400, height: 400 }, media: { url: `${R2}/up/post.jpg`, width: 1116, height: 1116 }, commentPhoto: null, repostPhoto: null },
    })
  }
  if (url === "/api/admin/post-email/test") return Response.json({ ok: true, sentTo: "admin@carouselabs.com", built: {} })
  if (url.startsWith("/api/admin/leads")) return Response.json({ lists: [] })
  if (url === "/api/admin/senders") return Response.json({ senders: [] })
  return Response.json({ error: `unexpected ${url}` }, { status: 404 })
}

beforeEach(() => {
  calls = []
  uploads = 0
  localStorage.clear()
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => respond(url, init)))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const preview = () => (screen.getByTitle("Email preview") as HTMLIFrameElement).getAttribute("srcdoc") ?? ""
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement
const type = (name: string | RegExp, value: string) => fireEvent.change(field(name), { target: { value } })
const file = (name: string) => new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" })

async function open() {
  render(<PostEmailEditor />)
  await screen.findByRole("heading", { name: "Share a LinkedIn post" })
}

describe("a new email", () => {
  it("says what's missing, and can't be tested or sent yet", async () => {
    await open()
    const send = screen.getByText("Before it can go out:").parentElement!
    expect(within(send).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Write a subject",
      "Add the post's link",
      "Add the author's name",
      "Upload the author's photo",
      "Add the post's text",
    ])
    expect((screen.getByRole("button", { name: /Send me a test/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: /Make a campaign/ }) as HTMLButtonElement).disabled).toBe(true)
    // The preview shows gray hints where things go.
    expect(preview()).toContain("Author's name")
    expect(preview()).toContain("Hi Priya,")
  })
})

describe("filling it in", () => {
  it("the preview follows every field, the whole text or its first lines", async () => {
    await open()
    type("Name", "Maya Rao")
    type("Their headline (LinkedIn bio)", "Growth lead")
    type("Followers", "18,402")
    type("The post's text", "Line one\nLine two\nLine three\nLine four #Growth")
    expect(preview()).toContain("Maya Rao")
    expect(preview()).toContain("18,402 followers")
    expect(preview()).toContain("Line four")
    expect(preview()).toContain("#Growth</span>")
    fireEvent.click(screen.getByRole("radio", { name: /The first lines/ }))
    expect(preview()).not.toContain("Line four")
    expect(preview()).toContain("see more")
  })

  it("each kind of post shows its own fields; a poll's options and results show in the preview", async () => {
    await open()
    fireEvent.click(screen.getByRole("radio", { name: "Poll" }))
    type("Question", "How often do you comment?")
    fireEvent.click(screen.getByRole("button", { name: "+ Add an option" }))
    fireEvent.click(screen.getByRole("button", { name: "+ Add an option" }))
    type("Option 1", "Every day")
    type("Option 1 percent", "41")
    type("Option 2", "Never")
    type("Option 2 percent", "9")
    expect(preview()).toContain("How often do you comment?")
    expect(preview()).toContain("41%")
    fireEvent.click(screen.getByRole("switch", { name: /Show the results so far/ }))
    expect(preview()).not.toContain("41%")
    fireEvent.click(screen.getByRole("radio", { name: "Event" }))
    expect(screen.getByLabelText("Event name")).toBeTruthy()
    expect(screen.queryByLabelText("Question")).toBeNull()
  })

  it("an uploaded photo has its banner made on the server, then it's ready to test and send", async () => {
    await open()
    type("Subject", "The 10-minute habit")
    type("The post's link", "https://www.linkedin.com/feed/update/urn:li:activity:1/")
    type("Name", "Maya Rao")
    type("The post's text", "I only commented for 30 days.")
    fireEvent.change(screen.getByLabelText("Their photo"), { target: { files: [file("maya.png")] } })
    await waitFor(() => expect(calls.some((c) => c.url === "/api/admin/post-email/upload")).toBe(true))
    const upload = calls.find((c) => c.url === "/api/admin/post-email/upload")!.body as FormData
    expect(upload.get("kind")).toBe("photo")
    await waitFor(() => expect(preview()).toContain("header-x-1116x236.jpg"), { timeout: 3000 })
    // Only the parts the pictures are made from went to the server.
    const sent = calls.find((c) => c.url === "/api/admin/post-email/pictures")!.body as { email: { post: Record<string, unknown> } }
    expect(Object.keys(sent.email.post).sort()).toEqual(["author", "photos", "slides", "type", "video"])
    expect(screen.getByText(/Ready\. Send yourself a test/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Send me a test/ }))
    await waitFor(() => expect(calls.some((c) => c.url === "/api/admin/post-email/test")).toBe(true))
    expect((calls.find((c) => c.url === "/api/admin/post-email/test")!.body as { email: PostEmail }).email.subject).toBe("The 10-minute habit")

    fireEvent.click(screen.getByRole("button", { name: /Make a campaign/ }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByRole("radiogroup", { name: "How to use it" })).toBeNull()
    expect(within(dialog).getByText(/this shared post, its pictures included/)).toBeTruthy()
  }, 10_000)

  it("a changed banner colour makes its picture again; the old one isn't shown meanwhile", async () => {
    await open()
    fireEvent.change(screen.getByLabelText("Their photo"), { target: { files: [file("maya.png")] } })
    await waitFor(() => expect(preview()).toContain("header-x-1116x236.jpg"), { timeout: 3000 })
    const made = calls.filter((c) => c.url === "/api/admin/post-email/pictures").length
    fireEvent.click(screen.getByRole("radio", { name: "#211F1C" }))
    expect(preview()).not.toContain("header-x-1116x236.jpg")
    await waitFor(() => expect(calls.filter((c) => c.url === "/api/admin/post-email/pictures").length).toBe(made + 1), { timeout: 3000 })
    await waitFor(() => expect(preview()).toContain("header-x-1116x236.jpg"))
  }, 10_000)
})

describe("the AI", () => {
  it("fills the form from a screenshot and says what to check", async () => {
    await open()
    fireEvent.change(screen.getByLabelText("Screenshot of the post"), { target: { files: [file("shot.png")] } })
    await screen.findByText(/Filled in from the screenshot/)
    expect(screen.getByText(/cuts the post's text at “…more”/)).toBeTruthy()
    expect(field("Name").value).toBe("Daniel Okafor")
    expect(screen.getByRole("radio", { name: "Image" }).getAttribute("aria-checked")).toBe("true")
    expect(preview()).toContain("9,870 followers")
    expect(preview()).toContain(`${R2}/up/post.jpg`)
  })

  it("writes the words around the post", async () => {
    await open()
    fireEvent.click(screen.getByRole("button", { name: /Write with AI/ }))
    await waitFor(() => expect(field("Subject").value).toBe("Comment before you post"))
    const asked = calls.find((c) => c.url === "/api/admin/post-email/words")!.body as { goal: string }
    expect(asked.goal).toContain("CarouseLabs Engage")
    expect(preview()).toContain("Maya tried something simple.")
    expect(preview()).toContain("Try Engage")
  })
})

describe("the draft", () => {
  it("is kept in the browser and comes back; Start over clears it", async () => {
    await open()
    type("Subject", "Kept for later")
    await act(() => new Promise((r) => setTimeout(r, 500)))
    cleanup()
    await open()
    expect(field("Subject").value).toBe("Kept for later")
    fireEvent.click(screen.getByRole("button", { name: /Start over/ }))
    fireEvent.click(await screen.findByRole("button", { name: "Start over" }))
    await waitFor(() => expect(field("Subject").value).toBe(""))
  })

  it("an email sent before opens for editing (Use again → Edit first)", async () => {
    const before = newPostEmail("2026-10-01")
    before.subject = "Sent before"
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => (url.startsWith("/api/admin/sent-emails/content") ? Response.json({ post: before }) : respond(url, init))),
    )
    render(<PostEmailEditor reuse="campaign:c1" />)
    await waitFor(() => expect(field("Subject").value).toBe("Sent before"))
    // Its numbers are copied again today.
    expect(field("Numbers copied on").value).not.toBe("2026-10-01")
  })
})
