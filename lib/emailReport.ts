// lib/emailReport.ts — Admin → Broadcasts → Email report: how the emails the
// admin sends are doing over a date range, campaign by campaign and all
// together. Loads the rows; the numbers are worked out in
// lib/emailReportRules.ts. Seen and clicked are people only: security
// scanners and Apple Mail's own opening are left out (lib/emailScanners.ts).
import { db } from "@/lib/db"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { findPersonalTracks } from "@/lib/emailTracking"
import {
  appsOf,
  campaignLines,
  dailyOf,
  filterRows,
  first48Hours,
  leadStops,
  topLinks,
  totalsOf,
  whenTheyRead,
  type CampaignMeta,
  type LeadStop,
  type PersonEvent,
  type ReportFilters,
  type SentRow,
} from "@/lib/emailReportRules"

// A table or column a later SQL script adds isn't there yet: nothing from it.
async function orNothing<T>(load: () => Promise<T>, nothing: T): Promise<T> {
  try {
    return await load()
  } catch (err) {
    if (isEngageSchemaMissing(err)) return nothing
    throw err
  }
}

const BASE = { id: true, campaignId: true, userId: true, status: true, sentAt: true, updatedAt: true, openedAt: true, clickedAt: true } as const

// Campaign emails sent in the range (and ones that failed in it), with the
// scanner columns once scripts/email-scanners.sql and leads.sql are run.
async function campaignRows(from: Date, to: Date): Promise<SentRow[]> {
  const where = {
    OR: [
      { status: "sent", sentAt: { gte: from, lt: to } },
      { status: "failed", updatedAt: { gte: from, lt: to } },
    ],
  }
  type Row = { id: string; campaignId: string; userId: string | null; status: string; sentAt: Date | null; updatedAt: Date; openedAt: Date | null; clickedAt: Date | null; provider?: string | null; scannedAt?: Date | null; autoOpenedAt?: Date | null }
  let rows: Row[]
  try {
    rows = await db.emailCampaignRecipient.findMany({ where, select: { ...BASE, provider: true, scannedAt: true, autoOpenedAt: true } })
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    rows = await db.emailCampaignRecipient.findMany({ where, select: BASE })
  }
  return rows.map((r) => ({
    ref: r.id,
    kind: "campaign" as const,
    campaignId: r.campaignId,
    user: !!r.userId,
    via: r.provider === "brevo" ? ("brevo" as const) : ("resend" as const),
    status: r.status === "failed" ? ("failed" as const) : ("sent" as const),
    sentAt: r.sentAt ?? r.updatedAt,
    openedAt: r.openedAt,
    clickedAt: r.clickedAt,
    scannedAt: r.scannedAt ?? null,
    autoOpenedAt: r.autoOpenedAt ?? null,
  }))
}

// Personal emails sent in the range (always to a user; what sent each isn't kept).
async function personalRows(from: Date, to: Date): Promise<SentRow[]> {
  const tracks = await orNothing(() => findPersonalTracks({ where: { createdAt: { gte: from, lt: to } } }), [])
  return tracks.map((t) => ({
    ref: t.emailId,
    kind: "personal" as const,
    campaignId: null,
    user: true,
    via: null,
    status: "sent" as const,
    sentAt: t.createdAt,
    openedAt: t.openedAt,
    clickedAt: t.clickedAt,
    scannedAt: t.scannedAt ?? null,
    autoOpenedAt: t.autoOpenedAt ?? null,
  }))
}

// People's opens and confirmed clicks in the range (scripts/email-scanners.sql).
const personEvents = (from: Date, to: Date) =>
  orNothing<PersonEvent[]>(
    () =>
      db.emailTrackEvent.findMany({
        where: { verdict: "person", at: { gte: from, lt: to } },
        select: { kind: true, refId: true, type: true, at: true, link: true, userAgent: true },
      }),
    [],
  )

export async function emailReport(filters: ReportFilters) {
  const { from, to } = filters
  const rows = filterRows([...(await campaignRows(from, to)), ...(await personalRows(from, to))], filters)
  const campaignIds = [...new Set(rows.flatMap((r) => (r.campaignId ? [r.campaignId] : [])))]
  const campaigns: CampaignMeta[] = campaignIds.length
    ? await db.emailCampaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, subject: true, audience: true, audienceValue: true, createdAt: true },
      })
    : []
  // Only the activity on the emails these filters keep.
  const kept = new Set(rows.map((r) => `${r.kind}:${r.ref}`))
  const events = (await personEvents(from, to)).filter((e) => kept.has(`${e.kind}:${e.refId}`))
  // Leads who stopped: only when leads are part of it.
  const stops: LeadStop[] =
    filters.who === "users" || filters.kind === "personal"
      ? []
      : await orNothing(
          async () =>
            (
              await db.lead.groupBy({ by: ["stopReason"], where: { unsubscribedAt: { gte: from, lt: to } }, _count: { _all: true } })
            ).map((g) => ({ reason: g.stopReason, count: g._count._all })),
          [],
        )

  return {
    filters: { ...filters, from: from.toISOString(), to: to.toISOString() },
    totals: { ...totalsOf(rows), ...leadStops(stops) },
    daily: dailyOf(rows, from, to),
    campaigns: campaignLines(rows, campaigns),
    links: topLinks(events),
    when: whenTheyRead(events),
    apps: appsOf(events),
  }
}

/** One campaign's first 48 hours after sending, and the links its people clicked. */
export async function campaignActivity(campaignId: string) {
  const rows = await db.emailCampaignRecipient.findMany({ where: { campaignId, status: "sent" }, select: { id: true, sentAt: true } })
  const events = rows.length
    ? await orNothing<PersonEvent[]>(
        () =>
          db.emailTrackEvent.findMany({
            where: { kind: "campaign", verdict: "person", refId: { in: rows.map((r) => r.id) } },
            select: { kind: true, refId: true, type: true, at: true, link: true, userAgent: true },
          }),
        [],
      )
    : []
  return { timeline: first48Hours(rows.map((r) => ({ ref: r.id, sentAt: r.sentAt })), events), links: topLinks(events), apps: appsOf(events) }
}
