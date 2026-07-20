// lib/adminAuth.ts
// Server-side admin gate. The ONLY way in is a logged-in Clerk session whose
// DB user email matches ADMIN_EMAIL exactly (case-insensitive). Used by the
// (admin) layout (redirects) and by every /api/admin route (403s).
import { NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

type DbUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return email.trim().toLowerCase() === admin.trim().toLowerCase()
}

// For server components / layouts: returns the admin user or redirects away.
export async function requireAdminPage(): Promise<DbUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  if (!isAdminEmail(user.email)) redirect("/dashboard")
  return user
}

// For API routes: returns the admin user, or null after which the caller must
// return adminForbidden(). Split so routes stay explicit about the 403 path.
export async function getAdminUser(): Promise<DbUser | null> {
  const user = await getCurrentUser()
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

export function adminForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
