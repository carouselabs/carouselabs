import { beforeEach, describe, expect, it, vi } from "vitest"
import { PassThrough } from "node:stream"
import { EventEmitter } from "node:events"
import type { IncomingMessage, RequestOptions } from "node:http"

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }))
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }))
vi.mock("node:http", () => ({ request: mocks.request }))
vi.mock("node:https", () => ({ request: mocks.request }))
import { fetchPublicImage, isPublicAddress, isSafeExternalUrl } from "@/lib/safeRemoteImage"
import { validateReferenceImage } from "@/lib/validateImage"

type Reply = { status?: number; headers?: Record<string, string>; chunks?: Buffer[] }
function transport(replies: Reply[]) {
  mocks.request.mockImplementation((_url: URL, options: RequestOptions, callback: (res: IncomingMessage) => void) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void }
    req.end = () => {
      queueMicrotask(() => {
        const reply = replies.shift()!
        const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> }
        res.statusCode = reply.status ?? 200
        res.headers = reply.headers ?? { "content-type": "image/png" }
        callback(res as unknown as IncomingMessage)
        for (const chunk of reply.chunks ?? [Buffer.from("image")]) {
          if (!res.destroyed) res.write(chunk)
        }
        if (!res.destroyed) res.end()
      })
    }
    options.signal?.addEventListener("abort", () => req.emit("error", new Error("aborted")), { once: true })
    return req
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
})

describe("public image network boundary", () => {
  it.each(["127.0.0.1", "10.1.2.3", "100.64.1.2", "169.254.169.254", "172.16.1.1", "192.168.1.1",
    "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2002:7f00:1::"])(
    "rejects non-public destination %s", (address) => expect(isPublicAddress(address)).toBe(false))
  it.each(["http://127.1/a", "http://0x7f000001/a", "http://2130706433/a", "http://[::1]/a",
    "https://name:password@example.com/a", "file:///a", "https://example.com:3000/a", "http://localhost./a"])(
    "rejects unsafe URL or DNS before connection: %s", async (url) => {
      mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }])
      await expect(fetchPublicImage(url)).rejects.toThrow()
      expect(mocks.request).not.toHaveBeenCalled()
    })
  it("accepts global IPv4 and IPv6", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true)
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true)
    expect(isSafeExternalUrl("https://images.example.com/a.png")).toBe(true)
  })
  it("rejects mixed public/private DNS results before making any request", async () => {
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }])
    await expect(fetchPublicImage("https://images.example.com/a")).rejects.toThrow("unsafe")
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it("pins the actual connection to the approved lookup result and preserves TLS hostname", async () => {
    transport([{}])
    await fetchPublicImage("https://images.example.com/a")
    const [url, options] = mocks.request.mock.calls[0]
    expect(url.hostname).toBe("images.example.com")
    const callback = vi.fn()
    options.lookup(url.hostname, {}, callback)
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4)
    expect(options.agent).toBe(false)
    expect(options.family).toBe(4)
    expect(mocks.lookup).toHaveBeenCalledTimes(1)
  })
  it("blocks redirect to metadata even from a public source", async () => {
    transport([{ status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }])
    await expect(fetchPublicImage("https://images.example.com/a")).rejects.toThrow("unsafe")
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })
  it("resolves and checks redirected hostnames too", async () => {
    mocks.lookup.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }])
    transport([{ status: 302, headers: { location: "https://internal.example.com/a" } }])
    await expect(fetchPublicImage("https://images.example.com/a")).rejects.toThrow("unsafe")
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })
  it("prevents proxy redirect away from the configured origin", async () => {
    transport([{ status: 302, headers: { location: "https://other.example.com/a" } }])
    await expect(fetchPublicImage("https://images.example.com/a", { allowedOrigin: "https://images.example.com" })).rejects.toThrow("Invalid")
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })
  it("enforces a streamed byte limit when Content-Length is absent", async () => {
    transport([{ chunks: [Buffer.alloc(3), Buffer.alloc(3)] }])
    await expect(fetchPublicImage("https://images.example.com/a", { maxBytes: 5 })).rejects.toThrow("Image too large")
  })
  it("rejects HTML and SVG before buffering or proxying content", async () => {
    transport([{ headers: { "content-type": "image/svg+xml" } }])
    await expect(fetchPublicImage("https://images.example.com/a")).rejects.toThrow("supported image")
  })
  it("bounds redirect loops", async () => {
    transport(Array.from({ length: 4 }, () => ({ status: 302, headers: { location: "/again" } })))
    await expect(fetchPublicImage("https://images.example.com/a")).rejects.toThrow("Too many")
    expect(mocks.request).toHaveBeenCalledTimes(4)
  })
  it("bounds stalled DNS resolution", async () => {
    vi.useFakeTimers()
    try {
      mocks.lookup.mockReturnValue(new Promise(() => {}))
      const pending = fetchPublicImage("https://images.example.com/a", { timeoutMs: 50 })
      const rejected = expect(pending).rejects.toThrow("Timed out")
      await vi.advanceTimersByTimeAsync(51)
      await rejected
      expect(mocks.request).not.toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
})

describe("reference image validation", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64")
  it("accepts canonical PNG data", () => expect(validateReferenceImage(png, "image/png").ok).toBe(true))
  it("rejects invalid base64 rather than silently dropping characters", () => {
    expect(validateReferenceImage(png + "!!!!", "image/png").ok).toBe(false)
  })
  it("rejects an encoded oversize value before decoding", () => {
    expect(validateReferenceImage("A".repeat(7_100_000), "image/png")).toEqual({ ok: false, error: "Reference image too large (max 5MB)" })
  })
  it("rejects HTML mislabeled as PNG and unsupported SVG", () => {
    expect(validateReferenceImage(Buffer.from("<html>").toString("base64"), "image/png").ok).toBe(false)
    expect(validateReferenceImage(png, "image/svg+xml").ok).toBe(false)
  })
})
