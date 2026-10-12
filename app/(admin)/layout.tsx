import type { ReactNode } from "react"
import { fontVariables, geist } from "@/lib/fonts"
import { requireAdminPage } from "@/lib/adminAuth"
import { AdminShell } from "@/components/admin/AdminShell"
import { ToastProvider } from "@/components/admin/Toast"

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

  // The admin is the design system's dark theme (the app is the light one).
  // AdminShell also marks <html> dark while it's open, so dialogs and menus —
  // rendered outside this wrapper — match.
  return (
    <div data-theme="dark" className={`${fontVariables} bg-background font-ui text-foreground`}>
      <style
        // Raw so the font name's quotes aren't HTML-escaped inside the CSS.
        dangerouslySetInnerHTML={{
          __html: `body{background-color:#171614;color:#F5F0E7;font-family:${geist.style.fontFamily},system-ui,sans-serif}`,
        }}
      />
      <ToastProvider>
        <AdminShell email={admin.email}>{children}</AdminShell>
      </ToastProvider>
    </div>
  )
}
