import Link from "next/link"
import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, ExternalLink, Hand, ImageIcon, Lightbulb, MessageSquare } from "lucide-react"

export const metadata: Metadata = {
  title: "Toolkit",
  description: "Every CarouseLabs tool and browser extension in one place.",
}

// Chrome Web Store listing URLs. null renders a disabled button rather than a
// link, so a listing that is not live yet can never ship as a broken href.
//
// TODO(comment): set once the Comment extension clears Web Store review.
const IDEAS_BOARD_STORE_URL: string | null =
  "https://chromewebstore.google.com/detail/carouselabs-ideas-board/jiambimimcofcfnefffcpcciocfpajma"
const COMMENT_STORE_URL: string | null = null

type ToolCard =
  | { kind: "tool"; name: string; description: string; icon: LucideIcon; href: string }
  | {
      kind: "extension"
      name: string
      description: string
      icon: LucideIcon
      storeUrl: string | null
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
    name: "CarouseLabs Ideas Board",
    description: "Save inspiration from anywhere on the web with one right-click.",
    icon: Lightbulb,
    storeUrl: IDEAS_BOARD_STORE_URL,
  },
  {
    kind: "extension",
    name: "CarouseLabs Comment",
    description: "Generate genuine LinkedIn comments in your own voice.",
    icon: MessageSquare,
    storeUrl: COMMENT_STORE_URL,
  },
]

const ctaClass =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#000000] text-[12px] font-semibold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"

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

export default function ToolkitPage() {
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

              <div className="mt-auto pt-1">
                <Cta tool={tool} />
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
