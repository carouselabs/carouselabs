import { describe, expect, it } from "vitest"
import { isAllowedMutation } from "@/lib/requestSecurity"
describe("browser request origin", () => {
  const request = (headers: Record<string,string>, path = "/api/posts") => new Request("https://carouselabs.com" + path, { method: "POST", headers })
  it("allows same-origin writes", () => expect(isAllowedMutation(request({ origin: "https://carouselabs.com" }))).toBe(true))
  it("rejects malicious origins and null origins", () => {
    for (const origin of ["https://attacker.example", "https://carouselabs.com.attacker.example", "null"]) expect(isAllowedMutation(request({ origin }))).toBe(false)
  })
  it("rejects cross-site writes without Origin", () => expect(isAllowedMutation(request({ "sec-fetch-site": "cross-site" }))).toBe(false))
  it("preserves signed webhook and explicit bearer authentication", () => {
    expect(isAllowedMutation(request({ origin: "https://provider.example" }, "/api/webhooks/clerk"))).toBe(true)
    expect(isAllowedMutation(request({ origin: "chrome-extension://client", authorization: "Bearer token" }))).toBe(true)
  })
  it("does not exempt webhook lookalikes", () => expect(isAllowedMutation(request({ origin: "https://attacker.example" }, "/api/webhooks-fake/write"))).toBe(false))
})
