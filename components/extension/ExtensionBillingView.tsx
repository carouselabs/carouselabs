// components/extension/ExtensionBillingView.tsx — Extension → Plan & payments
// for either extension (app/(app)/extension/billing, /extension/x/billing):
// the plan (bought separately from the web plans), its status, and every
// payment made for it.
import { BillingRefresher } from "@/components/billing/BillingRefresher"
import type { ExtAccessSummary } from "@/lib/extAccess"
import type { EngagePlatform } from "@/lib/engage/features"
import { ExtensionPlanSection } from "./ExtensionPlanSection"
import { PaymentsList } from "./PaymentsList"
import { ENGAGE_EXTENSIONS } from "./engageExtensions"

const link = "font-medium text-brand hover:underline"

export function ExtensionBillingView({ ext, platform = "linkedin" }: { ext: ExtAccessSummary; platform?: EngagePlatform }) {
  return (
    <div className="flex flex-col gap-8">
      <BillingRefresher />
      <ExtensionPlanSection ext={ext} platform={platform} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-label font-semibold text-foreground">Payment history</h2>
          <p className="text-caption text-muted-foreground">
            {platform !== "linkedin" ? (
              <>
                Payments for {ENGAGE_EXTENSIONS[platform].name} only. LinkedIn&apos;s are under{" "}
                <a href="/extension/billing" className={link}>
                  Engage for LinkedIn → Plan &amp; payments
                </a>
                .
              </>
            ) : (
              <>
                Payments for the extension plan only. Web plan payments are in{" "}
                <a href="/settings/billing" className={link}>
                  Settings → Billing
                </a>
                .
              </>
            )}
          </p>
        </div>
        <PaymentsList platform={platform} />
      </section>
    </div>
  )
}
