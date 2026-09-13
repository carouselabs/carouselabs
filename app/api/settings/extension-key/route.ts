// app/api/settings/extension-key/route.ts — manage the user's
// browser-extension-ideas/ credential (see lib/extensionAuth.ts). The
// plaintext key is only ever returned from POST, at the moment it's
// generated — GET only reports whether one exists, never the key itself.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateExtensionKey, hashExtensionKey } from "@/lib/extensionAuth"

// GET /api/settings/extension-key — status only (never the plaintext key,
// which isn't stored anywhere after generation).
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existing = await db.extensionApiKey.findUnique({
    where: { userId: user.id },
    select: { label: true, lastUsedAt: true, createdAt: true },
  })

  return NextResponse.json({ hasKey: !!existing, ...existing })
}

// POST /api/settings/extension-key — generate a new key, replacing any
// existing one (one active key per user for now). Returns the plaintext key
// exactly once — the caller must show/copy it immediately.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const key = generateExtensionKey()
  const keyHash = hashExtensionKey(key)

  await db.extensionApiKey.upsert({
    where: { userId: user.id },
    create: { userId: user.id, keyHash },
    update: { keyHash, lastUsedAt: null },
  })

  return NextResponse.json({ key })
}

// DELETE /api/settings/extension-key — revoke the key (extension stops
// working until a new one is generated and re-pasted into it).
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.extensionApiKey.deleteMany({ where: { userId: user.id } })
  return NextResponse.json({ ok: true })
}
