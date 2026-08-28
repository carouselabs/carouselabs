// GET /api/verify-certificate?code=CL-2026-A7X9 — public, unauthenticated.
// Returns only what's needed to visually confirm a certificate is genuine:
// the intern's name, what it was issued for, the issue date, and a link to
// the file. Deliberately never returns email, points, attendance, or any
// other internal record — this is a verification lookup, not a profile.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { db } from "@/lib/db"
import { getRequestIp } from "@/lib/auditLog"

// Anti-abuse guard for this unauthenticated endpoint, same pattern as
// app/api/contact/route.ts.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: false,
})

export async function GET(req: Request) {
  const ip = getRequestIp(req) ?? "unknown"
  const { success } = await ratelimit.limit(`verify-certificate:${ip}`)
  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    )
  }

  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  const certificate = await db.internCertificate.findUnique({
    where: { verificationCode: code },
    include: { intern: { select: { name: true } } },
  })

  if (!certificate) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    internName: certificate.intern.name,
    issuedFor: certificate.issuedFor,
    issuedDate: certificate.issuedDate,
    certificateUrl: certificate.certificateUrl,
  })
}
