// app/api/ext/payments/route.ts — payment history for the extension's
// $15/month subscription, for the website's Extension → Plan & payments tab.
// Either caller (getExtensionUser).
//
// Lemon Squeezy is the record of what was charged, so this reads its
// subscription invoices live rather than keeping a copy that could drift.
// Only the account's current extension subscription is covered: that is the
// one stored in ExtensionSubscription.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { extensionCallerPlatform, getExtensionUser } from "@/lib/extensionCommentAuth"

type LsInvoice = {
  id: string
  attributes: {
    billing_reason?: string
    status?: string
    status_formatted?: string
    refunded?: boolean
    total_formatted?: string
    card_brand?: string | null
    card_last_four?: string | null
    created_at?: string
    urls?: { invoice_url?: string | null }
  }
}

export interface ExtensionPayment {
  id: string
  date: string
  amount: string
  // "paid" | "pending" | "void" | "refunded" | "partial_refund"
  status: string
  statusLabel: string
  reason: string
  card: string | null
  invoiceUrl: string | null
}

const REASON_LABELS: Record<string, string> = {
  initial: "First payment",
  renewal: "Monthly renewal",
  updated: "Plan change",
}

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  // One extension's payments: LinkedIn's, or X's (?platform=x, or the X
  // extension's own token).
  const sub =
    extensionCallerPlatform(req) === "x"
      ? await db.xSubscription.findUnique({ where: { userId: user.id }, select: { lsSubscriptionId: true } })
      : await db.extensionSubscription.findUnique({ where: { userId: user.id }, select: { lsSubscriptionId: true } })
  if (!sub) return NextResponse.json({ payments: [] })

  if (!process.env.LEMONSQUEEZY_API_KEY) {
    console.error("[ext/payments] LEMONSQUEEZY_API_KEY is not set")
    return NextResponse.json({ error: "Payment history isn't available right now." }, { status: 503 })
  }

  const url = new URL("https://api.lemonsqueezy.com/v1/subscription-invoices")
  url.searchParams.set("filter[subscription_id]", sub.lsSubscriptionId)
  url.searchParams.set("page[size]", "100")

  let invoices: LsInvoice[]
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("[ext/payments] Lemon Squeezy returned", res.status, await res.text())
      return NextResponse.json({ error: "Couldn't load payment history. Try again later." }, { status: 502 })
    }
    invoices = ((await res.json()) as { data?: LsInvoice[] }).data ?? []
  } catch (err) {
    console.error("[ext/payments] request failed:", err)
    return NextResponse.json({ error: "Couldn't load payment history. Try again later." }, { status: 502 })
  }

  const payments: ExtensionPayment[] = invoices
    .map((inv) => {
      const a = inv.attributes
      return {
        id: inv.id,
        date: a.created_at ?? "",
        amount: a.total_formatted ?? "",
        status: a.status ?? "",
        statusLabel: a.status_formatted ?? a.status ?? "",
        reason: REASON_LABELS[a.billing_reason ?? ""] ?? "Payment",
        card:
          a.card_brand && a.card_last_four
            ? `${a.card_brand.charAt(0).toUpperCase()}${a.card_brand.slice(1)} •••• ${a.card_last_four}`
            : null,
        invoiceUrl: a.urls?.invoice_url ?? null,
      }
    })
    .sort((x, y) => y.date.localeCompare(x.date))

  return NextResponse.json({ payments })
}
