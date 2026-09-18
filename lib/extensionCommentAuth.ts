// lib/extensionCommentAuth.ts
// Auth for browser-extension-comment/ — it has no Clerk session cookie to
// send, so it authenticates with a long-lived bearer token instead, minted
// via app/api/ext/auth/exchange from an active Clerk web session. Mirrors
// lib/extensionAuth.ts's structure exactly (see prisma/schema.prisma's
// ExtensionToken comment for why this is a separate model/token from
// ExtensionApiKey, not a reused one).
import crypto from "node:crypto"
import { db } from "@/lib/db"
import type { User } from "@prisma/client"

const TOKEN_PREFIX = "cl_cmt_"

export function hashCommentExtensionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// "cl_cmt_" + 32 random bytes hex — prefixed so a leaked token is
// recognizable at a glance (same idea as ExtensionApiKey's "cl_ext_").
export function generateCommentExtensionToken(): string {
  return `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("hex")}`
}

// Resolves the Authorization: Bearer <token> header on an extension request
// to the user it belongs to. Best-effort lastUsedAt bump — never blocks the
// actual request on that write. Revoked tokens (revokedAt set) never match.
export async function getUserFromCommentExtensionToken(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization")
  const token = auth?.replace(/^Bearer\s+/i, "").trim()
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null

  const record = await db.extensionToken.findFirst({
    where: { tokenHash: hashCommentExtensionToken(token), revokedAt: null },
    include: { user: true },
  })
  if (!record) return null

  db.extensionToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      // best-effort — a failed timestamp bump must never fail the real request
    })

  return record.user
}
