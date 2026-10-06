// A signed-out call to a private API (most often a session the page couldn't
// renew because Clerk was unreachable from the user's network) must answer a
// clear 401, not Clerk's bare 404 that made "Add intern" look broken. Pages
// still go through auth.protect() (sign-in), public routes stay public, and a
// signed-in call is unaffected. Runs the real proxy with Clerk stood in.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server"

const clerk = vi.hoisted(() => ({ userId: null as string | null, protect: vi.fn() }))

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const real = await importOriginal<typeof import("@clerk/nextjs/server")>()
  return {
    ...real,
    // The middleware wrapper calls our handler with a stand-in auth().
    clerkMiddleware:
      (handler: (auth: unknown, req: NextRequest, event: NextFetchEvent) => unknown) =>
      (req: NextRequest, event: NextFetchEvent) => {
        const auth = Object.assign(async () => ({ userId: clerk.userId }), { protect: clerk.protect })
        return handler(auth, req, event)
      },
  }
})

import { proxy } from "@/proxy"

const event = {} as NextFetchEvent
const request = (url: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(url, { method: init.method ?? "GET", headers: { cookie: "__session=x", ...init.headers } })

beforeEach(() => {
  clerk.userId = null
  // Clerk's real protect() throws a 404 response for a signed-out API call.
  clerk.protect.mockImplementation(async () => {
    throw new Error("protect() should not decide a private API call")
  })
})

describe("signed-out private API calls", () => {
  it("answer 401 with a message the page can show, on the admin host too", async () => {
    for (const url of ["https://carouselabs.com/api/posts", "https://admin.carouselabs.com/api/admin/interns"]) {
      const res = await proxy(
        request(url, { method: "POST", headers: { origin: new URL(url).origin, "content-type": "application/json" } }),
        event,
      )
      expect(res.status, url).toBe(401)
      expect(await res.json()).toEqual({
        error: "Your session has expired. Reload the page and sign in again.",
        code: "session_expired",
      })
    }
    expect(clerk.protect).not.toHaveBeenCalled()
  })

  it("a signed-in call goes through", async () => {
    clerk.userId = "user_1"
    const res = await proxy(request("https://admin.carouselabs.com/api/admin/interns"), event)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-middleware-next")).toBe("1")
  })
})

describe("everything else is unchanged", () => {
  it("pages still go through Clerk's protect (sign-in)", async () => {
    clerk.protect.mockImplementation(async () => {
      throw NextResponse.redirect("https://carouselabs.com/sign-in")
    })
    await expect(proxy(request("https://carouselabs.com/dashboard"), event)).rejects.toBeInstanceOf(Response)
    expect(clerk.protect).toHaveBeenCalledTimes(1)
  })

  it("public API routes stay public when signed out", async () => {
    const res = await proxy(request("https://carouselabs.com/api/maintenance-status"), event)
    expect(res.status).toBe(200)
    expect(clerk.protect).not.toHaveBeenCalled()
  })

  it("a cross-site write is still refused before any session check", async () => {
    const res = await proxy(
      request("https://carouselabs.com/api/posts", { method: "POST", headers: { origin: "https://evil.example" } }),
      event,
    )
    expect(res.status).toBe(403)
  })
})
