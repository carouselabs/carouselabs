// lib/utm.ts — appends utm_source/utm_medium/utm_campaign query params to a
// target URL. Used when creating a ShortLink (see
// app/api/short-links/route.ts) so the UTM values are baked into the stored
// targetUrl itself rather than tracked separately — the redirect route just
// forwards to whatever URL was stored.
export interface UtmParams {
  source?: string
  medium?: string
  campaign?: string
}

export function appendUtmParams(url: string, utm: UtmParams): string {
  const hasAny = utm.source?.trim() || utm.medium?.trim() || utm.campaign?.trim()
  if (!hasAny) return url

  const parsed = new URL(url)
  if (utm.source?.trim()) parsed.searchParams.set("utm_source", utm.source.trim())
  if (utm.medium?.trim()) parsed.searchParams.set("utm_medium", utm.medium.trim())
  if (utm.campaign?.trim()) parsed.searchParams.set("utm_campaign", utm.campaign.trim())
  return parsed.toString()
}
