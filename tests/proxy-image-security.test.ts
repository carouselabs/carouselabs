import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), fetchPublicImage: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock("@/lib/safeRemoteImage", async (original) => ({
  ...await original<typeof import("@/lib/safeRemoteImage")>(), fetchPublicImage: mocks.fetchPublicImage,
}))
import { GET } from "@/app/api/proxy-image/route"
const request = (url: string) => new Request("https://app.test/api/proxy-image?url=" + encodeURIComponent(url))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", "https://images.example.com")
  mocks.getCurrentUser.mockResolvedValue({ id: "user-a" })
  mocks.fetchPublicImage.mockResolvedValue({ bytes: Buffer.from("PNG"), mediaType: "image/png" })
})
describe("authenticated image proxy", () => {
  it("denies direct unauthenticated calls before remote requests", async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    expect((await GET(request("https://images.example.com/a.png"))).status).toBe(401)
    expect(mocks.fetchPublicImage).not.toHaveBeenCalled()
  })
  it.each(["https://images.example.com.attacker.test/a", "https://images.example.com@attacker.test/a", "https://user:pass@images.example.com/a"])(
    "rejects origin/credential bypass %s", async (url) => {
      expect((await GET(request(url))).status).toBe(400)
      expect(mocks.fetchPublicImage).not.toHaveBeenCalled()
    })
  it("fails closed without configured image storage", async () => {
    vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", "")
    expect((await GET(request("https://images.example.com/a"))).status).toBe(400)
    expect(mocks.fetchPublicImage).not.toHaveBeenCalled()
  })
  it("returns correct bytes with private caching and no content sniffing", async () => {
    const res = await GET(request("https://images.example.com/a.png"))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("PNG")
    expect(res.headers.get("content-type")).toBe("image/png")
    expect(res.headers.get("cache-control")).toBe("private, no-store")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(mocks.fetchPublicImage).toHaveBeenCalledWith("https://images.example.com/a.png", { allowedOrigin: "https://images.example.com" })
  })
  it("returns a recoverable failure without leaking upstream error details", async () => {
    mocks.fetchPublicImage.mockRejectedValue(new Error("private-network-detail"))
    const res = await GET(request("https://images.example.com/a.png"))
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain("private-network-detail")
  })
})
