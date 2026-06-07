import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/shell/Sidebar"
import { Topbar } from "@/components/shell/Topbar"

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
    <div className="h-screen overflow-hidden flex flex-col md:grid md:grid-cols-[220px_1fr] md:grid-rows-[52px_1fr]">
      <Sidebar />
      <Topbar />
      <main className="flex-1 min-h-0 overflow-y-auto bg-[#080810] px-6 py-8 md:px-10 pb-20 md:pb-8">
        {children}
      </main>
    </div>
  )
}
