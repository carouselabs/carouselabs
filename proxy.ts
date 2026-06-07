import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import type { NextFetchEvent, NextRequest } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk(.*)",
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
