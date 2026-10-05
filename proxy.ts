import { isAllowedMutation } from "@/lib/requestSecurity"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { hasClerkSessionCookie } from "@/lib/clerkSessionCookie"
import {
  REFERRAL_CODE_PATTERN,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referralConstants"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/refund(.*)",
  "/contact(.*)",
  "/tools(.*)", // Free client-side Tap & Hold image maker (/tools/tap-hold-maker)
  // The programmatic SEO pages under these paths were removed. The paths stay
  // public so a signed-out visitor on an old search-result link gets a plain
  // "not found" page; otherwise auth.protect() would send them to sign-in.
  "/for(.*)",
  "/ideas(.*)",
  "/how-to(.*)",
  "/vs(.*)",
  "/strategy(.*)",
  "/tap-hold(.*)",
  "/generators(.*)",
  "/best(.*)",
  "/answers(.*)",
  "/formats(.*)",
  "/speed(.*)",
  "/thumbnails(.*)",
  "/verify-certificate(.*)", // Public intern-certificate verification page
  "/start(.*)", // Public link-in-bio Start Pages (carouselabs.com/start/[slug])
  "/l/(.*)", // Public short-link redirects (carouselabs.com/l/[slug])
  // "Buy the extension" buttons. The handler sends signed-out visitors to
  // sign-up itself (then back here), so Clerk mustn't redirect them first.
  "/checkout/extension",
  "/sitemap.xml",
  "/robots.txt",
  "/api/contact(.*)",
  "/api/verify-certificate(.*)", // Public — looks up a certificate by its own opaque code, no session
  "/api/start-page/click(.*)", // Public — click-tracking redirect, hit by anonymous Start Page visitors
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/lemonsqueezy(.*)",
  "/api/webhooks/resend(.*)",
  "/api/maintenance-status(.*)",
  // Vercel Cron invokes these server-to-server with a CRON_SECRET header —
  // never a Clerk session. Without this exemption, Clerk's own
  // auth.protect() intercepts the request first and returns a 404 (its
  // documented behavior for unauthenticated non-page requests) before the
  // route's own CRON_SECRET check ever runs. Each cron route still
  // authenticates itself independently — this only lets that check happen.
  // Trailing slash before the wildcard is deliberate: "/api/cron(.*)" also
  // matched lookalikes such as /api/cronx/..., since the wildcard sat directly
  // after "cron". Nothing served those paths, but the exemption is what lets a
  // request skip Clerk entirely, so it should cover only real sub-paths.
  // Nothing serves bare /api/cron, so requiring the slash breaks no route.
  "/api/cron/(.*)",
  // browser-extension-comment/ calls these with an Authorization: Bearer
  // <token> header, not a Clerk session cookie — same reasoning as
  // /api/cron above: without this
  // exemption Clerk's auth.protect() intercepts the request first and
  // 307-redirects it to /sign-in before the route's own bearer-token check
  // (see lib/extensionCommentAuth.ts) ever runs. The one exception is
  // /api/ext/auth/exchange, which DOES require a real Clerk session (it
  // mints a token FROM one) — it stays exempt from the middleware's
  // auth.protect() like its siblings here, but calls getCurrentUser() (and
  // returns its own 401 JSON, not a redirect) itself to enforce that.
  "/api/ext(.*)",
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
// Clerk's NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL (/dashboard) and
// NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL (/onboarding/step-1) send the browser
// there after auth no matter which host it started on. Neither route exists
// under /admin or /intern, so both bounce back to the subdomain's own root
// instead of being blindly prefixed — otherwise the very first sign-in from
// a subdomain would 404.
const REDIRECT_TO_ROOT_PATHS = new Set(["/dashboard", "/onboarding", "/onboarding/step-1"])
// CarouseLabs' content-creation pages — interns should never reach these
// via employee.carouselabs.com, even by typing the URL directly. Listed
// explicitly (rather than relying on the generic /intern-prefix-then-404
// fallback below) so a direct hit lands back on the intern portal instead
// of a bare 404.
const EMPLOYEE_BLOCKED_PREFIXES = ["/generate", "/thumbnail", "/content-hub", "/history", "/pinned"]

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isSubdomainPassthrough(pathname: string): boolean {
  return matchesPrefix(pathname, SUBDOMAIN_PASSTHROUGH_PREFIXES)
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

      const shouldBounceToRoot =
        originalPathname.startsWith(otherRoot) ||
        REDIRECT_TO_ROOT_PATHS.has(originalPathname) ||
        (isEmployeeHost && matchesPrefix(originalPathname, EMPLOYEE_BLOCKED_PREFIXES))

      if (shouldBounceToRoot) {
        // Cross-namespace attempt (e.g. /intern on admin.carouselabs.com),
        // a shared post-auth redirect target, or (on the employee host) a
        // CarouseLabs content-creation page — bounce back to this
        // subdomain's own root instead of 404ing or leaking the full app.
        const url = req.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      if (!originalPathname.startsWith(root) && !isSubdomainPassthrough(originalPathname)) {
        req.nextUrl.pathname = originalPathname === "/" ? root : `${root}${originalPathname}`
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

// ── Referral link capture ────────────────────────────────────────────
// ?ref=CODE on any page (not just "/", in case a referral link ever points
// deeper) is captured into an httpOnly cookie so it survives the sign-up
// flow — Clerk's webhook runs server-to-server and can never see the
// browser's cookies directly, so the actual hand-off to that webhook
// happens via the sign-up page reading this cookie server-side and passing
// it to Clerk's <SignUp unsafeMetadata={{ referralCode }}> (see
// app/(auth)/sign-up/[[...sign-up]]/page.tsx) — Clerk carries unsafeMetadata
// through to the user.created webhook payload's data.unsafe_metadata,
// confirmed against the installed @clerk/backend types (UserJSON.unsafe_metadata).
// First-touch attribution: never overwrite an already-set cookie, so a
// later (possibly bad-faith) ?ref= link can't hijack an earlier legitimate
// referral before signup completes.
function withReferralCapture(request: NextRequest, response: Response): Response {
  // clerkMiddleware's return type is the generic NextMiddlewareResult
  // (NextResponse | Response | null | undefined) — only NextResponse
  // exposes .cookies. Every path in `handler` above actually returns a
  // NextResponse (or falls through to the NextResponse.next() default), so
  // this narrowing never skips a real response in practice; it's just a
  // safe no-op if that ever changes.
  if (!(response instanceof NextResponse)) return response

  const ref = request.nextUrl.searchParams.get("ref")
  if (!ref || request.cookies.has(REFERRAL_COOKIE_NAME)) return response

  const code = ref.trim().toUpperCase()
  if (!REFERRAL_CODE_PATTERN.test(code)) return response // malformed — ignore, don't cookie garbage

  response.cookies.set(REFERRAL_COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  })
  return response
}

// browser-extension-comment/ calls these with an Authorization: Bearer header
// and no cookies at all, so Clerk has nothing to do on them — every one
// authenticates itself (lib/extensionCommentAuth.ts). Listing them as public
// above is not enough: clerkMiddleware still RUNS, and against a development
// Clerk instance a cookieless request triggers its dev-browser handshake,
// which rewrites the request and makes the route 404 (confirmed locally:
// every /api/ext/* route 404'd from curl and from the extension, while
// /api/credits/consume still resolved). Skipping the middleware entirely for
// them fixes local dev and changes nothing in production, where these routes
// were already exempt from auth.protect().
//
// /api/ext/auth/exchange is the one exception: it MINTS a token from a real
// Clerk session, so it needs clerkMiddleware to have run for getCurrentUser()
// to see one.
//
// The website's Extension section (app/(app)/extension) also calls /api/ext/*
// — with the site's session cookie and no Authorization header — and Clerk's
// auth() only works where clerkMiddleware ran. So Clerk is skipped only for
// the extension's own requests (an Authorization header) and cookieless ones;
// a request carrying a Clerk session cookie goes through it like any page.
const CLERK_SESSION_EXT_ROUTES = new Set(["/api/ext/auth/exchange"])

function skipsClerk(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith("/api/ext/") || CLERK_SESSION_EXT_ROUTES.has(pathname)) return false
  if (request.headers.get("authorization")) return true
  return !hasClerkSessionCookie(request.cookies.getAll().map((cookie) => cookie.name))
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isAllowedMutation(request)) return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 })
  if (skipsClerk(request)) {
    return NextResponse.next()
  }

  const response = (await handler(request, event)) ?? NextResponse.next()
  return withReferralCapture(request, response)
}


export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
    "/(api|trpc)(.*)",
  ],
}
