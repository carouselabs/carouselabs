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
