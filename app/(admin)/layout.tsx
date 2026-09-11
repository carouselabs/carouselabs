import type { ReactNode } from "react"
import { Onest } from "next/font/google"
import { requireAdminPage } from "@/lib/adminAuth"
import { AdminShell } from "@/components/admin/AdminShell"
import { ToastProvider } from "@/components/admin/Toast"

const font = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

// SECURITY: every page under (admin) goes through this layout. Only the
// ADMIN_EMAIL user gets in; everyone else is redirected to /dashboard
// (and unauthenticated visitors to /sign-in) before anything renders.
//
// KNOWN LIMITATION (loading-state audit): requireAdminPage()'s db work below
// has no Suspense boundary of its own, and a child route's loading.tsx does
// NOT cover a shared layout's fetch above it — per Next.js's loading.js
// semantics, "without Cache Components, navigation blocks until the layout
// finishes rendering." So every navigation into any /admin/* page blocks on
// this check first, invisibly, before that page's own loading.tsx (see e.g.
// app/(admin)/admin/loading.tsx) even gets a chance to render. Not fixed
// here: it's a bigger architectural change (move the check later, wrap it
// in its own Suspense, or adopt Cache Components) than a simple loading.tsx
// addition. Flagging for whoever picks this up next.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage()

  return (
    <div className={font.className}>
      <style>{`body{background-color:#0F0F0F;color:#fff}`}</style>
      <ToastProvider>
        <AdminShell email={admin.email}>{children}</AdminShell>
      </ToastProvider>
    </div>
  )
}
