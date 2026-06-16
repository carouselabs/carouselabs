import { Onest } from "next/font/google"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

const font = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${font.className} min-h-screen bg-[#F9F7F2] text-[#0A0A0A] overflow-x-hidden flex flex-col`}
    >
      {/* The app's root layout sets a dark body background for the authenticated
          app. Override it to cream for marketing routes so overscroll and
          scrollbars stay on-theme. Server-rendered (no flash); reverts on
          navigation into the app. */}
      <style>{`body{background-color:#F9F7F2;color:#0A0A0A}`}</style>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  )
}
