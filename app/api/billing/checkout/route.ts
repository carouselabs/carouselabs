import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { signBillingIdentity } from "@/lib/billingIdentity"
import { z } from "zod"

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("topup"), credits: z.number().int().min(100).max(5000).multipleOf(100) }),
  z.object({ kind: z.enum(["pro", "growth"]) }),
])

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 })
  const { kind } = parsed.data
  if (kind === "topup" && (user.subscription?.plan ?? "FREE") === "FREE") {
    return NextResponse.json({ error: "Top-ups require a paid plan" }, { status: 403 })
  }
  if (kind !== "topup" && user.subscription?.lsSubscriptionId && user.subscription.plan !== "FREE") {
    return NextResponse.json({ error: "Manage your existing subscription in billing settings" }, { status: 409 })
  }
  const base = kind === "topup" ? process.env.NEXT_PUBLIC_LEMONSQUEEZY_TOPUP_CHECKOUT_URL
    : kind === "growth" ? process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL : process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL
  const variant = kind === "topup" ? process.env.LEMONSQUEEZY_TOPUP_VARIANT_ID
    : kind === "growth" ? process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID : process.env.LEMONSQUEEZY_VARIANT_ID
  if (!base || !variant || !/^\d+$/.test(variant) || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 })
  }
  let url: URL
  try { url = new URL(base) } catch {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 })
  }
  if (url.protocol !== "https:") return NextResponse.json({ error: "Payments are not configured" }, { status: 503 })
  url.searchParams.set("embed", "1")
  url.searchParams.set("media", "0")
  url.searchParams.set("logo", "0")
  url.searchParams.set("checkout[email]", user.email)
  url.searchParams.set("checkout[custom][user_id]", user.id)
  url.searchParams.set("checkout[custom][identity_signature]", signBillingIdentity(user.id, variant))
  if (parsed.data.kind === "topup") url.searchParams.set("checkout[suggested_price]", String(parsed.data.credits * 2))
  return NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "private, no-store" } })
}
