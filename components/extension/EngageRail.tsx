"use client"

// components/extension/EngageRail.tsx — Engage's own menu, beside every page
// of the website's Extension section (app/(app)/extension/layout.tsx): the
// extensions at the top, each with its plan, so switching is one click and
// keeps the section you're on (when the other extension has it); then the
// sections — Home, Voices, Saved comments (LinkedIn only), Agents, Activity,
// Plan & setup. On wide screens a card down the left; on
// phones and tablets two scrolling rows of pills above the page.
import { usePathname } from "next/navigation"
import { Activity, ArrowUpRight, Bookmark, Bot, CreditCard, House, MessageSquare, type LucideIcon } from "lucide-react"
import { NavLink } from "@/components/shell/NavigationProgress"
import type { EngagePlatform } from "@/lib/engage/features"
import {
  ENGAGE_EXTENSIONS,
  ENGAGE_PLATFORMS,
  EngageIcon,
  extensionTabs,
  hasSection,
  platformOfPath,
  tabPathOf,
  type ExtensionTabPath,
} from "./engageExtensions"
import { TONE_DOT, type PlanStatus } from "./engageStatus"

const SECTION_ICONS: Record<ExtensionTabPath, LucideIcon> = {
  "": House,
  "/profiles": MessageSquare,
  "/saved": Bookmark,
  "/agents": Bot,
  "/history": Activity,
  "/billing": CreditCard,
}

export function EngageRail({
  statuses,
  pathname: pathnameOverride,
}: {
  // Each extension's plan, for the line under its name (missing: not shown).
  statuses: Partial<Record<EngagePlatform, PlanStatus>>
  /** Development previews only: the route to show as current. */
  pathname?: string
}) {
  const realPathname = usePathname()
  const pathname = pathnameOverride ?? realPathname
  const platform = platformOfPath(pathname)
  const section = tabPathOf(pathname)
  const info = ENGAGE_EXTENSIONS[platform]
  // Launched extensions, plus one still being built when you're on its pages.
  const platforms = ENGAGE_PLATFORMS.includes(platform) ? ENGAGE_PLATFORMS : [...ENGAGE_PLATFORMS, platform]

  return (
    <aside
      aria-label="Engage"
      className="flex min-w-0 flex-col gap-3 rounded-card bg-surface-raised p-2.5 shadow-card lg:w-64 lg:shrink-0 lg:p-3.5"
    >
      <p className="hidden px-2 pt-1.5 text-caption font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:block">
        Your extensions
      </p>
      <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
        {platforms.map((p) => {
          const ext = ENGAGE_EXTENSIONS[p]
          const current = p === platform
          const status = statuses[p]
          return (
            <li key={p} className="shrink-0">
              <NavLink
                href={`${ext.base}${hasSection(p, section) ? section : ""}`}
                aria-current={current ? "true" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-[16px] border border-transparent px-2.5 py-2 transition-colors duration-(--motion-fast) hover:bg-surface-muted aria-[current=true]:border-[#D9D2FF] aria-[current=true]:bg-[#F7F5FF] aria-[current=true]:shadow-[0_10px_22px_-16px_rgb(32_16_110/0.5)] lg:min-h-14"
              >
                <span className="flex shrink-0 overflow-hidden rounded-[10px]">
                  <EngageIcon platform={p} size={32} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label font-semibold whitespace-nowrap text-foreground">{ext.site}</span>
                  {status && (
                    <span className="hidden text-caption whitespace-nowrap text-muted-foreground lg:block">{status.line}</span>
                  )}
                </span>
                {status && (
                  <span aria-hidden className={`hidden size-2 shrink-0 rounded-full lg:block ${TONE_DOT[status.tone]}`} />
                )}
                {status && <span className="sr-only">, {status.line}</span>}
              </NavLink>
            </li>
          )
        })}
      </ul>

      <div aria-hidden className="mx-2 hidden h-px bg-border lg:block" />

      <nav aria-label="Engage sections">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {extensionTabs(platform).map((tab) => {
            const Icon = SECTION_ICONS[tab.path]
            return (
              <li key={tab.path} className="shrink-0">
                <NavLink
                  href={tab.href}
                  aria-current={tab.path === section ? "page" : undefined}
                  className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-label font-medium whitespace-nowrap text-[#46426B] transition-colors duration-(--motion-fast) hover:bg-surface-muted hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary-foreground lg:aria-[current=page]:bg-surface-muted lg:aria-[current=page]:text-foreground"
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
                  {tab.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* The extension writes on the site, not here: one way there. */}
      <div className="engage-night mt-2 hidden flex-col gap-2.5 rounded-[18px] p-4 lg:flex">
        <p className="text-caption leading-normal text-white/75">
          {info.name.replace("CarouseLabs ", "")} writes inside {info.site}, not on this page.
        </p>
        <a
          href={info.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-between gap-2 rounded-[12px] bg-[#D4FF5C] px-3.5 text-label font-semibold text-[#100C33] transition-opacity duration-(--motion-fast) hover:opacity-90"
        >
          Open {info.site}
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>
    </aside>
  )
}
