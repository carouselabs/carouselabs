"use client"

// Header + tab row for the website's Extension section
// (app/(app)/extension/*). Same look as components/settings/SettingsTabs.
// The two Engage extensions are separate products with their own pages: the
// title is a dropdown that switches between them (LinkedIn's at /extension/*,
// X's at /extension/x/*), staying on the same tab.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import type { EngagePlatform } from "@/lib/engage/features"
import {
  ENGAGE_EXTENSIONS,
  ENGAGE_PLATFORMS,
  EngageIcon,
  extensionTabs,
  platformOfPath,
  tabPathOf,
  type ExtensionTabPath,
} from "./engageExtensions"

function ExtensionSwitcher({ platform, tabPath }: { platform: EngagePlatform; tabPath: ExtensionTabPath }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={root} className="relative w-fit max-w-full">
      <h1>
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
          className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-[#F4F2EC] outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"
        >
          <EngageIcon platform={platform} />
          <span className="min-w-0 text-[19px] sm:text-[22px] font-bold leading-tight text-[#0A0A0A] tracking-[-0.3px]">
            {ENGAGE_EXTENSIONS[platform].name}
          </span>
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#E5E3DE] bg-white text-[#6B7280]">
            <ChevronDown size={15} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </span>
        </button>
      </h1>

      {open && (
        <div
          id={menuId}
          className="absolute left-0 top-full z-30 mt-2 w-[min(25rem,calc(100vw-2rem))] rounded-2xl border border-[#E5E3DE] bg-white p-1.5 shadow-[0_12px_32px_rgba(10,10,10,0.12)]"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
            Your extensions
          </p>
          <ul className="flex flex-col">
            {ENGAGE_PLATFORMS.map((p) => {
              const ext = ENGAGE_EXTENSIONS[p]
              const current = p === platform
              return (
                <li key={p}>
                  <Link
                    href={`${ext.base}${tabPath}`}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50",
                      current ? "bg-[#F9F7F2]" : "hover:bg-[#F9F7F2]",
                    ].join(" ")}
                  >
                    <EngageIcon platform={p} size={28} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[13.5px] font-semibold text-[#0A0A0A]">{ext.name}</span>
                      <span className="text-[12px] text-[#6B7280]">{ext.summary}</span>
                    </span>
                    {current && <Check size={16} className="flex-shrink-0 text-[#7C3AED]" />}
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="px-3 pb-2 pt-1.5 text-[11.5px] leading-[1.5] text-[#9CA3AF]">
            Two separate extensions, each installed and paid for on its own.
          </p>
        </div>
      )}
    </div>
  )
}

export function ExtensionTabs() {
  const pathname = usePathname()
  const platform = platformOfPath(pathname)
  const ext = ENGAGE_EXTENSIONS[platform]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        {/* Keyed by the page, so going somewhere else closes the menu. */}
        <ExtensionSwitcher key={pathname} platform={platform} tabPath={tabPathOf(pathname)} />
        <p className="text-[13px] text-[#6B7280] leading-[1.6] max-w-2xl">
          {platform === "x"
            ? `Everything ${ext.name} uses, in one place. It's a separate extension from LinkedIn's, with its own plan.`
            : `Everything ${ext.name} uses, in one place.`}{" "}
          Changes you make here show up in the extension, and changes made in the extension show up here.
        </p>
      </div>

      {/* Scrollable tab row on mobile */}
      <div className="flex items-center gap-1 border-b border-[#E5E3DE] overflow-x-auto">
        {extensionTabs(platform).map((tab) => {
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
