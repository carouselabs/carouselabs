import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/lib/db"
import { exchangeCodeForToken, getLinkedInProfile } from "@/lib/linkedin"

// LinkedIn redirects here with ?code & ?state. We verify the state against the
// cookie set in /connect, exchange the code for a token, fetch the profile, and
// upsert the connection — then bounce back to the account settings page.
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url))

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")

  const cookieStore = await cookies()
  const storedState = cookieStore.get("linkedin_oauth_state")?.value

  const settingsUrl = new URL("/settings/account", req.url)

  // Bail out (with the state cookie cleared) on any failure or state mismatch.
  function fail() {
    settingsUrl.searchParams.set("linkedin", "error")
    const res = NextResponse.redirect(settingsUrl)
    res.cookies.delete("linkedin_oauth_state")
    return res
  }

  if (oauthError || !code || !state || !storedState || state !== storedState) {
    return fail()
  }

  try {
    const token = await exchangeCodeForToken(code)
    const profile = await getLinkedInProfile(token.accessToken)

    const user = await db.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.redirect(new URL("/sign-in", req.url))

    const expiresAt = new Date(Date.now() + token.expiresIn * 1000)

    await db.linkedInAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        linkedInId: profile.sub,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt,
        name: profile.name,
        pictureUrl: profile.picture,
      },
      update: {
        linkedInId: profile.sub,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt,
        name: profile.name,
        pictureUrl: profile.picture,
      },
    })

    settingsUrl.searchParams.set("linkedin", "connected")
    const res = NextResponse.redirect(settingsUrl)
    res.cookies.delete("linkedin_oauth_state")
    return res
  } catch (err) {
    console.error("[linkedin/callback]", err)
    return fail()
  }
}
