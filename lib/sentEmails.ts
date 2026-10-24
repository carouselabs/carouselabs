// lib/sentEmails.ts — every email the admin has sent, to use again (Admin →
// Broadcasts → Sent emails): campaigns, personal emails (from a person's
// admin profile; kept in full since scripts/email-reuse.sql), and templates
// (the existing EmailTemplate, which a sent email can be starred into).
// "Use again" loads one (emailContent) into a new campaign, the AI writer,
// or a personal email to someone else.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import { designPlainText, emailDesignSchema, type EmailDesign } from "@/lib/emailDesign"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { findPersonalTracks } from "@/lib/emailTracking"

export type EmailSource = { kind: "campaign" | "personal" | "template"; id: string }

// "campaign:<id>", "personal:<emailId>", "template:<id>": how a source travels in URLs.
export function parseSource(value: string | null | undefined): EmailSource | null {
  const match = /^(campaign|personal|template):([\w-]{1,64})$/.exec(value ?? "")
  return match ? { kind: match[1] as EmailSource["kind"], id: match[2] } : null
}
export const sourceKey = (source: EmailSource) => `${source.kind}:${source.id}`

const asDesign = (value: unknown): EmailDesign | null => {
  const parsed = emailDesignSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

// A person's first name as the writer's merge field fills it.
export function firstNameOf(user: { email: string; profile?: { name: string | null } | null }): string {
  return (user.profile?.name?.trim() || user.email.split("@")[0]).split(/\s+/)[0]
}

/**
 * The name, when the email names this person outright ("Hi Priya") instead
 * of through {{firstName}}: a copy sent to anyone else would greet them as
 * Priya. null when it doesn't.
 */
export function mentionsName(content: { subject: string; body: string; design: EmailDesign | null }, name: string | null): string | null {
  if (!name || name.length < 2) return null
  const text = `${content.subject}\n${content.design ? designPlainText(content.design) : content.body}`
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u").test(text) ? name : null
}

export interface EmailContent {
  subject: string
  body: string
  // The AI-written email; null for one written as plain text.
  design: EmailDesign | null
  mentionsName: string | null
}

async function personalRecipientName(emailId: string): Promise<string | null> {
  const track = await db.personalEmailTrack.findUnique({ where: { emailId }, select: { userId: true } })
  if (!track) return null
  const user = await db.user.findUnique({ where: { id: track.userId }, select: { email: true, profile: { select: { name: true } } } })
  return user ? firstNameOf(user) : null
}

/** The email itself, ready to send again; null when it isn't there (or wasn't kept). */
export async function emailContent(source: EmailSource): Promise<EmailContent | null> {
  if (source.kind === "campaign") {
    const campaign = await db.emailCampaign.findUnique({ where: { id: source.id }, select: { subject: true, body: true, design: true } })
    if (!campaign) return null
    const design = asDesign(campaign.design)
    return { subject: design?.subject ?? campaign.subject, body: campaign.body, design, mentionsName: null }
  }
  if (source.kind === "personal") {
    const track = await db.personalEmailTrack.findUnique({ where: { emailId: source.id }, select: { design: true } })
    const design = asDesign(track?.design)
    if (!design) return null
    const content = { subject: design.subject, body: designPlainText(design), design }
    return { ...content, mentionsName: mentionsName(content, await personalRecipientName(source.id)) }
  }
  const template = await db.emailTemplate.findUnique({ where: { id: source.id } })
  if (!template) return null
  const design = asDesign(template.design)
  const content = { subject: design?.subject ?? template.subject, body: template.body, design }
  const name = template.sourceKind === "personal" && template.sourceId ? await personalRecipientName(template.sourceId) : null
  return { ...content, mentionsName: mentionsName(content, name) }
}

// Before scripts/email-reuse.sql (or email-tracking.sql) has run, the newer
// tables and columns aren't there: those parts of the list are just empty.
async function orEmpty<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query
  } catch (err) {
    if (isEngageSchemaMissing(err)) return []
    throw err
  }
}

const LIST_LIMIT = 200

/** Everything in the Sent emails library, newest first, each with whether it was seen and clicked. */
export async function listSentEmails() {
  const [campaigns, tracks, templates] = await Promise.all([
    db.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, subject: true, audience: true, audienceValue: true, status: true, design: true, createdAt: true, createdBy: true },
    }),
    orEmpty(findPersonalTracks({ orderBy: { createdAt: "desc" }, take: LIST_LIMIT })),
    orEmpty(db.emailTemplate.findMany({ orderBy: { createdAt: "desc" }, take: LIST_LIMIT })),
  ])

  const ids = campaigns.map((c) => c.id)
  const countBy = async (where: Prisma.EmailCampaignRecipientWhereInput) => {
    if (ids.length === 0) return new Map<string, number>()
    const rows = await orEmpty(
      db.emailCampaignRecipient.groupBy({ by: ["campaignId"], where: { campaignId: { in: ids }, ...where }, _count: { _all: true } }),
    )
    return new Map(rows.map((r) => [r.campaignId, r._count._all]))
  }
  const [people, sent, seen, clicked] = await Promise.all([
    countBy({}),
    countBy({ status: "sent" }),
    countBy({ status: "sent", openedAt: { not: null } }),
    countBy({ status: "sent", clickedAt: { not: null } }),
  ])

  const users = tracks.length
    ? await db.user.findMany({
        where: { id: { in: [...new Set(tracks.map((t) => t.userId))] } },
        select: { id: true, email: true, profile: { select: { name: true } } },
      })
    : []
  const userById = new Map(users.map((u) => [u.id, u]))
  const starred = new Map(templates.filter((t) => t.sourceKind && t.sourceId).map((t) => [`${t.sourceKind}:${t.sourceId}`, t.id]))

  return {
    templates: templates.map((t) => {
      const design = asDesign(t.design)
      return {
        id: t.id,
        name: t.name,
        subject: design?.subject ?? t.subject,
        picture: design?.hero.imageUrl ?? null,
        designed: !!design,
        from: t.sourceKind && t.sourceId ? `${t.sourceKind}:${t.sourceId}` : null,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
      }
    }),
    campaigns: campaigns.map((c) => {
      const design = asDesign(c.design)
      return {
        id: c.id,
        subject: c.subject,
        audience: c.audience,
        audienceValue: c.audienceValue,
        archived: c.status === "archived",
        picture: design?.hero.imageUrl ?? null,
        designed: !!design,
        createdAt: c.createdAt,
        createdBy: c.createdBy,
        people: people.get(c.id) ?? 0,
        sent: sent.get(c.id) ?? 0,
        seen: seen.get(c.id) ?? 0,
        clicked: clicked.get(c.id) ?? 0,
        templateId: starred.get(`campaign:${c.id}`) ?? null,
      }
    }),
    personal: tracks.map((t) => {
      const design = asDesign(t.design)
      const user = userById.get(t.userId)
      return {
        id: t.emailId,
        subject: t.subject ?? design?.subject ?? null,
        to: user ? { id: user.id, email: user.email, name: user.profile?.name?.trim() || null } : null,
        sentAt: t.createdAt,
        picture: design?.hero.imageUrl ?? null,
        // Emails sent before personal emails were kept can't be used again.
        reusable: !!design,
        openedAt: t.openedAt,
        openCount: t.openCount,
        clickedAt: t.clickedAt,
        clickCount: t.clickCount,
        lastClickedAt: t.lastClickedAt,
        scannedAt: t.scannedAt,
        scanReason: t.scanReason,
        autoOpenedAt: t.autoOpenedAt,
        templateId: starred.get(`personal:${t.emailId}`) ?? null,
      }
    }),
  }
}

export class TemplateError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

/** Stars a campaign or personal email as a named template: a copy of the email as it is now. */
export async function saveTemplate(input: { source: EmailSource; name: string; adminEmail: string }) {
  if (input.source.kind === "template") throw new TemplateError("That's already a template")
  const content = await emailContent(input.source)
  if (!content) throw new TemplateError("That email wasn't kept, so it can't be a template", 404)
  const template = await db.emailTemplate.create({
    data: {
      name: input.name,
      subject: content.subject,
      body: content.body,
      design: content.design ?? Prisma.DbNull,
      sourceKind: input.source.kind,
      sourceId: input.source.id,
      createdBy: input.adminEmail,
    },
    select: { id: true, name: true },
  })
  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "SAVE_EMAIL_TEMPLATE",
    details: `Template "${input.name}" from ${sourceKey(input.source)} ("${content.subject}")`,
  })
  return template
}

export async function renameTemplate(input: { id: string; name: string; adminEmail: string }) {
  const before = await db.emailTemplate.findUnique({ where: { id: input.id }, select: { name: true } })
  if (!before) throw new TemplateError("Template not found", 404)
  await db.emailTemplate.update({ where: { id: input.id }, data: { name: input.name } })
  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "RENAME_EMAIL_TEMPLATE",
    details: `Template "${before.name}" renamed "${input.name}"`,
  })
}
