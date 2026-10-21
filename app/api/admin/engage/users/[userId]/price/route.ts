// /api/admin/engage/users/[userId]/price — this person's own price for each
// Engage extension, instead of the usual $15/month (lib/engage/price.ts).
//   GET    → { prices: [...linkedin, x], subscribed: { linkedin, x } }
//   PUT    { platform, priceCents, introMonths?, endsAt?, reason } → set or
//          change it; introMonths 1–12 makes it an intro offer for that many
//          first months, then the usual price (null: every month)
//   DELETE { platform, reason } → back to the usual price
// A new price only reaches their next checkout: a subscription they already
// have keeps what it costs (Lemon Squeezy can't reprice it).
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { adminEngagePrices, removeEngagePrice, setEngagePrice } from "@/lib/engage/price"
import { MAX_INTRO_MONTHS, MAX_PRICE_CENTS, MIN_PRICE_CENTS, STANDARD_PRICE_CENTS, formatUsd } from "@/lib/engage/priceRules"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"
import { getRequestIp } from "@/lib/auditLog"

type Params = { params: Promise<{ userId: string }> }

const platform = z.enum(["linkedin", "x"])
const reason = z.string().trim().min(3, "Say why").max(500)

const setBody = z.object({
  platform,
  priceCents: z
    .number()
    .int("Whole cents only")
    .min(MIN_PRICE_CENTS, `At least ${formatUsd(MIN_PRICE_CENTS)}`)
    .max(MAX_PRICE_CENTS, `At most ${formatUsd(MAX_PRICE_CENTS)}`),
  introMonths: z.number().int("Whole months only").min(1, "At least 1 month").max(MAX_INTRO_MONTHS, `At most ${MAX_INTRO_MONTHS} months`).nullable().default(null),
  endsAt: z.iso.datetime().nullable().default(null),
  reason,
})
const removeBody = z.object({ platform, reason })

const tableMissing = () =>
  NextResponse.json({ error: "Special prices aren't set up yet: run scripts/engage-price.sql in Supabase." }, { status: 503 })

export async function GET(req: Request, { params }: Params) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const [prices, linkedin, x] = await Promise.all([
    adminEngagePrices(user.id),
    db.extensionSubscription.findUnique({ where: { userId: user.id } }),
    db.xSubscription.findUnique({ where: { userId: user.id } }).catch(() => null),
  ])
  return NextResponse.json({
    prices,
    // Already paying: a new price won't change what they pay now.
    subscribed: { linkedin: isExtensionSubscriptionActive(linkedin), x: isExtensionSubscriptionActive(x) },
  })
}

export async function PUT(req: Request, { params }: Params) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user || user.deletedAt) return notFound()

  const parsed = await parseBody(req, setBody)
  if (!parsed.ok) return parsed.response
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
  if (endsAt && endsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "endsAt: Pick a date in the future" }, { status: 400 })
  }
  const usual = STANDARD_PRICE_CENTS[parsed.data.platform]
  if (parsed.data.introMonths !== null && parsed.data.priceCents >= usual) {
    return NextResponse.json({ error: `priceCents: An intro price must be less than the usual ${formatUsd(usual)}` }, { status: 400 })
  }

  try {
    await setEngagePrice({
      admin: gate.admin.email,
      user,
      platform: parsed.data.platform,
      priceCents: parsed.data.priceCents,
      introMonths: parsed.data.introMonths,
      endsAt,
      reason: parsed.data.reason,
      ip: getRequestIp(req),
    })
  } catch (err) {
    if (isEngageSchemaMissing(err)) return tableMissing()
    throw err
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, removeBody)
  if (!parsed.ok) return parsed.response

  try {
    const removed = await removeEngagePrice({
      admin: gate.admin.email,
      user,
      platform: parsed.data.platform,
      reason: parsed.data.reason,
      ip: getRequestIp(req),
    })
    if (!removed) return NextResponse.json({ error: "There's no special price to remove" }, { status: 404 })
  } catch (err) {
    if (isEngageSchemaMissing(err)) return tableMissing()
    throw err
  }
  return NextResponse.json({ ok: true })
}
