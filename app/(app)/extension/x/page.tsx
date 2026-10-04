// app/(app)/extension/x/page.tsx — Extension → X (Twitter): CarouseLabs
// Engage for X's reply profiles, history and settings, then its plan (sold
// separately from the LinkedIn extension) and its payments.
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { XExtensionManager } from "@/components/extension/XExtensionManager"
import { ExtensionPlanSection } from "@/components/extension/ExtensionPlanSection"
import { PaymentsList } from "@/components/extension/PaymentsList"
import { BillingRefresher } from "@/components/billing/BillingRefresher"

export const metadata: Metadata = {
  title: "X Extension",
  description: "Your CarouseLabs Engage for X extension: plan, reply profiles, history and settings.",
}

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionXPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  const ext = await extAccessSummary(user.id, "x")

  return (
    <div className="flex flex-col gap-8">
      <BillingRefresher />
      <XExtensionManager />
      <div id="plan" className="flex flex-col gap-3 scroll-mt-24">
        <ExtensionPlanSection ext={ext} platform="x" />
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">X payment history</h2>
          <p className="text-[12.5px] text-[#6B7280]">Payments for CarouseLabs Engage for X only.</p>
        </div>
        <PaymentsList platform="x" />
      </div>
    </div>
  )
}
