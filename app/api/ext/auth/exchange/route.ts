// app/api/ext/auth/exchange/route.ts — called from the CarouseLabs web app
// (with an active Clerk session) to mint a bearer token for
// browser-extension-comment/, which has no session cookie of its own to
// send. Same hash-only-storage pattern as ExtensionApiKey (see
// lib/extensionAuth.ts + prisma/schema.prisma's ExtensionApiKey comment):
// only tokenHash (SHA-256 of the actual token) is ever stored — the
// plaintext token is returned exactly once, here, and never again.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateCommentExtensionToken, hashCommentExtensionToken } from "@/lib/extensionCommentAuth"

// POST /api/ext/auth/exchange — body: { device?: string }. Requires an
// active Clerk web session; issues a new token (does not revoke any existing
// ones — unlike ExtensionApiKey, a user may have one token per device/browser
// install at once, see ExtensionToken's schema comment).
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let device: string | null = null
  try {
    const body = await req.json()
    if (typeof body?.device === "string" && body.device.trim()) {
      device = body.device.trim().slice(0, 200)
    }
  } catch {
    // no/empty body is fine — device is optional
  }

  const token = generateCommentExtensionToken()
  const tokenHash = hashCommentExtensionToken(token)

  await db.extensionToken.create({
    data: { userId: user.id, tokenHash, device },
  })

  return NextResponse.json({ token })
}
