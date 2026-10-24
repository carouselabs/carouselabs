// DELETE /api/admin/leads/lists/[id] — deletes a leads list and the leads
// only on it (lib/leads.ts deleteLeadList); unsubscribed leads are kept.
//   → { removed }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { deleteLeadList, leadsProblem } from "@/lib/leads"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  try {
    return NextResponse.json(await deleteLeadList((await params).id, admin.email))
  } catch (err) {
    const problem = leadsProblem(err)
    if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
    throw err
  }
}
