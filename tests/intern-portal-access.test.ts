// A new intern has an account but no customer profile. The (app) layout sent
// anyone without a finished profile to /onboarding, and on
// employee.carouselabs.com proxy.ts bounces /onboarding back to "/", so the
// portal never opened: the browser went round until "too many redirects".
// Follows every redirect through the real proxy and the real layout, the way a
// browser would, with Clerk and the database stood in.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, type NextFetchEvent } from "next/server"

class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect to ${to}`)
  }
}

const state = vi.hoisted(() => ({
  user: null as { profile: { onboardingDone: boolean } | null; subscription: null } | null,
  host: "",
}))

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const real = await importOriginal<typeof import("@clerk/nextjs/server")>()
  return {
    ...real,
    auth: async () => ({ userId: "clerk-a" }),
    clerkMiddleware:
      (handler: (auth: unknown, req: NextRequest, event: NextFetchEvent) => unknown) =>
      (req: NextRequest, event: NextFetchEvent) => {
        const auth = Object.assign(async () => ({ userId: "clerk-a" }), { protect: async () => {} })
        return handler(auth, req, event)
      },
  }
})
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => state.user }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: state.host }) }))
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: (to: string) => {
    throw new Redirected(to)
  },
}))
vi.mock("@/components/shell/AppChrome", () => ({ AppChrome: () => null }))
vi.mock("@/components/shell/AppFrame", () => ({ AppFrame: () => null }))
vi.mock("@/components/shared/MaintenanceBanner", () => ({ MaintenanceBanner: () => null }))
vi.mock("@/components/shell/ProfileReviewBanner", () => ({ ProfileReviewBanner: () => null }))
vi.mock("@/components/shell/UpgradeRequiredBanner", () => ({ UpgradeRequiredBanner: () => null }))

import { proxy } from "@/proxy"
import AppLayout from "@/app/(app)/layout"

const event = {} as NextFetchEvent

// Returns the route the browser finally lands on, or throws if it never does.
async function open(startUrl: string): Promise<string> {
  let url = new URL(startUrl)
  const hops: string[] = []
  for (let i = 0; i < 8; i++) {
    hops.push(url.pathname)
    const res = await proxy(
      new NextRequest(url, { headers: { host: url.host, cookie: "__session=x", accept: "text/html" } }),
      event,
    )
    const location = res.headers.get("location")
    if (location) {
      url = new URL(location, url)
      continue
    }
    const routed = new URL(res.headers.get("x-middleware-rewrite") ?? url).pathname
    // Only these routes sit under the (app) layout. /onboarding has its own.
    if (routed !== "/intern" && routed !== "/dashboard") return routed

    state.host = url.host
    try {
      await AppLayout({ children: null })
      return routed
    } catch (err) {
      if (!(err instanceof Redirected)) throw err
      url = new URL(err.to, url)
    }
  }
  throw new Error(`redirect loop: ${hops.join(" -> ")}`)
}

const newIntern = { profile: null, subscription: null }
const onboarded = { profile: { onboardingDone: true }, subscription: null }

beforeEach(() => {
  state.user = newIntern
})

describe("opening the intern portal", () => {
  it("opens for a new intern with no customer profile", async () => {
    expect(await open("https://employee.carouselabs.com/")).toBe("/intern")
  })

  it.each(["/dashboard", "/onboarding", "/onboarding/step-1"])(
    "opens after Clerk's sign-in or sign-up redirect to %s",
    async (path) => {
      expect(await open(`https://employee.carouselabs.com${path}`)).toBe("/intern")
    },
  )

  it("still opens for an intern who finished onboarding", async () => {
    state.user = onboarded
    expect(await open("https://employee.carouselabs.com/")).toBe("/intern")
  })
})

describe("customers on the main site", () => {
  it("still go through onboarding before the app", async () => {
    expect(await open("https://carouselabs.com/dashboard")).toBe("/onboarding")
  })

  it("reach the app once onboarding is finished", async () => {
    state.user = onboarded
    expect(await open("https://carouselabs.com/dashboard")).toBe("/dashboard")
  })
})
