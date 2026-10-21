// components/extension/ExtensionPlanSection.tsx — the extension's plan card
// with this account's status and the right action (buy, manage, install).
// Server component: shown on Settings → Billing and on Extension → Plan &
// payments, so both always agree.
import { EngagePlanCard } from "@/components/pricing/EngagePlanCard"
import { buttonVariants } from "@/components/ui/button"
import {
  EXTENSION_CHECKOUT_PATH,
  EXTENSION_PLAN,
  EXTENSION_STORE_URL,
  X_EXTENSION_CHECKOUT_PATH,
  X_EXTENSION_PLAN,
  X_EXTENSION_STORE_URL,
} from "@/lib/plans"
import type { ExtAccessSummary } from "@/lib/extAccess"
import { ExtensionPrice } from "./ExtensionPrice"
import type { EngagePlatform } from "@/lib/engage/features"

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })

// One line of status for the extension card, in the Lemon Squeezy
// subscription's own terms.
export function extensionStatusLine(ext: ExtAccessSummary): string {
  if (ext.access === "testing") return "Testing mode — the extension paywall is switched off"
  if (ext.access === "unlimited") {
    if (ext.status === "cancelled" && ext.endsAt) return `Cancelled — unlimited until ${shortDate(ext.endsAt)}`
    if (ext.status === "past_due") return "Payment failed — update your card to keep unlimited"
    return ext.renewsAt ? `Active — renews ${shortDate(ext.renewsAt)}` : "Active"
  }
  const left = Math.max(0, ext.freeLimit - ext.freeUsed)
  return `${left} of ${ext.freeLimit} free generations left`
}

// Billed apart from the web plan (lib/extensionBilling.ts), so it has its own
// actions: buy, manage, and install. platform "x": CarouseLabs Engage for X,
// sold separately from the LinkedIn extension.
export function ExtensionPlanSection({ ext, platform = "linkedin" }: { ext: ExtAccessSummary; platform?: EngagePlatform }) {
  const isX = platform === "x"
  // X's checkout link has a built-in default (lib/plans.ts).
  const checkoutConfigured = isX || !!process.env.LEMONSQUEEZY_EXTENSION_CHECKOUT_URL
  const plan = isX ? X_EXTENSION_PLAN : EXTENSION_PLAN
  const storeUrl = isX ? X_EXTENSION_STORE_URL : EXTENSION_STORE_URL
  // LinkedIn's actions in the brand violet, X's in black and white.
  const ctaClass = buttonVariants({ variant: isX ? "primary" : "brand", size: "lg", className: "w-full" })
  const cta =
    ext.access === "unlimited" ? (
      <a
        href={ext.manageUrl ?? "https://app.lemonsqueezy.com/my-orders"}
        target="_blank"
        rel="noopener noreferrer"
        className={ctaClass}
      >
        {isX ? "Manage X subscription" : "Manage extension subscription"}
      </a>
    ) : ext.access === "free" && checkoutConfigured ? (
      <a href={isX ? X_EXTENSION_CHECKOUT_PATH : EXTENSION_CHECKOUT_PATH} className={ctaClass}>
        {isX ? "Get Engage for X — " : "Get the extension — "}
        <ExtensionPrice price={ext.price} />
      </a>
    ) : ext.access === "free" ? (
      <p className="text-caption text-muted-foreground">Checkout isn&apos;t available right now. Please try again later.</p>
    ) : null

  return (
    <div id={isX ? "x-extension-plan" : "extension-plan"}>
      <EngagePlanCard
        status={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-caption font-medium text-foreground">
              {extensionStatusLine(ext)}
            </span>
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption font-medium text-brand underline underline-offset-2 hover:decoration-2"
              >
                Install from Chrome Web Store
              </a>
            )}
          </div>
        }
        cta={cta}
        showTrialNote={ext.access === "free"}
        plan={plan}
        // Only someone still deciding needs a special price spelt out.
        price={ext.access === "free" ? ext.price : undefined}
      />
    </div>
  )
}
