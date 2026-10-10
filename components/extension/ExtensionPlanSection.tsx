// components/extension/ExtensionPlanSection.tsx — the extension's plan card
// with this account's status and the right action (buy, manage, install).
// Server component: shown on Settings → Billing and on Extension → Plan &
// payments, so both always agree.
import { ExtensionCTA, ExtensionPlanCard } from "@/components/marketing/ExtensionPlanCard"
import {
  EXTENSION_CHECKOUT_PATH,
  EXTENSION_PLAN,
  EXTENSION_STORE_URL,
  X_EXTENSION_CHECKOUT_PATH,
  X_EXTENSION_PLAN,
  X_EXTENSION_STORE_URL,
} from "@/lib/plans"
import type { ExtAccessSummary } from "@/lib/extAccess"
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
  const cta =
    ext.access === "unlimited" ? (
      <ExtensionCTA
        tone={isX ? "black" : "purple"}
        href={ext.manageUrl ?? "https://app.lemonsqueezy.com/my-orders"}
        label={isX ? "Manage X subscription" : "Manage extension subscription"}
        external
      />
    ) : ext.access === "free" && checkoutConfigured ? (
      <ExtensionCTA
        tone={isX ? "black" : "purple"}
        href={isX ? X_EXTENSION_CHECKOUT_PATH : EXTENSION_CHECKOUT_PATH}
        label={isX ? `Get Engage for X — $${plan.price}/month` : `Get the extension — $${plan.price}/month`}
      />
    ) : ext.access === "free" ? (
      <p className="text-[12.5px] text-white/80">Checkout isn&apos;t available right now. Please try again later.</p>
    ) : null

  return (
    <ExtensionPlanCard
      status={
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
            {extensionStatusLine(ext)}
          </span>
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold underline underline-offset-2 text-white/90 hover:text-white"
            >
              Install from Chrome Web Store
            </a>
          )}
        </div>
      }
      cta={cta}
      showTrialNote={ext.access === "free"}
      plan={plan}
      tone={isX ? "black" : "purple"}
    />
  )
}
