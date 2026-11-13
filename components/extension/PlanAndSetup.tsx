// components/extension/PlanAndSetup.tsx — Engage → Plan & setup for one
// extension (/extension/billing, /extension/x/billing,
// /extension/reddit/billing): its plan and how to change it, how to install
// it on another browser, the browsers it's signed in on, its preferences
// (what Settings used to hold) and every payment for it. Server component.
import { ArrowRight, ArrowUpRight, Check } from "lucide-react"
import type { ExtAccessSummary } from "@/lib/extAccess"
import type { EngagePlatform } from "@/lib/engage/features"
import { EXTENSION_PLANS } from "@/lib/plans"
import { engageAccess, engageSignIns } from "@/lib/engage/pageData"
import { BillingRefresher } from "@/components/billing/BillingRefresher"
import { DevicesList } from "./DevicesList"
import { EngagePageHead } from "./EngagePageHead"
import { ExtensionSettingsForm } from "./ExtensionSettingsForm"
import { extensionPlanAction, extensionStatusLine } from "./ExtensionPlanSection"
import { ExtensionPrice } from "./ExtensionPrice"
import { InstallSteps } from "./InstallSteps"
import { PaymentsList } from "./PaymentsList"
import { XSettingsPanel } from "./XExtensionViews"
import { ENGAGE_EXTENSIONS, ENGAGE_PLATFORMS } from "./engageExtensions"

const accessLabel = (ext: ExtAccessSummary) =>
  ext.access === "unlimited" ? "Unlimited" : ext.access === "testing" ? "Testing" : "Free"

export async function PlanAndSetup({ platform, user }: { platform: EngagePlatform; user: { id: string; email: string } }) {
  const [ext, signIns] = await Promise.all([engageAccess(user.id, platform), engageSignIns(user.id)])
  return <PlanAndSetupView platform={platform} email={user.email} ext={ext} signedInBrowsers={signIns[platform]} />
}

const card = "flex min-w-0 flex-col gap-4 rounded-card bg-surface-raised p-6 shadow-card"
const cardTitle = "text-lead font-semibold tracking-[-0.02em] text-foreground"

export function PlanAndSetupView({
  platform,
  email,
  ext,
  signedInBrowsers,
}: {
  platform: EngagePlatform
  email: string
  ext: ExtAccessSummary
  signedInBrowsers: number
}) {
  const info = ENGAGE_EXTENSIONS[platform]
  const plan = EXTENSION_PLANS[platform]
  const action = extensionPlanAction(ext, platform)
  const free = ext.access === "free"
  const otherSites = ENGAGE_PLATFORMS.filter((p) => p !== platform).map((p) => ENGAGE_EXTENSIONS[p].site)

  return (
    <div className="flex flex-col gap-5">
      {/* Coming back from the Lemon Squeezy tab shows the new plan. */}
      <BillingRefresher />

      <EngagePageHead
        title="Plan & setup,"
        accent="in one place."
        lead={`Your ${info.site} plan and payments, the browsers it's signed in on, and how it behaves.`}
      />

      {/* The plan */}
      <section
        id={platform === "linkedin" ? "extension-plan" : `${platform}-extension-plan`}
        aria-labelledby="engage-plan-title"
        className="engage-canvas relative flex flex-wrap items-stretch gap-7 overflow-hidden rounded-showcase p-6 sm:p-8"
      >
        <span aria-hidden className="engage-orb engage-orb-violet -bottom-16 left-[40%] size-32" />
        <div className="relative flex min-w-0 flex-[1_1_18rem] flex-col gap-3.5">
          <p className="text-caption font-semibold tracking-[0.1em] text-white/80 uppercase">Your plan on {info.site}</p>
          <h2 id="engage-plan-title" className="text-[3.5rem] leading-none font-semibold tracking-[-0.04em] sm:text-[4rem]">
            {accessLabel(ext)}
          </h2>
          <p className="text-body-lg text-white/90">{extensionStatusLine(ext)}</p>
          {free && (
            <div
              role="meter"
              aria-label="Free generations used"
              aria-valuemin={0}
              aria-valuemax={ext.freeLimit}
              aria-valuenow={Math.min(ext.freeUsed, ext.freeLimit)}
              className="h-2.5 max-w-sm overflow-hidden rounded-full bg-white/20"
            >
              <div
                className="h-full rounded-full bg-[#D4FF5C]"
                style={{ width: `${Math.min(100, (ext.freeUsed / Math.max(1, ext.freeLimit)) * 100)}%` }}
              />
            </div>
          )}
          {otherSites.length > 0 && (
            <p className="mt-1.5 text-label text-white/75">
              {otherSites.join(" and ")} {otherSites.length === 1 ? "has its" : "each have their"} own plan. Buying one
              doesn&apos;t unlock the others.
            </p>
          )}
        </div>

        <div className="relative flex min-w-0 flex-[1_1_18rem] flex-col gap-3.5 rounded-[22px] bg-white p-6 text-[#100C33] shadow-[0_30px_60px_-24px_rgb(32_16_110/0.55)]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lead font-semibold">Unlimited</p>
            <p className="text-[2rem] font-semibold tracking-[-0.03em]">
              <ExtensionPrice price={ext.price} />
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-label">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          {action?.kind === "buy" && (
            <a
              href={action.href}
              className="mt-auto inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-body font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {action.label}
              <ExtensionPrice price={ext.price} />
              <ArrowRight className="size-4" aria-hidden />
            </a>
          )}
          {action?.kind === "manage" && (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-body font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {action.label}
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          )}
          {action?.kind === "note" && <p className="text-caption text-muted-foreground">{action.label}</p>}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        {/* Installing */}
        <section id="install" aria-label="Install" className="min-w-0">
          <InstallSteps platform={platform} email={email} ext={ext} signedInBrowsers={signedInBrowsers} />
        </section>

        {/* Where it's signed in */}
        <section aria-labelledby="engage-browsers" className={card}>
          <div className="flex flex-col gap-1">
            <h2 id="engage-browsers" className={cardTitle}>
              Signed-in browsers
            </h2>
            <p className="text-label text-muted-foreground">
              Where {info.name} is signed in to this account. Sign one out if it isn&apos;t yours any more.
            </p>
          </div>
          <DevicesList key={signedInBrowsers} platform={platform} />
        </section>

        {/* What Settings used to hold */}
        <section id="preferences" aria-labelledby="engage-preferences" className="flex min-w-0 flex-col gap-3 xl:col-span-2">
          <div className="flex flex-col gap-1 px-1">
            <h2 id="engage-preferences" className={cardTitle}>
              Preferences
            </h2>
            <p className="text-label text-muted-foreground">
              How the extension behaves. Changes show up in the extension straight away.
            </p>
          </div>
          {platform === "x" ? <XSettingsPanel /> : <ExtensionSettingsForm />}
        </section>

        {/* Payments */}
        <section aria-labelledby="engage-payments" className={`${card} xl:col-span-2`}>
          <div className="flex flex-col gap-1">
            <h2 id="engage-payments" className={cardTitle}>
              Payments
            </h2>
            <p className="text-label text-muted-foreground">
              {platform === "linkedin" ? (
                <>
                  Payments for the LinkedIn extension only. Web plan payments are in{" "}
                  <a href="/settings/billing" className="font-semibold text-brand hover:underline">
                    Settings → Billing
                  </a>
                  .
                </>
              ) : (
                `Payments for ${info.name} only.`
              )}
            </p>
          </div>
          <PaymentsList platform={platform} />
        </section>
      </div>
    </div>
  )
}
