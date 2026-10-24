// lib/emailReportRules.ts — the numbers on Admin → Broadcasts → Email report,
// worked out from the emails sent (campaign recipients and personal emails)
// and the people's opens and clicks (EmailTrackEvent, verdict "person": no
// security scanner or Apple Mail auto-open counts, lib/emailScanners.ts).
// No database here: lib/emailReport.ts loads the rows.

export type ReportKind = "all" | "campaigns" | "personal"
export type ReportVia = "all" | "resend" | "brevo"
export type ReportWho = "all" | "users" | "leads"
export type ReportFilters = { from: Date; to: Date; kind: ReportKind; via: ReportVia; who: ReportWho }

// One email to one person. via: what sent it (unknown for personal emails).
export type SentRow = {
  ref: string
  kind: "campaign" | "personal"
  campaignId: string | null
  user: boolean
  via: "resend" | "brevo" | null
  status: "sent" | "failed"
  sentAt: Date
  openedAt: Date | null
  clickedAt: Date | null
  scannedAt: Date | null
  autoOpenedAt: Date | null
}

export type CampaignMeta = { id: string; subject: string; audience: string; audienceValue: string | null; createdAt: Date }
// A person's open or confirmed click.
export type PersonEvent = { kind: string; refId: string; type: string; at: Date; link: string | null; userAgent: string | null }
// Leads who stopped getting emails in the range, by why (null: our own Unsubscribe link, before reasons were kept).
export type LeadStop = { reason: string | null; count: number }

export type Totals = {
  sent: number
  failed: number
  seen: number
  clicked: number
  scanned: number
  maybeApple: number
}

// India: what the admin reads days and hours in (no daylight saving).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
export const istDay = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
const istParts = (d: Date) => {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS)
  // Monday first.
  return { weekday: (shifted.getUTCDay() + 6) % 7, hour: shifted.getUTCHours() }
}

/** The rows these filters keep (personal emails have no service, so only "all" keeps them). */
export function filterRows(rows: SentRow[], f: Pick<ReportFilters, "kind" | "via" | "who">): SentRow[] {
  return rows.filter((r) => {
    if (f.kind === "campaigns" && r.kind !== "campaign") return false
    if (f.kind === "personal" && r.kind !== "personal") return false
    if (f.via !== "all" && r.via !== f.via) return false
    if (f.who === "users" && !r.user) return false
    if (f.who === "leads" && r.user) return false
    return true
  })
}

export function totalsOf(rows: SentRow[]): Totals {
  const sent = rows.filter((r) => r.status === "sent")
  return {
    sent: sent.length,
    failed: rows.filter((r) => r.status === "failed").length,
    seen: sent.filter((r) => r.openedAt).length,
    clicked: sent.filter((r) => r.clickedAt).length,
    scanned: sent.filter((r) => r.scannedAt).length,
    maybeApple: sent.filter((r) => !r.openedAt && r.autoOpenedAt).length,
  }
}

/** Per day sent (in India time): how many went, and how many of those were seen and clicked. Every day in the range, quiet ones too. */
export function dailyOf(rows: SentRow[], from: Date, to: Date): { day: string; sent: number; seen: number; clicked: number }[] {
  const sent = rows.filter((r) => r.status === "sent")
  const firstSent = sent.reduce<Date | null>((min, r) => (!min || r.sentAt < min ? r.sentAt : min), null)
  // "All time" (from the very beginning) starts at the first email, not 1970.
  const start = from.getTime() === 0 ? (firstSent ?? to) : from
  const days = new Map<string, { day: string; sent: number; seen: number; clicked: number }>()
  for (let d = new Date(istDay(start) + "T00:00:00Z"); istDay(d) <= istDay(new Date(to.getTime() - 1)); d = new Date(d.getTime() + 86_400_000)) {
    days.set(istDay(d), { day: istDay(d), sent: 0, seen: 0, clicked: 0 })
    if (days.size > 3700) break
  }
  for (const r of sent) {
    const day = days.get(istDay(r.sentAt))
    if (!day) continue
    day.sent++
    if (r.openedAt) day.seen++
    if (r.clickedAt) day.clicked++
  }
  return [...days.values()]
}

export type CampaignLine = Totals & { id: string; subject: string; audience: string; audienceValue: string | null; createdAt: Date; via: "resend" | "brevo" | "both" | null; lastSentAt: Date | null }

/** Each campaign's numbers (newest first), then personal emails as one line. */
export function campaignLines(rows: SentRow[], campaigns: CampaignMeta[]): CampaignLine[] {
  const byCampaign = new Map<string, SentRow[]>()
  for (const r of rows) {
    const key = r.kind === "personal" ? "personal" : r.campaignId ?? "unknown"
    byCampaign.set(key, [...(byCampaign.get(key) ?? []), r])
  }
  const line = (id: string, group: SentRow[], meta: Omit<CampaignMeta, "id"> | null): CampaignLine => {
    const vias = new Set(group.filter((r) => r.status === "sent" && r.via).map((r) => r.via))
    const sentAts = group.filter((r) => r.status === "sent").map((r) => r.sentAt.getTime())
    return {
      id,
      subject: meta?.subject ?? "Personal emails",
      audience: meta?.audience ?? "personal",
      audienceValue: meta?.audienceValue ?? null,
      createdAt: meta?.createdAt ?? new Date(Math.min(...group.map((r) => r.sentAt.getTime()))),
      via: vias.size > 1 ? "both" : ([...vias][0] ?? null),
      lastSentAt: sentAts.length ? new Date(Math.max(...sentAts)) : null,
      ...totalsOf(group),
    }
  }
  const lines = campaigns.filter((c) => byCampaign.has(c.id)).map((c) => line(c.id, byCampaign.get(c.id)!, c))
  lines.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const personal = byCampaign.get("personal")
  return personal ? [...lines, line("personal", personal, null)] : lines
}

/** The links people clicked most (confirmed clicks only), with how many people. */
export function topLinks(events: PersonEvent[], limit = 10): { link: string; clicks: number; people: number }[] {
  const links = new Map<string, { clicks: number; people: Set<string> }>()
  for (const e of events) {
    if (e.type !== "human" || !e.link) continue
    const entry = links.get(e.link) ?? { clicks: 0, people: new Set<string>() }
    entry.clicks++
    entry.people.add(`${e.kind}:${e.refId}`)
    links.set(e.link, entry)
  }
  return [...links]
    .map(([link, v]) => ({ link, clicks: v.clicks, people: v.people.size }))
    .sort((a, b) => b.people - a.people || b.clicks - a.clicks)
    .slice(0, limit)
}

/** When people open and click: [weekday Monday..Sunday][hour 0..23], India time. */
export function whenTheyRead(events: PersonEvent[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const e of events) {
    const { weekday, hour } = istParts(e.at)
    grid[weekday][hour]++
  }
  return grid
}

/** Where they read it, by the app or device a person opened or clicked with. */
export function emailApp(userAgent: string | null): string {
  const ua = userAgent ?? ""
  if (/GoogleImageProxy/i.test(ua)) return "Gmail"
  if (/YahooMailProxy/i.test(ua)) return "Yahoo Mail"
  if (/Microsoft Outlook|ms-office|MSOffice/i.test(ua)) return "Outlook (desktop)"
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad"
  if (/Android/i.test(ua)) return "Android"
  if (/Macintosh/i.test(ua)) return "Mac"
  if (/Windows/i.test(ua)) return "Windows PC"
  return "Other"
}

/** How many people opened or clicked with each app or device (one person can be in two: opened in Gmail, clicked on iPhone). */
export function appsOf(events: PersonEvent[]): { app: string; people: number }[] {
  const apps = new Map<string, Set<string>>()
  for (const e of events) {
    // Recorded before scanner checks: no signature to tell the app by.
    if (!e.userAgent) continue
    const app = emailApp(e.userAgent)
    apps.set(app, (apps.get(app) ?? new Set()).add(`${e.kind}:${e.refId}`))
  }
  return [...apps].map(([app, people]) => ({ app, people: people.size })).sort((a, b) => b.people - a.people)
}

/** Leads who stopped in the range: unsubscribed, bounced (or blocked), or marked it spam. */
export function leadStops(stops: LeadStop[]): { unsubscribed: number; bounced: number; spam: number } {
  const of = (match: (r: string | null) => boolean) => stops.filter((s) => match(s.reason)).reduce((n, s) => n + s.count, 0)
  return {
    unsubscribed: of((r) => r === null || r === "unsubscribed"),
    bounced: of((r) => r === "bounced" || r === "blocked"),
    spam: of((r) => r === "spam"),
  }
}

/**
 * One campaign's first 48 hours: by hours after each person's email went,
 * how many people had seen and clicked it so far.
 */
export function first48Hours(rows: { ref: string; sentAt: Date | null }[], events: PersonEvent[]): { hour: number; seen: number; clicked: number }[] {
  const sentAt = new Map(rows.flatMap((r) => (r.sentAt ? [[r.ref, r.sentAt.getTime()] as const] : [])))
  const firstSeen = new Map<string, number>()
  const firstClick = new Map<string, number>()
  for (const e of events) {
    const sent = sentAt.get(e.refId)
    if (sent === undefined) continue
    const hours = (e.at.getTime() - sent) / 3_600_000
    if (hours < 0) continue
    firstSeen.set(e.refId, Math.min(firstSeen.get(e.refId) ?? Infinity, hours))
    if (e.type === "human") firstClick.set(e.refId, Math.min(firstClick.get(e.refId) ?? Infinity, hours))
  }
  const upTo = (m: Map<string, number>, h: number) => [...m.values()].filter((v) => v <= h).length
  return Array.from({ length: 49 }, (_, hour) => ({ hour, seen: upTo(firstSeen, hour), clicked: upTo(firstClick, hour) }))
}
