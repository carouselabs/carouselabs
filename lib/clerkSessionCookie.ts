// lib/clerkSessionCookie.ts — whether a request carries the website's Clerk
// session cookies. No imports, so proxy.ts (edge) and the /api/ext routes can
// both use it, and the extension's test suite can cover it directly.
//
// Why it matters: proxy.ts skips clerkMiddleware for /api/ext/* so the
// extension's cookieless, bearer-token requests aren't disrupted. But the
// website's Extension section calls the same routes with its session cookie,
// and Clerk's auth() only works where clerkMiddleware ran — without it, those
// requests crashed (500). So Clerk runs for /api/ext/* exactly when the
// request brings a session cookie.
//
// Clerk sets "__session" and "__client_uat", and newer versions also suffixed
// copies ("__session_<id>", "__client_uat_<id>").
export function hasClerkSessionCookie(cookieNames: Iterable<string>): boolean {
  for (const name of cookieNames) {
    if (name === "__session" || name.startsWith("__session_")) return true
    if (name === "__client_uat" || name.startsWith("__client_uat_")) return true
  }
  return false
}

// Cookie names from a raw Cookie header.
export function cookieNamesFromHeader(header: string | null): string[] {
  if (!header) return []
  return header
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter(Boolean)
}
