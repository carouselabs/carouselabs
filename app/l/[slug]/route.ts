// app/l/[slug]/route.ts — PUBLIC (see proxy.ts). carouselabs.com/l/[slug]
// increments the click counter then redirects to the stored targetUrl (which
// already has any UTM params baked in — see app/api/short-links/route.ts).
// A plain Route Handler, not a page, since there's nothing to render.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const link = await db.shortLink.findUnique({ where: { slug }, select: { id: true, targetUrl: true } })
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 })

  // Best-effort — a failed count bump must never block the redirect itself.
  db.shortLink.update({ where: { id: link.id }, data: { clickCount: { increment: 1 } } }).catch((err) => {
    console.error("[l/slug] failed to increment clickCount:", err)
  })

  return NextResponse.redirect(link.targetUrl)
}
