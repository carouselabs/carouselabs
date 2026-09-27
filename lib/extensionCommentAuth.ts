// lib/extensionCommentAuth.ts
// Auth for browser-extension-comment/ — it has no Clerk session cookie to
// send, so it authenticates with a long-lived bearer token instead, minted
// via app/api/ext/auth/exchange from an active Clerk web session. Mirrors
// lib/extensionAuth.ts's structure exactly (see prisma/schema.prisma's
// ExtensionToken comment for why this is a separate model/token from
// ExtensionApiKey, not a reused one).
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
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

// The routes the website's Extension section shares with the side panel
// (profiles, history, settings, account — never generation) accept either
// caller: the extension's bearer token, or the website's own Clerk session.
// One set of routes means one set of rules, so a profile saved on the website
// is exactly what the panel would have saved.
//
// An Authorization header means the caller is the extension: then only the
// token counts, never a session cookie that happens to ride along.
export async function getExtensionUser(req: Request): Promise<User | null> {
  if (req.headers.get("authorization")) return getUserFromCommentExtensionToken(req)
  // A cookie rides along on any request to this site, so a cookie-authenticated
  // write must also prove it came from one of our own pages. Browsers send
  // Origin on every non-GET fetch, and a page can't forge it.
  if (req.method !== "GET" && req.method !== "HEAD" && !isSameOrigin(req)) return null
  return getCurrentUser()
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).host === new URL(req.url).host
  } catch {
    return false
  }
}
