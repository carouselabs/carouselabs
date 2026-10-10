"use client"

// Header + tab row for the website's Extension section
// (app/(app)/extension/*). Same look as components/settings/SettingsTabs.
// The X tab (CarouseLabs Engage for X) has its own title and words.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Puzzle } from "lucide-react"

const TABS = [
  { href: "/extension", label: "Overview" },
  { href: "/extension/profiles", label: "Custom tones" },
  { href: "/extension/agents", label: "AI agents" },
  { href: "/extension/history", label: "History" },
  { href: "/extension/settings", label: "Settings" },
  { href: "/extension/x", label: "X (Twitter)" },
  { href: "/extension/billing", label: "Plan & payments" },
]

export function ExtensionTabs() {
  const pathname = usePathname()
  const onX = pathname === "/extension/x"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.08)] text-[#7C3AED]">
            <Puzzle size={17} strokeWidth={2} />
          </span>
          <h1 className="text-[22px] font-bold text-[#0A0A0A] tracking-[-0.3px]">
            {onX ? "X Extension" : "LinkedIn Extension"}
          </h1>
        </div>
        <p className="text-[13px] text-[#6B7280] leading-[1.6] max-w-2xl">
          {onX
            ? "Everything CarouseLabs Engage for X uses, in one place. Your plan covers both extensions."
            : "Everything the CarouseLabs Engage extension uses, in one place."}{" "}
          Changes you make here show up in the extension, and changes made in the extension show up here.
        </p>
      </div>

      {/* Scrollable tab row on mobile */}
      <div className="flex items-center gap-1 border-b border-[#E5E3DE] overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                active ? "text-[#0A0A0A]" : "text-[#9CA3AF] hover:text-[#374151]",
              ].join(" ")}
            >
              {tab.label}
              {active && <span className="absolute left-0 -bottom-px h-0.5 w-full bg-[#1A1A1A] rounded-full" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
