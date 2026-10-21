// lib/emailRecipientFacts.ts
// What the AI email writer is told about the one person a personal email is
// for (Admin → a user's profile → Send email with AI): their account facts,
// so it never guesses wrong about their plan or how they've used Engage.
// The admin still decides what the email says.
import { db } from "@/lib/db"
import { resolveVariables } from "@/lib/broadcastVariables"
import { loadEngageAccess } from "@/lib/engage/access"
import { loadEngagePrices } from "@/lib/engage/price"
import { monthlyLabel, type EngagePriceInfo } from "@/lib/engage/priceRules"
import { engageUsage, signedInToEngage } from "@/lib/engage/audience"
import { ENGAGE_EXTENSIONS } from "@/components/extension/engageExtensions"
import type { EngagePlatform } from "@/lib/engage/features"
import type { PaywallAccess } from "@/lib/engage/accessRules"

const DAY_MS = 24 * 60 * 60 * 1000

function when(date: Date | null | undefined, now: Date): string {
  if (!date) return "never"
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS)
  const on = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  return days <= 0 ? `today (${on})` : days === 1 ? `yesterday (${on})` : `${days} days ago (${on})`
}

// A special price an admin set for them, so the email never quotes $15.
function priceLine(price: EngagePriceInfo | undefined): string {
  if (!price?.special) return ""
  const until = price.endsAt
    ? `, which they can buy at until ${new Date(price.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}`
    : ""
  return `; their own special price is ${monthlyLabel(price.cents)} instead of the usual ${monthlyLabel(price.standardCents)}${until}`
}

function accessLine(access: PaywallAccess | undefined): string {
  if (!access) return "unknown"
  if (access.source === "subscription") return "pays for it"
  if (access.source === "grant") {
    return access.activeGrant?.endsAt
      ? `has free unlimited access we gave them, until ${new Date(access.activeGrant.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
      : "has free unlimited access we gave them, for life"
  }
  if (access.source === "testing") return "unlimited (payments are switched off)"
  return access.freeRemaining === null ? "free trial" : `on the free trial, ${access.freeRemaining} free generations left`
}

export interface RecipientFacts {
  user: { id: string; email: string; name: string | null; firstName: string }
  // The facts, as the lines the writer is given.
  text: string
}

export async function recipientFacts(userId: string, now: Date = new Date()): Promise<RecipientFacts | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      extensionTrialUsed: true,
      xTrialUsed: true,
      profile: { select: { name: true, headline: true, industry: true, targetAudience: true } },
      _count: { select: { posts: true } },
    },
  })
  if (!user || user.deletedAt) return null

  const [values, access, prices, ...perPlatform] = await Promise.all([
    resolveVariables(user.id),
    loadEngageAccess(user.id, now).catch(() => null),
    loadEngagePrices(user.id, now).catch(() => null),
    ...(["linkedin", "x"] as EngagePlatform[]).map(async (platform) => ({
      platform,
      signedIn: await signedInToEngage(platform, user.id),
      usage: (await engageUsage(platform, [user])).get(user.id),
    })),
  ])

  const p = user.profile
  const lines = [
    `First name: ${values.firstName}${p?.name ? ` (full name ${p.name})` : ""}`,
    `Joined CarouseLabs ${when(user.createdAt, now)}; last active on the website ${when(user.updatedAt, now)}.`,
    `Web app plan: ${values.plan === "FREE" ? "Free" : values.plan === "GROWTH" ? "Growth" : "Pro"}, ${values.creditsRemaining} credits left. Posts created: ${user._count.posts}.`,
    p?.headline ? `Their headline: ${p.headline}` : null,
    p?.industry ? `Their industry: ${p.industry}` : null,
    p?.targetAudience ? `Who they write for: ${p.targetAudience}` : null,
    ...perPlatform.map(({ platform, signedIn, usage }) => {
      const name = ENGAGE_EXTENSIONS[platform].name
      if (!signedIn && !usage?.generations) return `${name}: hasn't signed in to it (may not have installed it)${priceLine(prices?.[platform])}.`
      return (
        `${name}: ${signedIn ? "signed in" : "not signed in now"}; ${accessLine(access?.platforms[platform])}${priceLine(prices?.[platform])}; ` +
        `${usage?.generations ?? 0} generation${usage?.generations === 1 ? "" : "s"} so far; last used ${when(usage?.lastUsedAt, now)}.`
      )
    }),
  ].filter((l): l is string => !!l)

  return {
    user: { id: user.id, email: user.email, name: p?.name ?? null, firstName: values.firstName },
    text: lines.join("\n"),
  }
}
