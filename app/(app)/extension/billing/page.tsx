// app/(app)/extension/billing/page.tsx — Extension → Plan & payments: the
// $15/month plan (bought separately from the web plans), its status, and
// every payment made for it.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { ExtensionPlanSection } from "@/components/extension/ExtensionPlanSection"
import { PaymentsList } from "@/components/extension/PaymentsList"
import { BillingRefresher } from "@/components/billing/BillingRefresher"

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionBillingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const ext = await extAccessSummary(user.id)

  return (
    <div className="flex flex-col gap-8">
      <BillingRefresher />
      <ExtensionPlanSection ext={ext} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Payment history</h2>
          <p className="text-[12.5px] text-[#6B7280]">
            Payments for the extension plan only. Web plan payments are in{" "}
            <a href="/settings/billing" className="font-medium text-[#7C3AED] hover:underline">
              Settings → Billing
            </a>
            .
          </p>
        </div>
        <PaymentsList />
      </div>
    </div>
  )
}
