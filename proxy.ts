import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/refund(.*)",
  "/contact(.*)",
  // ── Marketing / programmatic SEO pages — must be publicly crawlable ──
  "/for(.*)", // 112 niche landing pages
  "/ideas(.*)", // 112 carousel-ideas pages
  "/how-to(.*)", // 112 step-by-step guide pages
  "/vs(.*)", // competitor comparison pages
  "/tools(.*)", // 112 per-niche AI tools pages
  "/tools/tap-hold-maker(.*)", // Free client-side image maker
  "/strategy(.*)", // 112 per-niche content-strategy playbook pages
  "/tap-hold(.*)", // 60 Tap & Hold Image Maker SEO articles + hub
  "/generators(.*)", // 40 generic product/feature-keyword SEO articles + hub
  "/best(.*)", // 30 "best-of" ranked listicle SEO articles + hub
  "/answers(.*)", // 100 direct-answer SEO pages + hub
  "/formats(.*)", // 216 content-format SEO pages + hub
  "/speed(.*)", // 500 speed-focused SEO pages + hub
  "/thumbnails(.*)", // 10 thumbnail-keyword SEO pages + hub
  "/verify-certificate(.*)", // Public intern-certificate verification page
  "/sitemap.xml",
  "/robots.txt",
  "/api/contact(.*)",
  "/api/verify-certificate(.*)", // Public — looks up a certificate by its own opaque code, no session
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/lemonsqueezy(.*)",
  "/api/maintenance-status(.*)",
  // Vercel Cron invokes these server-to-server with a CRON_SECRET header —
  // never a Clerk session. Without this exemption, Clerk's own
  // auth.protect() intercepts the request first and returns a 404 (its
  // documented behavior for unauthenticated non-page requests) before the
  // route's own CRON_SECRET check ever runs. Each cron route still
  // authenticates itself independently — this only lets that check happen.
  "/api/cron(.*)",
])

// ── Subdomain-based routing ──────────────────────────────────────────────
// admin.carouselabs.com and employee.carouselabs.com are the SAME Next.js
// deployment as carouselabs.com (one Vercel project, both domains attached
// under Settings → Domains — see the deployment note further down). A
// request's Host header tells us which subdomain it came in on, and we
// internally rewrite it into the existing /admin or /intern route subtree
// so e.g. admin.carouselabs.com/interns transparently serves /admin/interns
// while the URL bar stays prefix-free. Everything downstream — page
// components, API routes, and the Clerk auth check just below — sees a
// normal /admin or /intern request and needs no subdomain-awareness.
//
// A few paths are always left un-prefixed, regardless of host:
//  - /sign-in, /sign-up: Clerk's own auth pages must resolve to themselves
//    on every host, or signing in from a subdomain would break.
//  - /api/admin(.*), /api/intern(.*): the admin and intern UIs already call
//    these by their real paths (e.g. fetch("/api/admin/users")), so
//    rewriting them would break every existing API call from those pages.
//  - /api/webhooks(.*), /api/cron(.*): these are always called server-to-
//    server against the primary domain, never through these subdomains, but
//    are excluded here too defensively.
// Clerk's NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL (/dashboard) and
// NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL (/onboarding/step-1) send the browser
// there after auth no matter which host it started on. Neither route exists
// under /admin or /intern, so both are mapped straight to the subdomain's
// own root instead of being blindly prefixed — otherwise the very first
// sign-in from a subdomain would 404.
const ADMIN_HOST_PREFIX = "admin."
const EMPLOYEE_HOST_PREFIX = "employee."
const SUBDOMAIN_PASSTHROUGH_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/api/admin",
  "/api/intern",
  "/api/webhooks",
  "/api/cron",
]
const POST_AUTH_REDIRECT_PATHS = new Set(["/dashboard", "/onboarding", "/onboarding/step-1"])

function isSubdomainPassthrough(pathname: string): boolean {
  return SUBDOMAIN_PASSTHROUGH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

const handler = clerkMiddleware(
  async (auth, req) => {
    const hostname = req.headers.get("host") || ""
    const isAdminHost = hostname.startsWith(ADMIN_HOST_PREFIX)
    const isEmployeeHost = hostname.startsWith(EMPLOYEE_HOST_PREFIX)
    const originalPathname = req.nextUrl.pathname

    if (isAdminHost || isEmployeeHost) {
      const root = isAdminHost ? "/admin" : "/intern"
      const otherRoot = isAdminHost ? "/intern" : "/admin"

      if (originalPathname.startsWith(otherRoot)) {
        // Cross-namespace attempt (e.g. /intern on admin.carouselabs.com) —
        // bounce back to this subdomain's own root instead of 404ing.
        const url = req.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      if (!originalPathname.startsWith(root) && !isSubdomainPassthrough(originalPathname)) {
        req.nextUrl.pathname =
          originalPathname === "/" || POST_AUTH_REDIRECT_PATHS.has(originalPathname)
            ? root
            : `${root}${originalPathname}`
      }
    }

    // isPublicRoute reads req.nextUrl.pathname live, so this correctly
    // evaluates against the rewritten path above — /admin and /intern
    // routes are protected exactly as they already were pre-subdomain.
    if (!isPublicRoute(req)) {
      await auth.protect()
    }

    if (req.nextUrl.pathname !== originalPathname) {
      return NextResponse.rewrite(req.nextUrl)
    }
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
)

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return handler(request, event)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
    "/(api|trpc)(.*)",
  ],
}
