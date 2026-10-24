// lib/emailScanners.ts — telling a person from a security scanner in an
// email's seen and clicked. Company email systems (Microsoft Defender,
// Mimecast, Proofpoint, Barracuda…) open each email and visit every link
// before the person gets it, and Apple Mail opens every email by itself, so a
// bare "the image loaded" or "the link was visited" proves little. Each open
// and click is judged with the checks email services use (Mailgun,
// Lettermint, SendGrid, Paminga): timing, a hidden link only robots follow,
// the visitor's signature, the same source as a known scanner, several links
// at once, and whether a real browser ran the click page's script. Seen and
// clicked are then worked out from the judged events (rollUp). No database
// here: lib/emailTracking.ts records the events.

// Anything this soon after the email was sent is the scanner checking it.
export const FIRST_MINUTE_MS = 60_000
// A scanner's source stays a scanner for this long (the same network address).
export const SAME_SOURCE_MS = 15 * 60_000
// Several links clicked this close together is a robot: another link
// within 2 seconds, or 3 more within 10 (a person reads before clicking on).
const TWO_CLICKS_MS = 2_000
const MANY_CLICKS_MS = 10_000
const MANY_LINKS = 3

// "open": the invisible image loaded. "click": a tracked link was visited.
// "human": the click page's script ran (a real browser). "trap": the hidden
// link only robots follow.
export type TrackEventType = "open" | "click" | "human" | "trap"
// "unconfirmed": a click whose browser hasn't run the script (yet).
export type Verdict = "person" | "scanner" | "apple" | "unconfirmed"

// link: where a click went (a person clicking the same link twice isn't a burst).
export type JudgedEvent = { id?: string; type: string; at: Date; link?: string | null; source: string | null; userAgent: string | null; verdict: string; reason: string | null }

export const REASONS = {
  trap: "Followed the hidden link only robots see",
  peek: "Checked the link without opening it",
  signature: "A security tool, by its signature",
  firstMinute: "Within a minute of sending",
  sameSource: "Same source as a security scanner",
  burst: "Several links at once",
  apple: "Apple Mail opens emails by itself",
  waiting: "Waiting for the browser check",
} as const

// Signatures of security tools, link checkers and scripts. Mail apps that
// load images for a person (Gmail's GoogleImageProxy, Yahoo, Outlook's
// "Microsoft Office") aren't on it.
const ROBOT_SIGNATURE =
  /(bot\b|bot\/|crawl|spider|slurp|preview|scanner|headless|phantom|puppeteer|playwright|selenium|python|curl\/|wget|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|httpclient|mimecast|barracuda|proofpoint|ironport|symantec|messagelabs|trend ?micro|zscaler|forcepoint|sophos|fortinet|fortiguard|check ?point|mcafee|trustwave|safelinks|linkscanner|urldefense)/i

export function looksLikeRobot(userAgent: string | null | undefined): boolean {
  return !userAgent?.trim() || ROBOT_SIGNATURE.test(userAgent)
}

// Apple Mail Privacy Protection loads every email's images through Apple's
// servers (Apple's own 17.0.0.0/8 addresses, or a bare "Mozilla/5.0").
export function looksLikeApple(userAgent: string | null | undefined, ip: string | null | undefined): boolean {
  return userAgent?.trim() === "Mozilla/5.0" || !!ip?.startsWith("17.")
}

/**
 * What one open or click is, on its own and from the same email's events so
 * far (`prior`). What it shows about the others is sweep's job.
 */
export function judge(
  event: { type: TrackEventType; at: Date; method?: string; link?: string | null; userAgent: string | null; ip: string | null; source: string | null },
  ctx: { sentAt: Date | null; prior: JudgedEvent[] },
): { verdict: Verdict; reason: string } {
  const t = event.at.getTime()
  const scanner = (reason: string) => ({ verdict: "scanner" as const, reason })
  if (event.type === "trap") return scanner(REASONS.trap)
  if (event.method === "HEAD") return scanner(REASONS.peek)
  if (looksLikeRobot(event.userAgent)) return scanner(REASONS.signature)
  if (ctx.sentAt && t - ctx.sentAt.getTime() < FIRST_MINUTE_MS) return scanner(REASONS.firstMinute)
  const sameSource = (e: JudgedEvent) => !!event.source && e.source === event.source && Math.abs(t - e.at.getTime()) <= SAME_SOURCE_MS
  if (ctx.prior.some((e) => e.verdict === "scanner" && sameSource(e))) return scanner(REASONS.sameSource)
  if (event.type === "click") return { verdict: "unconfirmed", reason: REASONS.waiting }
  if (event.type === "open" && looksLikeApple(event.userAgent, event.ip)) return { verdict: "apple", reason: REASONS.apple }
  return { verdict: "person", reason: "" }
}

/**
 * What the events together show were robots, as [reason, ids] to relabel:
 * several links clicked at once, and anything from the same source as a
 * scanner within SAME_SOURCE_MS, before or after. Scanners fire many
 * requests at the same moment, so this looks at all of them, not one by one.
 */
export function sweep(events: JudgedEvent[]): [string, string[]][] {
  const relabel = new Map<string, string>()
  const clicks = events.filter((e) => e.type === "click")
  for (const c of clicks) {
    // Other links (the same link again is a person's double click).
    const others = (ms: number) => new Set(clicks.filter((o) => o.link !== c.link && Math.abs(o.at.getTime() - c.at.getTime()) <= ms).map((o) => o.link)).size
    if (c.id && (others(TWO_CLICKS_MS) >= 1 || others(MANY_CLICKS_MS) >= MANY_LINKS)) relabel.set(c.id, REASONS.burst)
  }
  const isScanner = (e: JudgedEvent) => e.verdict === "scanner" || (!!e.id && relabel.has(e.id))
  const scanners = events.filter(isScanner)
  for (const e of events) {
    if (!e.id || !e.source || isScanner(e)) continue
    if (scanners.some((s) => s.source === e.source && Math.abs(s.at.getTime() - e.at.getTime()) <= SAME_SOURCE_MS)) relabel.set(e.id, REASONS.sameSource)
  }
  const byReason = new Map<string, string[]>()
  for (const e of events) {
    const why = e.id ? relabel.get(e.id) : undefined
    if (why && e.verdict !== "scanner") byReason.set(why, [...(byReason.get(why) ?? []), e.id!])
  }
  return [...byReason]
}

export type TrackSummary = {
  openedAt: Date | null
  lastOpenedAt: Date | null
  openCount: number
  clickedAt: Date | null
  lastClickedAt: Date | null
  clickCount: number
  scannedAt: Date | null
  scanReason: string | null
  autoOpenedAt: Date | null
}

const first = (dates: Date[]) => (dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null)
const last = (dates: Date[]) => (dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null)

/**
 * Seen and clicked from the judged events: only a person's opens and
 * browser-confirmed clicks count (a click counts as seen too); the scanner
 * and Apple Mail are kept apart.
 */
export function rollUp(events: JudgedEvent[]): TrackSummary {
  const person = events.filter((e) => e.verdict === "person")
  const opens = person.filter((e) => e.type === "open").map((e) => e.at)
  const clicks = person.filter((e) => e.type === "human").map((e) => e.at)
  const scans = events.filter((e) => e.verdict === "scanner").sort((a, b) => a.at.getTime() - b.at.getTime())
  return {
    openedAt: first([...opens, ...clicks]),
    lastOpenedAt: last(opens),
    openCount: opens.length,
    clickedAt: first(clicks),
    lastClickedAt: last(clicks),
    clickCount: clicks.length,
    scannedAt: scans[0]?.at ?? null,
    scanReason: scans[0]?.reason ?? null,
    autoOpenedAt: first(events.filter((e) => e.verdict === "apple").map((e) => e.at)),
  }
}
