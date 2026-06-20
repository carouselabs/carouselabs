import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { randomBytes } from "crypto"
import { buildLinkedInAuthUrl } from "@/lib/linkedin"

// Kicks off the LinkedIn OAuth flow: mints a CSRF state token, stashes it in a
// short-lived httpOnly cookie, and redirects the user to LinkedIn's consent screen.
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url))

  const state = randomBytes(16).toString("hex")
  const res = NextResponse.redirect(buildLinkedInAuthUrl(state))

  // sameSite: "lax" so the cookie is sent on the top-level GET redirect back
  // from LinkedIn to /api/linkedin/callback.
  res.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  })

  return res
}
