// app/api/ext/auth/signout/route.ts — revokes the extension token the request
// arrived with, so signing out of the side panel ends that install's access
// without touching the user's other devices.
//
// Revokes by hashing the presented token and matching on tokenHash, rather
// than clearing every token for the user: each browser install holds its own
// token (see the `device` column on ExtensionToken), and signing out on one
// machine should not sign the user out everywhere.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  getUserFromCommentExtensionToken,
  hashCommentExtensionToken,
} from "@/lib/extensionCommentAuth"

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  // Scoped by userId as well as the hash: the hash alone would be enough, but
  // this keeps the ownership rule explicit and consistent with the other ext
  // routes. Already-revoked tokens are excluded so a repeat call is a no-op
  // rather than moving revokedAt forward.
  await db.extensionToken.updateMany({
    where: { userId: user.id, tokenHash: hashCommentExtensionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
