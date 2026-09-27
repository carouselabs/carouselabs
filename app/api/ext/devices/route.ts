// app/api/ext/devices/route.ts — the browsers this account's LinkedIn
// extension is signed in on (one ExtensionToken each, see
// app/api/ext/auth/exchange), for the website's Extension overview.
// Either caller (getExtensionUser). Token hashes never leave the server.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const tokens = await db.extensionToken.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, device: true, lastUsedAt: true, createdAt: true },
  })

  return NextResponse.json({
    devices: tokens.map((t) => ({
      id: t.id,
      device: t.device,
      lastUsedAt: t.lastUsedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
  })
}
