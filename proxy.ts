import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
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

const handler = clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect()
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
