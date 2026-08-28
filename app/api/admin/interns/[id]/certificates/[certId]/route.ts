// DELETE /api/admin/interns/[id]/certificates/[certId] — admin-only, for
// correcting mistakes (wrong file, wrong "issued for" text, etc.). Removes
// the DB row only — once a certificate's verificationCode is invalidated by
// deleting this row, /verify-certificate stops recognizing it regardless of
// whether the R2 object is separately cleaned up, which is what actually
// matters for a verification system (a stray orphaned file in storage isn't
// verifiable by anyone since the code lookup is gone).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; certId: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id, certId } = await params
  const certificate = await db.internCertificate.findUnique({
    where: { id: certId },
    include: { intern: { select: { email: true } } },
  })
  if (!certificate || certificate.internId !== id) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  await db.internCertificate.delete({ where: { id: certId } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "DELETE_CERTIFICATE",
    targetEmail: certificate.intern.email,
    details: `Deleted certificate ${certificate.verificationCode} ("${certificate.issuedFor}")`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
