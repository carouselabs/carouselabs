// /api/admin/leads/brevo-sync — "Sync from Brevo" (lib/brevoSync.ts): a lead
// account's Brevo contacts copied into its leads (lib/leadAccounts.ts).
//   GET  ?account=anant
//        → { lists: [{ brevoListId, name, contacts, blocklisted, synced }] }
//          (brevoListId 0 = all of Brevo's contacts)
//   POST { account, brevoListId, offset }
//        one page of that list's contacts (BREVO_SYNC_PAGE) into its lead
//        list; the screen asks again from nextOffset until it's null
//        → { listId, listName, added, alreadySaved, unsubscribed, stopped, invalid, nextOffset, total }
// Reads from Brevo only: nothing there is changed.
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { brevoLists, syncBrevoPage } from "@/lib/brevoSync"
import { leadsProblem } from "@/lib/leads"
import { LEAD_ACCOUNTS, leadAccountOf } from "@/lib/leadAccounts"
import { logAdminAction } from "@/lib/auditLog"

// A page is one Brevo request and one import of up to 500 leads.
export const maxDuration = 60

const body = z.object({
  account: z.enum(LEAD_ACCOUNTS),
  brevoListId: z.number().int().min(0).max(1_000_000_000),
  offset: z.number().int().min(0).max(10_000_000),
})

function problemResponse(err: unknown) {
  const problem = leadsProblem(err)
  if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
  throw err
}

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  try {
    return NextResponse.json({ lists: await brevoLists(leadAccountOf(new URL(req.url).searchParams.get("account"))) })
  } catch (err) {
    return problemResponse(err)
  }
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Pick a Brevo list" }, { status: 400 })
  try {
    const page = await syncBrevoPage({ ...parsed.data, admin: admin.email })
    if (parsed.data.offset === 0) {
      await logAdminAction({ adminEmail: admin.email, action: "SYNC_BREVO_LEADS", details: `${parsed.data.account}: Brevo list ${parsed.data.brevoListId} → "${page.listName}" (${page.total} contacts)` })
    }
    return NextResponse.json(page)
  } catch (err) {
    return problemResponse(err)
  }
}
