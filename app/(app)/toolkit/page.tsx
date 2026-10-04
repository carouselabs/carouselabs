import Link from "next/link"
import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, AtSign, ExternalLink, Hand, ImageIcon, MessageSquare } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import {
  EXTENSION_CHECKOUT_PATH,
  EXTENSION_PLAN,
  EXTENSION_STORE_URL,
  X_EXTENSION_CHECKOUT_PATH,
  X_EXTENSION_PLAN,
  X_EXTENSION_STORE_URL,
} from "@/lib/plans"

export const metadata: Metadata = {
  title: "Toolkit",
  description: "Every CarouseLabs tool and browser extension in one place.",
}

// The Engage extensions' Chrome Web Store listings live in lib/plans.ts with
// the rest of their product data, since the billing pages link to them too.
// null renders no Install button rather than a broken link.

type ToolCard =
  | { kind: "tool"; name: string; description: string; icon: LucideIcon; href: string }
  | {
      kind: "extension"
      name: string
      description: string
      icon: LucideIcon
      storeUrl: string | null
      // Paid extensions: each its own $15/month plan, bought separately
      // (lib/plans.ts). LinkedIn and X are separate products.
      paid?: "linkedin" | "x"
    }

const TOOLS: ToolCard[] = [
  {
    kind: "tool",
    name: "Tap & Hold Maker",
    description: "Create tap-and-hold reveal images for Instagram/X.",
    icon: Hand,
    href: "/tools/tap-hold-maker",
  },
  {
    kind: "tool",
    name: "Thumbnail Recreation Tool",
    description: "Recreate any YouTube thumbnail style with AI.",
    icon: ImageIcon,
    href: "/thumbnail",
  },
  {
    kind: "extension",
    name: "CarouseLabs Engage for LinkedIn",
    description:
      "Unlimited LinkedIn comments, replies, connection notes and conversations in your own voice — $15/month, sold separately.",
    icon: MessageSquare,
    storeUrl: EXTENSION_STORE_URL,
    paid: "linkedin",
  },
  {
    kind: "extension",
    name: "CarouseLabs Engage for X",
    description: "Unlimited X replies and messages in your own, natural voice — $15/month, sold separately from LinkedIn.",
    icon: AtSign,
    storeUrl: X_EXTENSION_STORE_URL,
    paid: "x",
  },
]

const ctaClass =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#000000] text-[12px] font-semibold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"

const secondaryClass =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#7C3AED]/30 bg-white hover:bg-[rgba(124,58,237,0.06)] text-[12px] font-semibold text-[#7C3AED] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"

// The paid extension's second button: buy it, or show it's already unlocked.
// Installing and trying it is free (10 generations), so Install stays the
// primary action once the listing is live.
function PlanCta({ unlimited, platform }: { unlimited: boolean; platform: "linkedin" | "x" }) {
  if (unlimited) {
    return (
      <Link href={platform === "x" ? "/extension/x" : "/extension"} className={secondaryClass}>
        Unlimited — open
      </Link>
    )
  }
  const price = platform === "x" ? X_EXTENSION_PLAN.price : EXTENSION_PLAN.price
  return (
    <a href={platform === "x" ? X_EXTENSION_CHECKOUT_PATH : EXTENSION_CHECKOUT_PATH} className={secondaryClass}>
      Get unlimited — ${price}/month
    </a>
  )
}

function Cta({ tool }: { tool: ToolCard }) {
  if (tool.kind === "tool") {
    return (
      <Link href={tool.href} className={ctaClass}>
        Open Tool
        <ArrowRight size={14} />
      </Link>
    )
  }

  if (!tool.storeUrl) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E9E7E1] text-[12px] font-semibold text-[#9CA3AF] cursor-not-allowed"
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
      <ExternalLink size={14} />
    </a>
  )
}

export default async function ToolkitPage() {
  // The (app) layout has already required a signed-in user.
  const user = await getCurrentUser()
  const [extension, xExtension] = user
    ? await Promise.all([extAccessSummary(user.id), extAccessSummary(user.id, "x")])
    : [null, null]
  const unlimited = { linkedin: extension?.access === "unlimited", x: xExtension?.access === "unlimited" }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-bold text-[#0A0A0A]">Toolkit</h1>
        <p className="text-[13px] text-[#9CA3AF]">
          Every CarouseLabs tool and browser extension, in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <article
              key={tool.name}
              className="group flex flex-col items-start gap-3 p-5 rounded-xl bg-[#F4F2EC] border border-[#E9E7E1] hover:border-[#7C3AED] hover:bg-[rgba(124,58,237,0.05)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] transition-all duration-150"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-[#E5E3DE] text-[#7C3AED]">
                  <Icon size={20} />
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-[#7C3AED] bg-[rgba(124,58,237,0.08)]">
                  {tool.kind === "tool" ? "Tool" : "Chrome extension"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-[14px] font-semibold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors">
                  {tool.name}
                </h2>
                <p className="text-[12px] text-[#6B7280] leading-[1.5]">{tool.description}</p>
              </div>

              <div className="mt-auto pt-1 flex flex-wrap items-center gap-2">
                {/* A paid extension with no listing yet shows only its plan
                    button, never a dead "Coming soon". */}
                {!(tool.kind === "extension" && tool.paid && !tool.storeUrl) && <Cta tool={tool} />}
                {tool.kind === "extension" && tool.paid && <PlanCta unlimited={unlimited[tool.paid]} platform={tool.paid} />}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
