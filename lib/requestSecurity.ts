/** Browser mutations must originate from this deployment. Server webhooks and
 * bearer clients authenticate separately and do not rely on ambient cookies. */
export function isAllowedMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true
  const url = new URL(request.url)
  if (url.pathname.startsWith("/api/webhooks/") || url.pathname.startsWith("/api/cron/")) return true
  if (/^Bearer /i.test(request.headers.get("authorization") || "")) return true
  const origin = request.headers.get("origin")
  if (origin) {
    try { return new URL(origin).origin === url.origin } catch { return false }
  }
  return request.headers.get("sec-fetch-site") !== "cross-site"
}
