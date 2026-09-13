// app/api/short-links/route.ts — Content Hub Library: carouselabs.com/l/[slug]
// short links with click tracking (see app/l/[slug]/route.ts, public).
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isSafeHttpUrl, randomSlug } from "@/lib/url"
import { appendUtmParams } from "@/lib/utm"

// GET /api/short-links — the user's short links, most recent first.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const links = await db.shortLink.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ links })
}

// POST /api/short-links — create a short link. Body: { targetUrl, utmSource?,
// utmMedium?, utmCampaign? }. Any UTM values are appended as query params to
// targetUrl BEFORE it's stored (see lib/utm.ts) — the redirect route has no
// separate UTM handling, it just forwards to whatever's stored.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let targetUrl: string

  try {
    const body = await req.json()
    if (typeof body.targetUrl !== "string" || !body.targetUrl.trim()) throw new Error("Missing targetUrl")
    const raw = body.targetUrl.trim()
    if (!isSafeHttpUrl(raw)) throw new Error("targetUrl must be a valid http(s) link")
    targetUrl = appendUtmParams(raw, {
      source: typeof body.utmSource === "string" ? body.utmSource : undefined,
      medium: typeof body.utmMedium === "string" ? body.utmMedium : undefined,
      campaign: typeof body.utmCampaign === "string" ? body.utmCampaign : undefined,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // Retry loop for the rare slug collision — see lib/url.ts's randomSlug
  // (7 base62 chars, ~3.5 trillion combinations, so collisions are very rare).
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = randomSlug()
    try {
      const link = await db.shortLink.create({ data: { userId: user.id, slug, targetUrl } })
      return NextResponse.json({ link })
    } catch (err) {
      // Unique constraint violation on slug — try again with a new one.
      if (attempt === 4) {
        console.error("[short-links] failed to generate a unique slug after 5 attempts:", err)
        return NextResponse.json({ error: "Failed to create short link — please try again" }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ error: "Failed to create short link" }, { status: 500 })
}
