// GET/POST /api/admin/interns/[id]/certificates — list and issue
// certificates for one intern. Admin-only; the file itself is uploaded to
// R2, and the DB row is what the public /verify-certificate page reads from
// (via app/api/verify-certificate, keyed by verificationCode, never by
// this intern's id).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

// Admin-trusted upload (not a public-facing form), so validation here is a
// sanity cap rather than the stricter magic-byte checks used for
// user-supplied reference images elsewhere in the app.
const MAX_DECODED_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function randomCodeSuffix(length = 4): string {
  let s = ""
  for (let i = 0; i < length; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return s
}

// "CL-2026-A7X9" — retried against the DB until unique. 36^4 (~1.68M)
// combinations per year makes a collision on the first try the overwhelming
// common case; the loop is just a correctness guarantee, not a real hot path.
async function generateUniqueVerificationCode(): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `CL-${year}-${randomCodeSuffix()}`
    const existing = await db.internCertificate.findUnique({ where: { verificationCode: code } })
    if (!existing) return code
  }
  throw new Error("Failed to generate a unique verification code — please try again")
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const certificates = await db.internCertificate.findMany({
    where: { internId: id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ certificates })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const intern = await db.intern.findUnique({ where: { id }, select: { id: true, name: true, email: true } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  let fileBase64: string
  let contentType: string
  let issuedFor: string
  let issuedDate: Date

  try {
    const body = await req.json()

    if (typeof body.fileBase64 !== "string" || !body.fileBase64) throw new Error("Missing file")
    fileBase64 = body.fileBase64.replace(/^data:[^;]+;base64,/, "")

    if (typeof body.contentType !== "string" || !(body.contentType in ALLOWED_CONTENT_TYPES)) {
      throw new Error("File must be a PDF, PNG, JPEG, or WEBP")
    }
    contentType = body.contentType

    if (typeof body.issuedFor !== "string" || !body.issuedFor.trim()) throw new Error("Missing issuedFor")
    issuedFor = body.issuedFor.trim()

    const parsedDate = body.issuedDate ? new Date(body.issuedDate) : new Date()
    if (isNaN(parsedDate.getTime())) throw new Error("Invalid issuedDate")
    issuedDate = parsedDate
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const buf = Buffer.from(fileBase64, "base64")
  if (buf.length === 0) return NextResponse.json({ error: "Invalid file data" }, { status: 400 })
  if (buf.length > MAX_DECODED_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
  }

  let verificationCode: string
  try {
    verificationCode = await generateUniqueVerificationCode()
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to generate code" }, { status: 500 })
  }

  const ext = ALLOWED_CONTENT_TYPES[contentType]
  const filename = `certificates/${id}/${verificationCode}.${ext}`

  let certificateUrl: string
  try {
    certificateUrl = await uploadToR2(fileBase64, filename, contentType)
  } catch (err) {
    console.error("[admin/interns/certificates] R2 upload failed:", err)
    return NextResponse.json({ error: "Failed to upload certificate file" }, { status: 502 })
  }

  const certificate = await db.internCertificate.create({
    data: { internId: id, verificationCode, certificateUrl, issuedFor, issuedDate },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "UPLOAD_CERTIFICATE",
    targetEmail: intern.email,
    details: `Issued certificate ${verificationCode} for "${issuedFor}"`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ certificate })
}
