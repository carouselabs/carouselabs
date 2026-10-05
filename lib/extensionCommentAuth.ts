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
import { cookieNamesFromHeader, hasClerkSessionCookie } from "@/lib/clerkSessionCookie"
import { tokenPlatform, type EngagePlatform } from "@/lib/engage/features"
import type { User } from "@prisma/client"

// Which extension each authenticated request came from, read from its token
// (the X extension's sign-ins are labelled; see tokenPlatform). Kept per
// request, so routes that answer differently per extension (plan, checkout)
// need no second lookup.
const callerPlatforms = new WeakMap<Request, EngagePlatform>()

// The extension a request is about: the X or LinkedIn extension's own token
// says which; a website request (session cookie) names it with ?platform=x,
// else LinkedIn. Call after getUserFromCommentExtensionToken/getExtensionUser.
export function extensionCallerPlatform(req: Request): EngagePlatform {
  const fromToken = callerPlatforms.get(req)
  if (fromToken) return fromToken
  return new URL(req.url).searchParams.get("platform") === "x" ? "x" : "linkedin"
}

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
  // A suspended or deleted account is signed out of the extension everywhere,
  // whatever tokens it still holds.
  if (!record || record.user.deletedAt || record.user.suspendedAt) return null

  db.extensionToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      // best-effort — a failed timestamp bump must never fail the real request
    })

  recordExtensionVersion(record.id, record.userId, req.headers.get(VERSION_HEADER))

  callerPlatforms.set(req, tokenPlatform(record.device))
  return record.user
}

// The side panel sends its version on every request (1.3.0 and later), so the
// admin can see who runs what. Stored per signed-in browser, at most every
// few minutes per browser per server instance, and never in a way that can
// slow or fail the request it rides on.
export const VERSION_HEADER = "x-engage-version"
const VERSION_PATTERN = /^\d{1,4}(\.\d{1,4}){1,3}$/
const VERSION_WRITE_INTERVAL_MS = 10 * 60 * 1000
const lastVersionWrite = new Map<string, { version: string; at: number }>()

function recordExtensionVersion(tokenId: string, userId: string, header: string | null) {
  const version = header?.trim() ?? ""
  if (!VERSION_PATTERN.test(version)) return
  const last = lastVersionWrite.get(tokenId)
  const now = Date.now()
  if (last && last.version === version && now - last.at < VERSION_WRITE_INTERVAL_MS) return
  lastVersionWrite.set(tokenId, { version, at: now })
  if (lastVersionWrite.size > 5000) lastVersionWrite.clear()

  db.engageClientInfo
    .upsert({
      where: { tokenId },
      create: { tokenId, userId, extensionVersion: version, lastSeenAt: new Date(now) },
      update: { extensionVersion: version, lastSeenAt: new Date(now) },
    })
    .catch(() => {
      // best-effort, like lastUsedAt (and harmless before the table exists)
    })
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
  // No session cookie means no website login — and proxy.ts didn't run Clerk
  // for this request either, so asking Clerk would throw. Not signed in.
  if (!hasClerkSessionCookie(cookieNamesFromHeader(req.headers.get("cookie")))) return null
  // A cookie rides along on any request to this site, so a cookie-authenticated
  // write must also prove it came from one of our own pages. Browsers send
  // Origin on every non-GET fetch, and a page can't forge it.
  if (req.method !== "GET" && req.method !== "HEAD" && !isSameOrigin(req)) return null
  try {
    return await getCurrentUser()
  } catch {
    // A signed-out answer beats a 500 if Clerk isn't available here.
    console.error("[extensionCommentAuth] session lookup failed")
    return null
  }
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(req.url).origin
  } catch {
    return false
  }
}
