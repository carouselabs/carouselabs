// lib/extensionAuth.ts
// Auth for browser-extension-ideas/ (and any future extension) — it has no
// Clerk session cookie to send, so it authenticates with a long-lived bearer
// key instead (see prisma/schema.prisma's ExtensionApiKey comment for why
// this is a new design, not a reused earlier pattern).
import crypto from "node:crypto"
import { db } from "@/lib/db"
import type { User } from "@prisma/client"

const KEY_PREFIX = "cl_ext_"

export function hashExtensionKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex")
}

// "cl_ext_" + 32 random bytes hex — prefixed so a leaked key is recognizable
// at a glance (same idea as Stripe's `sk_live_`/GitHub's `ghp_`).
export function generateExtensionKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`
}

// Resolves the Authorization: Bearer <key> header on an extension request to
// the user it belongs to. Best-effort lastUsedAt bump — never blocks the
// actual request on that write.
export async function getUserFromExtensionKey(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization")
  const key = auth?.replace(/^Bearer\s+/i, "").trim()
  if (!key || !key.startsWith(KEY_PREFIX)) return null

  const record = await db.extensionApiKey.findUnique({
    where: { keyHash: hashExtensionKey(key) },
    include: { user: true },
  })
  if (!record) return null

  db.extensionApiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {
    // best-effort — a failed timestamp bump must never fail the real request
  })

  return record.user
}
