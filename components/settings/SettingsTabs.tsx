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
      <h1 className="text-[22px] font-bold text-[#0A0A0A] tracking-[-0.3px]">
        Settings
      </h1>

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
                active
                  ? "text-[#0A0A0A]"
                  : "text-[#9CA3AF] hover:text-[#374151]",
              ].join(" ")}
            >
              {tab.label}
              {active && (
                <span className="absolute left-0 -bottom-px h-0.5 w-full bg-[#1A1A1A] rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
