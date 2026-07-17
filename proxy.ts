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
  "/tools(.*)", // reserved: future marketing tools pages
  "/strategy(.*)", // reserved: future strategy pages
  "/sitemap.xml",
  "/robots.txt",
  "/api/contact(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/lemonsqueezy(.*)",
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
