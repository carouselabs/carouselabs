import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { MaintenanceBanner } from "@/components/shared/MaintenanceBanner"
import { fontVariables } from "@/lib/fonts"

// No server-side DB call here — this layout wraps statically generated
// pages, and a getAppSettings() call here would run at build time (see
// components/shared/MaintenanceBanner.tsx for why that broke the build).
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      data-theme="light"
      className={`${fontVariables} flex min-h-screen flex-col overflow-x-hidden bg-background font-ui text-foreground`}
    >
      {/* The root layout's body styles are for the authenticated app.
          Override them to the marketing canvas so overscroll and scrollbars
          stay on-theme. Server-rendered (no flash); reverts on navigation
          into the app. */}
      <style>{`body{background-color:#F4F3FC;color:#100C33}`}</style>
      <MaintenanceBanner />
      <Navbar />
      {/* The nav floats over the page; the home hero (data-hero) runs under it. */}
      <main id="main" className="flex-1 pt-24 has-[>[data-hero]]:pt-0">{children}</main>
      <Footer />
    </div>
  )
}
