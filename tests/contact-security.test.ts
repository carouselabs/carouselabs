import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ limit: vi.fn(), send: vi.fn() }))
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class {
  static slidingWindow() { return {} }
  limit = mocks.limit
} }))
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }))
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send } } }))
import { POST } from "@/app/api/contact/route"

const valid = { name: "Test User", email: "test@example.com", subject: "Help", message: "Example message" }
const request = (body: unknown) => new Request("https://app.test/api/contact", {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
})
beforeEach(() => {
  vi.resetAllMocks()
  mocks.limit.mockResolvedValue({ success: true })
  mocks.send.mockResolvedValue({ data: { id: "local-email" }, error: null })
})

describe("public contact input and paid-email boundary", () => {
  it.each([null, [], 123, { ...valid, name: {} }, { ...valid, email: 123 }, { ...valid, subject: [] }, { ...valid, message: false }])(
    "rejects malformed JSON shapes without throwing or sending email: %j", async (body) => {
      expect((await POST(request(body))).status).toBe(400)
      expect(mocks.send).not.toHaveBeenCalled()
    })
  it.each([
    { ...valid, name: "a".repeat(101) }, { ...valid, email: "a".repeat(250) + "@test.com" },
    { ...valid, subject: "a".repeat(201) }, { ...valid, message: "a".repeat(10_001) },
    { ...valid, subject: "Help\r\nInjected: header" }, { ...valid, email: "invalid" },
  ])("rejects bounded-field and header-injection violations", async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it("limits streamed bytes even with a falsely small Content-Length", async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(33 * 1024))
        controller.enqueue(new Uint8Array(33 * 1024))
      },
      cancel() { cancelled = true },
    })
    // Node requires duplex for streaming requests; browsers/server Request
    // objects expose the same body stream to the route handler.
    const req = new Request("https://app.test/api/contact", {
      method: "POST", body, duplex: "half", headers: { "content-length": "1" },
    } as RequestInit)
    expect((await POST(req)).status).toBe(400)
    expect(cancelled).toBe(true)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it("bounds a stalled request body and cancels it without emailing", async () => {
    vi.useFakeTimers()
    try {
      let cancelled = false
      const body = new ReadableStream({ cancel() { cancelled = true } })
      const req = new Request("https://app.test/api/contact", { method: "POST", body, duplex: "half" } as RequestInit)
      const pending = POST(req)
      await vi.advanceTimersByTimeAsync(10_001)
      expect((await pending).status).toBe(400)
      expect(cancelled).toBe(true)
      expect(mocks.send).not.toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
  it("enforces a denied limit and fails closed on timeout-success or Redis outage", async () => {
    mocks.limit.mockResolvedValueOnce({ success: false })
      .mockResolvedValueOnce({ success: true, reason: "timeout" }).mockRejectedValueOnce(new Error("private Redis detail"))
    expect((await POST(request(valid))).status).toBe(429)
    expect((await POST(request(valid))).status).toBe(503)
    const response = await POST(request(valid))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain("private Redis")
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it("escapes untrusted email HTML and only reports success after provider acceptance", async () => {
    expect((await POST(request({ ...valid, message: '<script>alert("test")</script>' }))).status).toBe(200)
    const email = mocks.send.mock.calls[0][0]
    expect(email.html).toContain("&lt;script&gt;")
    expect(email.html).not.toContain("<script>")
    expect(email.to).toBe("support@carouselabs.com")
  })
  it("does not retry ambiguous email failures or expose provider payloads", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.send.mockRejectedValueOnce(new Error("private email body or token"))
    const response = await POST(request(valid))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain("private")
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logs.mock.calls)).not.toContain("private")
  })
})
