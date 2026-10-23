// The Toolkit catalogue: every tool and Engage extension on its own line.
import Link from "next/link"
import { ArrowRight, ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/patterns/PageHeader"
import { ExtensionPrice } from "@/components/extension/ExtensionPrice"
import { standardPrice, type EngagePriceInfo } from "@/lib/engage/priceRules"
import { EXTENSION_STORE_URL, X_EXTENSION_STORE_URL } from "@/lib/plans"
import { ENGAGE_PLATFORMS, type EngagePlatform } from "@/lib/engage/features"
import { ENGAGE_EXTENSIONS } from "@/components/extension/engageExtensions"

// The usual price of every extension.
export const standardPrices = () =>
  Object.fromEntries(ENGAGE_PLATFORMS.map((p) => [p, standardPrice(p)])) as Record<EngagePlatform, EngagePriceInfo>

// The Engage extensions' Chrome Web Store listings live in lib/plans.ts with
// the rest of their product data, since the billing pages link to them too.
// null renders no Install button rather than a broken link.
//
// Each entry carries its own logo: the extensions use the icon people see in
// their browser toolbar (browser-extension-comment's public/ and public-x/);
// the two web tools have their own app icons in public/images/tools/.

type ToolCard =
  | { kind: "tool"; name: string; description: string; logo: string; href: string }
  | {
      kind: "extension"
      name: string
      description: string
      logo: string
      storeUrl: string | null
      // Paid extensions: each its own $15/month plan, bought separately
      // (lib/plans.ts). LinkedIn and X are separate products.
      paid?: EngagePlatform
    }

const TOOLS: ToolCard[] = [
  {
    kind: "tool",
    name: "Tap & Hold Maker",
    description: "Create tap-and-hold reveal images for Instagram/X.",
    logo: "/images/tools/tap-hold-maker.svg",
    href: "/tools/tap-hold-maker",
  },
  {
    kind: "tool",
    name: "Thumbnail Recreation Tool",
    description: "Recreate any YouTube thumbnail style with AI.",
    logo: "/images/tools/thumbnail-recreation.svg",
    href: "/thumbnail",
  },
  {
    kind: "extension",
    name: "CarouseLabs Engage for LinkedIn",
    description:
      "Unlimited LinkedIn comments, replies, connection notes and conversations in your own voice — $15/month, sold separately.",
    logo: "/images/extensions/engage-linkedin.png",
    storeUrl: EXTENSION_STORE_URL,
    paid: "linkedin",
  },
  {
    kind: "extension",
    name: "CarouseLabs Engage for X",
    description: "Unlimited X replies and messages in your own, natural voice — $15/month, sold separately from LinkedIn.",
    logo: "/images/extensions/engage-x.png",
    storeUrl: X_EXTENSION_STORE_URL,
    paid: "x",
  },
]

const ctaClass = buttonVariants({ size: "sm" })

const secondaryClass = buttonVariants({
  variant: "outline",
  size: "sm",
  className: "border-brand/35 text-brand hover:bg-brand-soft",
})

// The paid extension's second button: buy it, or show it's already unlocked.
// Installing and trying it is free (10 generations), so Install stays the
// primary action once the listing is live.
function PlanCta({ unlimited, platform, price }: { unlimited: boolean; platform: EngagePlatform; price: EngagePriceInfo }) {
  if (unlimited) {
    return (
      <Link href={ENGAGE_EXTENSIONS[platform].base} className={secondaryClass}>
        Unlimited — open
      </Link>
    )
  }
  return (
    <a href={ENGAGE_EXTENSIONS[platform].checkoutPath} className={secondaryClass}>
      Get unlimited — <ExtensionPrice price={price} />
    </a>
  )
}

function Cta({ tool }: { tool: ToolCard }) {
  if (tool.kind === "tool") {
    return (
      <Link href={tool.href} className={ctaClass}>
        Open Tool
        <ArrowRight aria-hidden />
      </Link>
    )
  }

  if (!tool.storeUrl) {
    return (
      <span
        aria-disabled="true"
        className={buttonVariants({ variant: "secondary", size: "sm", className: "cursor-not-allowed text-muted-foreground" })}
      >
        Coming soon
      </span>
    )
  }

  // A new tab, because installing means leaving for the Chrome Web Store and
  // the user will want to come back to where they were.
  return (
    <a href={tool.storeUrl} target="_blank" rel="noopener noreferrer" className={ctaClass}>
      Install Extension
      <ExternalLink aria-hidden />
    </a>
  )
}

/** `unlimited`: which paid extensions this account already has; `prices`:
 * what it pays for each (a special price an admin set, or the usual one). */
export function ToolkitView({
  unlimited,
  prices = standardPrices(),
}: {
  unlimited: Record<EngagePlatform, boolean>
  prices?: Record<EngagePlatform, EngagePriceInfo>
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader title="Toolkit" description="Every CarouseLabs tool and browser extension, in one place." />

      {/* A catalogue, not a card grid: each tool on its own line, name first. */}
      <ul className="flex flex-col border-t border-foreground/80">
        {TOOLS.map((tool) => {
          return (
            <li
              key={tool.name}
              className="group grid gap-4 border-b border-border py-6 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-x-6 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:items-center md:py-7"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo */}
              <img
                src={tool.logo}
                alt=""
                width={48}
                height={48}
                className="size-12 rounded-[12px] shadow-card transition-transform duration-(--motion-fast) group-hover:-translate-y-0.5"
              />

              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-display text-[1.75rem] leading-tight tracking-[-0.01em] text-foreground sm:text-[2rem]">
                    {tool.name}
                  </h2>
                  <span className="text-caption font-medium text-muted-foreground">
                    {tool.kind === "tool" ? "Tool" : "Chrome extension"}
                  </span>
                </div>
                <p className="max-w-[40rem] text-label text-muted-foreground">{tool.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:col-start-2 md:col-start-auto md:justify-end">
                {/* A paid extension with no listing yet shows only its plan
                    button, never a dead "Coming soon". */}
                {!(tool.kind === "extension" && tool.paid && !tool.storeUrl) && <Cta tool={tool} />}
                {tool.kind === "extension" && tool.paid && <PlanCta unlimited={unlimited[tool.paid]} platform={tool.paid} price={prices[tool.paid]} />}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
