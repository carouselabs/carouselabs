// components/settings/SettingsTabs.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/voice-presets", label: "Voice Presets" },
  { href: "/settings/account", label: "Account" },
]

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[22px] font-bold text-[rgba(255,255,255,0.92)] tracking-[-0.3px]">
        Settings
      </h1>

      {/* Scrollable tab row on mobile */}
      <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.08)] overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                active
                  ? "text-[#F0F0FA]"
                  : "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]",
              ].join(" ")}
            >
              {tab.label}
              {active && (
                <span className="absolute left-0 -bottom-px h-0.5 w-full bg-[#7C3AED] rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
