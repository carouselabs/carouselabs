// POST /api/admin/prefill-user — admin pre-fills someone's onboarding
// profile by email, before or after they've signed up (see
// components/admin/PrefillUserForm.tsx).
//   • User already exists  → overwrite their Profile directly.
//   • User doesn't exist yet → stash the values in PendingProfilePrefill,
//     keyed by email; lib/profile/pendingPrefill.ts applies it the moment a
//     User with that email is created (Clerk webhook or auth bootstrap).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { buildProfileColumns } from "@/lib/profile/columns"

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const body = await req.json().catch(() => null)
  if (!body || typeof body.email !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }
  const email = body.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const columns = buildProfileColumns(body)

  const existingUser = await db.user.findUnique({ where: { email } })

  if (existingUser) {
    await db.profile.upsert({
      where: { userId: existingUser.id },
      create: {
        userId: existingUser.id,
        ...columns,
        onboardingDone: true,
        prefilledByAdmin: true,
        profileReviewDismissed: false,
      },
      update: {
        ...columns,
        onboardingDone: true,
        prefilledByAdmin: true,
        profileReviewDismissed: false,
      },
    })
    return NextResponse.json({ success: true, status: "applied_existing_user" })
  }

  // Not signed up yet — upsert so re-saving before they sign up updates the
  // same pending record instead of erroring on the unique email.
  await db.pendingProfilePrefill.upsert({
    where: { email },
    create: { email, ...columns, createdBy: admin.email },
    update: { ...columns, createdBy: admin.email },
  })
  return NextResponse.json({ success: true, status: "pending_signup" })
}
