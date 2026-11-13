// components/extension/ExtensionOverview.tsx — Engage → Home for one of the
// extensions (LinkedIn's at /extension, X's at /extension/x, Reddit's at
// /extension/reddit): which extension and plan, the next thing to do, what
// it wrote this month and lately, how to finish setting up, and the other
// extensions. Server component.
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Check, Activity as ActivityIcon } from "lucide-react"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import type { ExtAccessSummary } from "@/lib/extAccess"
import type { EngagePlatform } from "@/lib/engage/features"
import { PLATFORM_HISTORY_KINDS } from "@/lib/extensionHistory"
import { engageAccess, engageSignIns } from "@/lib/engage/pageData"
import { BillingRefresher } from "@/components/billing/BillingRefresher"
import { extensionStatusLine } from "./ExtensionPlanSection"
import { ExtensionPrice } from "./ExtensionPrice"
import { ENGAGE_EXTENSIONS, EngageIcon, otherPlatforms } from "./engageExtensions"
import { planStatus, TONE_DOT } from "./engageStatus"

const DAY = 86_400_000
// Days in each tile's little bar chart.
export const SPARK_DAYS = 14

// This month's tiles, per extension.
const ACTIVITY: Record<EngagePlatform, { kind: string; label: string }[]> = {
  linkedin: [
    { kind: "comment", label: "Comments" },
    { kind: "reply", label: "Replies" },
    { kind: "connection_note", label: "Connection notes" },
    { kind: "message", label: "Messages" },
  ],
  x: [
    { kind: "x_reply", label: "Replies" },
    { kind: "x_message", label: "Messages" },
  ],
  reddit: [
    { kind: "reddit_comment", label: "Comments" },
    { kind: "reddit_message", label: "Messages" },
  ],
}

// How each kind of row reads in the Latest list.
export const KIND_LABEL: Record<string, string> = {
  comment: "Comment",
  reply: "Reply",
  connection_note: "Connection note",
  message: "Message",
  x_reply: "Reply",
  x_message: "Message",
  reddit_comment: "Comment",
  reddit_message: "Message",
}

const ACTION_LABEL: Record<string, string> = { INSERTED: "Inserted", COPIED: "Copied" }

const HERO_LINE: Record<EngagePlatform, string> = {
  linkedin:
    "Comments, replies, connection notes and messages, written the way you write. You read every one and post it yourself.",
  x: "Replies and chats on X, written the way you write. You read every one and post it yourself.",
  reddit:
    "Comments, replies and chats on Reddit, written the way you write and within each subreddit's rules. You read every one and post it yourself.",
}

// Shown in the hero until the person has written something of their own.
const SAMPLE: Record<EngagePlatform, { kind: string; post: string; text: string }> = {
  linkedin: {
    kind: "Comment",
    post: "Hiring your first designer? Most teams wait too long. Here are three signs it's time…",
    text: "The second sign is the one most teams skip. We waited until a launch slipped twice before we hired, and it showed.",
  },
  x: {
    kind: "Reply",
    post: "Shipping on Fridays is fine if your rollback takes under a minute. Change my mind.",
    text: "Agree, as long as the rollback is boring. Ours is one command and nobody has to ask permission.",
  },
  reddit: {
    kind: "Comment",
    post: "What's one onboarding change that actually moved activation for you?",
    text: "Cutting the setup form from six fields to two. Everything else we asked later, once people had seen it work.",
  },
}

export interface LatestEntry {
  id: string
  kind: string
  postAuthor: string
  postSnippet: string
  comment: string
  action: string
  profileName: string | null
  createdAt: string
}

const accessLabel = (ext: ExtAccessSummary) =>
  ext.access === "unlimited" ? "Unlimited" : ext.access === "testing" ? "Testing" : "Free"

// "just now", "18 min", "3 h", "2 days".
export function ago(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? "1 day" : `${days} days`
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

// Where a row was written, in a few words.
function context(e: LatestEntry): string {
  const kind = e.kind
  if (kind === "connection_note") return e.postAuthor ? `To ${e.postAuthor}` : "On a profile"
  if (kind.endsWith("message")) return e.postAuthor ? `In a chat with ${e.postAuthor}` : "In a chat"
  if (kind === "reply") return e.postAuthor ? `Under ${e.postAuthor}'s comment` : "Under a comment"
  return e.postAuthor ? `On ${e.postAuthor}'s post` : clip(e.postSnippet, 48) || "On a post"
}

export async function ExtensionOverview({
  platform,
  user,
}: {
  platform: EngagePlatform
  user: { id: string; email: string }
}) {
  const kinds = PLATFORM_HISTORY_KINDS[platform]
  const now = new Date()
  // Calendar month, the same window /api/ext/me counts in.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // The bar charts' days, in UTC: their shape, not an exact count.
  const sparkStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (SPARK_DAYS - 1) * DAY)

  const [ext, others, byKind, daily, latest, signIns] = await Promise.all([
    engageAccess(user.id, platform),
    Promise.all(otherPlatforms(platform).map(async (p) => ({ platform: p, ext: await engageAccess(user.id, p) }))),
    db.commentHistory.groupBy({
      by: ["kind"],
      where: { userId: user.id, createdAt: { gte: monthStart }, kind: { in: [...kinds] } },
      _count: { _all: true },
    }),
    db.$queryRaw<{ kind: string; day: string; count: number | bigint }[]>(Prisma.sql`
      SELECT h.kind, to_char(h."createdAt", 'YYYY-MM-DD') AS day, count(*)::int AS count
      FROM public."CommentHistory" h
      WHERE h."userId" = ${user.id} AND h.kind IN (${Prisma.join([...kinds])}) AND h."createdAt" >= ${sparkStart}
      GROUP BY 1, 2
    `),
    db.commentHistory.findMany({
      where: { userId: user.id, kind: { in: [...kinds] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        kind: true,
        postAuthor: true,
        postSnippet: true,
        comment: true,
        action: true,
        profileName: true,
        createdAt: true,
      },
    }),
    engageSignIns(user.id),
  ])

  const counts = Object.fromEntries(byKind.map((row) => [row.kind, row._count._all]))
  const dayKeys = Array.from({ length: SPARK_DAYS }, (_, i) => new Date(sparkStart.getTime() + i * DAY).toISOString().slice(0, 10))
  const spark: Record<string, number[]> = {}
  for (const k of kinds) spark[k] = dayKeys.map(() => 0)
  for (const row of daily) {
    const i = dayKeys.indexOf(row.day)
    if (i >= 0 && spark[row.kind]) spark[row.kind][i] = Number(row.count)
  }

  return (
    <ExtensionOverviewView
      platform={platform}
      ext={ext}
      others={others}
      counts={counts}
      spark={spark}
      latest={latest.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
      signedInBrowsers={signIns[platform]}
      now={now}
    />
  )
}

/**
 * What Home shows, given its data: the hero, this month, setting up (until
 * it's done), the plan, the latest few, and the other extensions.
 */
export function ExtensionOverviewView({
  platform,
  ext,
  others,
  counts,
  spark,
  latest,
  signedInBrowsers,
  now,
}: {
  platform: EngagePlatform
  ext: ExtAccessSummary
  /** The other extensions (sold separately) and this account's plan on each. */
  others: { platform: EngagePlatform; ext: ExtAccessSummary }[]
  /** This calendar month's generations by kind. */
  counts: Record<string, number>
  /** The last SPARK_DAYS days' generations by kind, oldest first. */
  spark: Record<string, number[]>
  /** The newest few, newest first. */
  latest: LatestEntry[]
  signedInBrowsers: number
  now: Date
}) {
  const info = ENGAGE_EXTENSIONS[platform]
  const base = info.base
  const status = planStatus(ext)
  const installed = signedInBrowsers > 0
  const wrote = latest.length > 0 || ext.freeUsed > 0
  const free = ext.access === "free"
  const freeLeft = Math.max(0, ext.freeLimit - ext.freeUsed)
  const own = latest[0]
  const sample = SAMPLE[platform]

  const steps = [
    { title: "Add it to Chrome", detail: "From the Chrome Web Store", done: installed },
    {
      title: "Sign in to the extension",
      detail: installed
        ? `Signed in on ${signedInBrowsers} ${signedInBrowsers === 1 ? "browser" : "browsers"}`
        : "With this CarouseLabs account",
      done: installed,
    },
    {
      title: `Write your first ${platform === "x" ? "reply" : "comment"}`,
      detail: info.startWriting.split(".")[0] + ".",
      done: wrote,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const nextStep = steps.findIndex((s) => !s.done)

  const pill = "inline-flex h-12 items-center gap-2 rounded-full px-6 text-body font-semibold transition-opacity duration-(--motion-fast) hover:opacity-90"
  const primary = !installed && info.storeUrl
    ? { href: info.storeUrl, label: "Add to Chrome" }
    : { href: info.siteUrl, label: `Open ${info.site}` }

  return (
    <div className="flex flex-col gap-5">
      {/* Coming back from the Lemon Squeezy tab, or from installing and
          signing in, shows the new plan and ticks the steps. */}
      <BillingRefresher />

      {/* Hero: which extension, its plan, the next thing to do */}
      <section
        aria-labelledby="engage-home-title"
        className="engage-canvas relative flex flex-wrap items-center gap-8 overflow-hidden rounded-showcase p-6 sm:p-10"
      >
        <span aria-hidden className="engage-orb engage-orb-violet -right-8 -bottom-10 size-28" />
        <span aria-hidden className="engage-orb engage-orb-lime top-8 left-[46%] hidden size-6 sm:block" />
        <div className="relative flex min-w-0 flex-[1_1_22rem] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/15 py-1.5 pr-3.5 pl-1.5 text-label font-medium">
              <span className="flex overflow-hidden rounded-[7px]">
                <EngageIcon platform={platform} size={24} />
              </span>
              {info.name.replace("CarouseLabs ", "")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#0B0920]/35 px-3.5 py-1.5 text-label">
              <span aria-hidden className={`size-2 rounded-full ${status.tone === "free" ? "bg-[#D4FF5C]" : TONE_DOT[status.tone]}`} />
              {free ? `Free plan · ${status.line}` : extensionStatusLine(ext)}
            </span>
          </div>
          <h1
            id="engage-home-title"
            className="text-[2.6rem] leading-[0.98] font-semibold tracking-[-0.04em] sm:text-[3.6rem]"
          >
            Show up on {info.site},
            <br />
            <span className="engage-serif text-[1.08em]">in your own voice.</span>
          </h1>
          <p className="max-w-[30rem] text-body-lg text-white/85">{HERO_LINE[platform]}</p>
          <div className="flex flex-wrap gap-2.5">
            <a href={primary.href} target="_blank" rel="noopener noreferrer" className={`${pill} bg-white text-[#100C33]`}>
              {primary.label}
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
            {free ? (
              <a href={info.checkoutPath} className={`${pill} bg-[#0B0920] text-white`}>
                Get unlimited — <ExtensionPrice price={ext.price} />
                <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link href={`${base}/billing`} className={`${pill} bg-[#0B0920] text-white`}>
                Plan &amp; setup
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {/* What it writes: their latest, or an example until there is one */}
        <figure className="relative m-0 flex min-w-0 flex-[1_1_20rem] flex-col gap-3">
          <div className="flex flex-col gap-3.5 rounded-[22px] bg-white p-4.5 text-[#100C33] shadow-[0_30px_60px_-24px_rgb(32_16_110/0.55),0_12px_24px_-12px_rgb(32_16_110/0.3)]">
            <div className="flex items-center justify-between gap-2.5">
              <span className="flex items-center gap-2 text-caption font-semibold">
                <span className="flex overflow-hidden rounded-[6px]">
                  <EngageIcon platform={platform} size={22} />
                </span>
                {own ? `Your latest ${KIND_LABEL[own.kind]?.toLowerCase() ?? "one"}` : "CarouseLabs Engage"}
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground">
                {own ? ago(own.createdAt, now) : "Example"}
              </span>
            </div>
            <p className="rounded-[14px] border border-border bg-[#F7F6FD] p-3 text-caption leading-normal text-[#46426B]">
              {own ? clip(own.postSnippet || context(own), 140) : sample.post}
            </p>
            <p className="text-caption font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {own ? KIND_LABEL[own.kind] ?? "Written" : sample.kind}
              {own?.profileName ? ` · ${own.profileName}` : ""}
            </p>
            <p className="rounded-[16px_16px_16px_4px] bg-[#EFEAFF] px-4 py-3 text-label leading-normal text-[#100C33]">
              {own ? clip(own.comment, 280) : sample.text}
            </p>
            {own && (
              <Link href={`${base}/history`} className="w-fit text-label font-semibold text-brand hover:underline">
                See it in Activity →
              </Link>
            )}
          </div>
          <figcaption className="inline-flex w-fit items-center gap-2 rounded-[14px] bg-[#0B0920] px-3.5 py-2.5 text-caption text-white">
            <Check className="size-4 text-[#D4FF5C]" strokeWidth={2.4} aria-hidden />
            You read it, you post it. Nothing goes out on its own.
          </figcaption>
        </figure>
      </section>

      {/* This month */}
      <section aria-labelledby="engage-month" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 id="engage-month" className="text-lead font-semibold tracking-[-0.02em] text-foreground">
            This month on {info.site}
          </h2>
          <Link href={`${base}/history`} className="text-label font-semibold text-brand hover:underline">
            See all activity →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:[grid-template-columns:repeat(auto-fit,minmax(10.5rem,1fr))]">
          {ACTIVITY[platform].map((a) => {
            const bars = spark[a.kind] ?? []
            const max = Math.max(1, ...bars)
            return (
              <div key={a.kind} className="flex flex-col gap-1.5 rounded-[22px] bg-surface-raised p-4.5 shadow-card">
                <p className="text-label text-muted-foreground">{a.label}</p>
                <p className="text-[2.25rem] leading-[1.1] font-semibold tracking-[-0.03em] text-foreground tabular-nums">
                  {counts[a.kind] ?? 0}
                </p>
                <div aria-hidden className="mt-1.5 flex h-9 items-end gap-[3px]">
                  {bars.map((n, i) => (
                    <span
                      key={i}
                      className={`min-w-0 flex-1 rounded-[3px] ${
                        n === 0 ? "bg-[#E5E2F4]" : i === bars.length - 1 ? "bg-[#D4FF5C]" : "bg-gradient-to-b from-[#5A78FF] to-[#7B3AEE]"
                      }`}
                      style={{ height: `${n === 0 ? 8 : Math.max(14, Math.round((n / max) * 100))}%` }}
                    />
                  ))}
                </div>
                <p className="sr-only">
                  {bars.reduce((s, n) => s + n, 0)} in the last {SPARK_DAYS} days.
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-5">
          {/* Setting up: only until the first one is written */}
          {doneCount < steps.length && (
            <section aria-labelledby="engage-setup" className="flex flex-col gap-4 rounded-card bg-surface-raised p-6 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="engage-setup" className="text-lead font-semibold tracking-[-0.02em] text-foreground">
                  Finish setting up
                </h2>
                <span className="text-label text-muted-foreground">
                  {doneCount} of {steps.length} done
                </span>
              </div>
              <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-[#EEEBFA]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2F4BFF] to-[#A445F0]"
                  style={{ width: `${Math.max(4, (doneCount / steps.length) * 100)}%` }}
                />
              </div>
              <ol className="flex flex-col">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex items-center gap-3.5 py-2.5">
                    <span
                      className={
                        s.done
                          ? "flex size-7.5 shrink-0 items-center justify-center rounded-full bg-brand text-white"
                          : i === nextStep
                            ? "size-7.5 shrink-0 rounded-full border-2 border-brand bg-surface-muted"
                            : "size-7.5 shrink-0 rounded-full border-2 border-dashed border-[#C9C3E6]"
                      }
                    >
                      {s.done && <Check className="size-4" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`text-label font-semibold ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {s.title}
                        <span className="sr-only">{s.done ? " (done)" : ""}</span>
                      </span>
                      <span className="text-caption text-muted-foreground">{s.detail}</span>
                    </span>
                    {i === nextStep && (
                      <a
                        href={!installed && info.storeUrl ? info.storeUrl : info.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 shrink-0 items-center rounded-full bg-primary px-4 text-label font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover"
                      >
                        {!installed && info.storeUrl ? "Add to Chrome" : `Open ${info.site}`}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-caption text-muted-foreground">
                This card goes away once you&apos;ve written your first one.{" "}
                <Link href={`${base}/billing#install`} className="font-semibold text-brand hover:underline">
                  Install steps
                </Link>
              </p>
            </section>
          )}

          {/* The plan at a glance */}
          <section
            aria-labelledby="engage-plan"
            className="relative flex flex-col gap-3.5 overflow-hidden rounded-card bg-surface-raised p-6 shadow-card"
          >
            <span aria-hidden className="engage-orb engage-orb-pearl -top-6 -right-5 size-21" />
            <p className="text-caption font-semibold tracking-[0.08em] text-brand uppercase">Your plan</p>
            <h2 id="engage-plan" className="text-[1.9rem] leading-tight font-semibold tracking-[-0.03em] text-foreground">
              {accessLabel(ext)}
            </h2>
            <p className="text-body text-[#46426B]">{extensionStatusLine(ext)}</p>
            {free && (
              <div
                role="meter"
                aria-label="Free generations used"
                aria-valuemin={0}
                aria-valuemax={ext.freeLimit}
                aria-valuenow={Math.min(ext.freeUsed, ext.freeLimit)}
                className="h-2.5 overflow-hidden rounded-full bg-[#EEEBFA]"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2F4BFF] to-[#A445F0]"
                  style={{ width: `${Math.min(100, (ext.freeUsed / Math.max(1, ext.freeLimit)) * 100)}%` }}
                />
              </div>
            )}
            {free ? (
              <a
                href={info.checkoutPath}
                className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                {freeLeft === 0 ? "Keep going — " : "Get unlimited — "}
                <ExtensionPrice price={ext.price} />
                <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link
                href={`${base}/billing`}
                className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Plan &amp; setup
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </section>
        </div>

        {/* The latest few, like a live feed */}
        <section
          aria-labelledby="engage-latest"
          className="engage-night relative flex min-w-0 flex-[1_1_22rem] flex-col gap-3.5 overflow-hidden rounded-card p-6"
        >
          <h2 id="engage-latest" className="flex items-center gap-2.5 text-lead font-semibold tracking-[-0.02em]">
            <ActivityIcon className="size-[18px] text-[#D4FF5C]" aria-hidden />
            Latest
          </h2>
          {latest.length > 0 ? (
            <ul className="flex flex-col">
              {latest.map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-t border-white/10 py-3.5">
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${
                      e.action === "INSERTED" ? "bg-[#D4FF5C]" : e.action === "COPIED" ? "bg-[#8D7BFF]" : "bg-[#FF9BE0]"
                    }`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-label font-semibold">{KIND_LABEL[e.kind] ?? "Written"}</span>
                    <span className="truncate text-caption text-white/70">{context(e)}</span>
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-caption">
                    {ACTION_LABEL[e.action] ?? "Written"}
                  </span>
                  <span className="w-14 text-right text-caption text-white/60">{ago(e.createdAt, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-2 py-6">
              <p className="engage-serif text-[1.75rem]">Nothing written yet.</p>
              <p className="text-body text-white/70">
                {installed ? `Open ${info.site} and click ${platform === "linkedin" ? "Comment" : "Reply"}.` : `Add the extension, open ${info.site} and click ${platform === "linkedin" ? "Comment" : "Reply"}.`}{" "}
                What it writes shows up here.
              </p>
            </div>
          )}
          <Link href={`${base}/history`} className="mt-auto w-fit text-label font-semibold text-[#D4FF5C] hover:underline">
            See all activity →
          </Link>
        </section>
      </div>

      {/* The other extensions, each bought on its own */}
      {others.length > 0 && (
        <section aria-labelledby="engage-more" className="flex flex-col gap-3">
          <h2 id="engage-more" className="px-1 text-lead font-semibold tracking-[-0.02em] text-foreground">
            More from Engage <span className="text-body font-normal text-muted-foreground">· each one is bought on its own</span>
          </h2>
          <div className="grid gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))]">
            {others.map((o) => {
              const oi = ENGAGE_EXTENSIONS[o.platform]
              const os = planStatus(o.ext)
              return (
                <div
                  key={o.platform}
                  className={`flex items-center gap-3.5 rounded-[22px] p-4.5 text-white ${
                    o.platform === "linkedin" ? "bg-gradient-to-br from-[#4A2EE6] to-[#7B3AEE]" : oi.theme.card
                  }`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-[12px] ring-1 ring-white/35">
                    <EngageIcon platform={o.platform} size={44} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body font-semibold">{oi.name.replace("CarouseLabs ", "")}</span>
                    <span className="text-caption text-white/80">
                      {accessLabel(o.ext)} · {os.line === accessLabel(o.ext) ? extensionStatusLine(o.ext) : os.line}
                    </span>
                  </span>
                  <Link
                    href={oi.base}
                    className="inline-flex h-11 shrink-0 items-center rounded-full bg-white px-4 text-label font-semibold whitespace-nowrap text-[#100C33] hover:opacity-90"
                  >
                    Go to {oi.site}
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
