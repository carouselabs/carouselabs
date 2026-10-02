// lib/engage/adminAccess.ts — who may do what in the Engage admin. Every
// /api/admin/engage route asks for one permission; the UI hides what an admin
// can't do, but the server is what decides.
//
// Today the only member is the owner (ADMIN_EMAIL, lib/adminAuth.ts), who has
// every permission. The roles below are ready for adding support or analytics
// admins later without touching any route.
import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/adminAuth"

export const ENGAGE_PERMISSIONS = [
  "engage.view", // overview, users, usage, grants
  "engage.access.manage", // grants, feature switches, limits, free generations, reset usage
  "engage.users.suspend", // pause/resume Engage, sign out browsers
  "engage.users.notes", // notes and tags
  "engage.audit.view", // the Engage audit trail
  "engage.export", // CSV exports
] as const
export type EngagePermission = (typeof ENGAGE_PERMISSIONS)[number]

export type EngageRole =
  | "owner"
  | "super_admin"
  | "support_admin"
  | "billing_admin"
  | "analytics_viewer"
  | "developer"

const ROLE_PERMISSIONS: Record<EngageRole, readonly EngagePermission[]> = {
  owner: ENGAGE_PERMISSIONS,
  super_admin: ENGAGE_PERMISSIONS,
  support_admin: ["engage.view", "engage.access.manage", "engage.users.notes"],
  billing_admin: ["engage.view", "engage.export"],
  analytics_viewer: ["engage.view", "engage.audit.view"],
  developer: ["engage.view", "engage.audit.view"],
}

export interface EngageAdmin {
  id: string
  email: string
  role: EngageRole
  permissions: readonly EngagePermission[]
}

export function roleCan(role: EngageRole, permission: EngagePermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export async function getEngageAdmin(): Promise<EngageAdmin | null> {
  const user = await getAdminUser()
  if (!user) return null
  return { id: user.id, email: user.email, role: "owner", permissions: ROLE_PERMISSIONS.owner }
}

// A cookie-authenticated write must come from the admin's own pages: browsers
// send Origin on every non-GET fetch, and another site can't forge it.
export function isSameOriginWrite(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true
  const origin = req.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(req.url).origin
  } catch {
    return false
  }
}

export type AdminGate = { ok: true; admin: EngageAdmin } | { ok: false; response: NextResponse }

export async function requireEngagePermission(req: Request, permission: EngagePermission): Promise<AdminGate> {
  const admin = await getEngageAdmin()
  if (!admin || !roleCan(admin.role, permission)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  if (!isSameOriginWrite(req)) {
    return { ok: false, response: NextResponse.json({ error: "Cross-site request refused" }, { status: 403 }) }
  }
  return { ok: true, admin }
}
