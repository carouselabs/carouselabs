// GET /api/admin/email-report — Admin → Broadcasts → Email report (lib/emailReport.ts).
//   ?days=30                 the last N days, or
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD   days in India time, both included
//   &kind=all|campaigns|personal  &via=all|resend|brevo  &who=all|users|leads
//   → { filters, totals, daily, campaigns, links, when, apps }
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { emailReport } from "@/lib/emailReport"

const DAY_MS = 86_400_000
// A YYYY-MM-DD day in India time, as the instant it starts.
const istStart = (day: string) => new Date(`${day}T00:00:00+05:30`)

const query = z.object({
  days: z.coerce.number().int().min(1).max(3650).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: z.enum(["all", "campaigns", "personal"]).default("all"),
  via: z.enum(["all", "resend", "brevo"]).default("all"),
  who: z.enum(["all", "users", "leads"]).default("all"),
})

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Pick a date range and filters" }, { status: 400 })
  const q = parsed.data
  const now = new Date()
  let from: Date
  let to: Date
  if (q.from && q.to) {
    from = istStart(q.from)
    to = new Date(istStart(q.to).getTime() + DAY_MS)
    if (!(from < to)) return NextResponse.json({ error: "The start date must be before the end date" }, { status: 400 })
  } else {
    to = now
    // No days: since the beginning.
    from = q.days ? new Date(now.getTime() - q.days * DAY_MS) : new Date(0)
  }
  return NextResponse.json(await emailReport({ from, to, kind: q.kind, via: q.via, who: q.who }))
}
