"use client"

// Header for the website's Extension section (app/(app)/extension/*). The two
// Engage extensions are separate products with their own pages: the title is
// a dropdown that switches between them (LinkedIn's at /extension/*, X's at
// /extension/x/*), staying on the same tab. The tabs themselves live in the
// app header's second row (components/shell/nav.ts subNavItems).
import { NavLink } from "@/components/shell/NavigationProgress"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import type { EngagePlatform } from "@/lib/engage/features"
import {
  ENGAGE_EXTENSIONS,
  ENGAGE_PLATFORMS,
  EngageIcon,
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
          className="-mx-2 flex items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted"
        >
          <EngageIcon platform={platform} size={36} />
          <span className="min-w-0 text-lead font-semibold leading-tight text-foreground sm:text-title-sm">
            {ENGAGE_EXTENSIONS[platform].name}
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground">
            <ChevronDown className={`size-4 transition-transform duration-(--motion-fast) ${open ? "rotate-180" : ""}`} aria-hidden />
          </span>
        </button>
      </h1>

      {open && (
        <div
          id={menuId}
          className="absolute left-0 top-full z-30 mt-2 w-[min(25rem,calc(100vw-2rem))] rounded-card border border-border bg-surface-raised p-1.5 shadow-popover"
        >
          <p className="px-3 pb-1 pt-2 text-caption font-medium text-muted-foreground">
            Your extensions
          </p>
          <ul className="flex flex-col">
            {ENGAGE_PLATFORMS.map((p) => {
              const ext = ENGAGE_EXTENSIONS[p]
              const current = p === platform
              return (
                <li key={p}>
                  <NavLink
                    href={`${ext.base}${tabPath}`}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors duration-(--motion-fast)",
                      current ? "bg-surface-muted" : "hover:bg-surface-muted",
                    ].join(" ")}
                  >
                    <EngageIcon platform={p} size={28} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-label font-semibold text-foreground">{ext.name}</span>
                      <span className="text-caption text-muted-foreground">{ext.summary}</span>
                    </span>
                    {current && <Check className="size-4 shrink-0 text-brand" aria-hidden />}
                  </NavLink>
                </li>
              )
            })}
          </ul>
          <p className="px-3 pb-2 pt-1.5 text-caption leading-[1.5] text-muted-foreground">
            Two separate extensions, each installed and paid for on its own.
          </p>
        </div>
      )}
    </div>
  )
}

export function ExtensionHeader({ pathname: pathnameOverride }: { pathname?: string } = {}) {
  // Development previews pass the route to show; the app uses the real one.
  const realPathname = usePathname()
  const pathname = pathnameOverride ?? realPathname
  const platform = platformOfPath(pathname)
  const ext = ENGAGE_EXTENSIONS[platform]

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-6">
      {/* Keyed by the page, so going somewhere else closes the menu. */}
      <ExtensionSwitcher key={pathname} platform={platform} tabPath={tabPathOf(pathname)} />
      <p className="max-w-2xl text-body text-muted-foreground">
        {platform !== "linkedin"
          ? `Everything ${ext.name} uses, in one place. It's a separate extension from LinkedIn's, with its own plan.`
          : `Everything ${ext.name} uses, in one place.`}{" "}
        Changes you make here show up in the extension, and changes made in the extension show up here.
      </p>
    </div>
  )
}
