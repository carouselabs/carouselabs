import type { ReactNode } from "react"
import { Onest } from "next/font/google"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/shell/Sidebar"
import { Topbar } from "@/components/shell/Topbar"
import { AppStickers } from "@/components/shell/AppStickers"

const font = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Step 1: require a live Clerk session — no session means not logged in
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  // Step 2: get the DB user, creating it if the webhook hasn't fired yet
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  // Step 3: send new users through onboarding
  if (!user.profile?.onboardingDone) {
    redirect("/onboarding")
  }

  return (
    <div
      className={`${font.className} h-screen overflow-hidden flex flex-col md:grid md:grid-cols-[230px_1fr] md:grid-rows-[56px_1fr] bg-[#F9F7F2] text-[#0A0A0A]`}
    >
      {/* The root layout sets a dark body background; keep the app on cream. */}
      <style>{`body{background-color:#F9F7F2;color:#0A0A0A}`}</style>
      <Sidebar />
      <Topbar />
      <main className="relative flex-1 min-h-0 overflow-y-auto bg-[#F9F7F2] px-6 py-8 md:px-10 pb-24 md:pb-10">
        {/* Page-aware floating stickers in the cream margins, behind content */}
        <AppStickers />
        <div className="relative z-10 h-full">{children}</div>
      </main>
    </div>
  )
}
