// app/api/start-page/click/[id]/route.ts — PUBLIC (see proxy.ts). Every link
// button on a public Start Page points here instead of directly at its real
// URL, so a click can be counted before redirecting on. No auth: this is
// clicked by anonymous visitors, not the page owner.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const link = await db.startPageLink.findUnique({ where: { id }, select: { url: true } })
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 })

  // Best-effort — a failed count bump must never block the redirect itself.
  db.startPageLink.update({ where: { id }, data: { clickCount: { increment: 1 } } }).catch((err) => {
    console.error("[start-page/click] failed to increment clickCount:", err)
  })

  return NextResponse.redirect(link.url)
}
