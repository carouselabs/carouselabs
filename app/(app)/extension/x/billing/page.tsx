// app/(app)/extension/x/billing/page.tsx — Extension → Engage for X → Plan &
// payments: X's $15/month plan (sold separately from the LinkedIn
// extension), its status, and every payment made for it.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { ExtensionPlanSection } from "@/components/extension/ExtensionPlanSection"
import { PaymentsList } from "@/components/extension/PaymentsList"
import { BillingRefresher } from "@/components/billing/BillingRefresher"

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionXBillingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  const ext = await extAccessSummary(user.id, "x")

  return (
    <div className="flex flex-col gap-8">
      <BillingRefresher />
      <ExtensionPlanSection ext={ext} platform="x" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Payment history</h2>
          <p className="text-[12.5px] text-[#6B7280]">
            Payments for CarouseLabs Engage for X only. LinkedIn&apos;s are under{" "}
            <a href="/extension/billing" className="font-medium text-[#7C3AED] hover:underline">
              Engage for LinkedIn → Plan &amp; payments
            </a>
            .
          </p>
        </div>
        <PaymentsList platform="x" />
      </div>
    </div>
  )
}
