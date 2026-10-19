"use client"

// A thin bar across the top of the app that starts the moment a navigation
// link is clicked and finishes once the new page's address is in place.
//
// Most clicks switch pages instantly (each page's loading.tsx is prefetched),
// so the bar waits SHOW_AFTER_MS before appearing and never flashes on those.
// It shows when a click really is waiting: a page that wasn't prefetched yet,
// a cold server, or Clerk refreshing the sign-in after the tab sat idle.
//
// Links start it through <NavLink> (Link's onNavigate, which fires only for
// in-app navigations, never for new-tab or modified clicks); code that calls
// router.push() calls startNavigation() first. <NavigationProgress> ends it
// when the pathname changes.

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const SHOW_AFTER_MS = 150
const FADE_MS = 300
// Never leave the bar running if a navigation is abandoned (e.g. blocked).
const GIVE_UP_AFTER_MS = 15_000

export type NavigationPhase = "idle" | "loading" | "done"

let phase: NavigationPhase = "idle"
let awaiting = false
let showTimer: ReturnType<typeof setTimeout> | undefined
let giveUpTimer: ReturnType<typeof setTimeout> | undefined
let idleTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function setPhase(next: NavigationPhase) {
  if (phase === next) return
  phase = next
  listeners.forEach((listener) => listener())
}

/** Starts the bar for a navigation to `href` (ignored for the current page or another site). */
export function startNavigation(href: string) {
  if (typeof window === "undefined") return
  const target = new URL(href, window.location.href)
  if (target.origin !== window.location.origin || target.pathname === window.location.pathname) return
  awaiting = true
  clearTimeout(showTimer)
  clearTimeout(giveUpTimer)
  clearTimeout(idleTimer)
  if (phase !== "loading") showTimer = setTimeout(() => setPhase("loading"), SHOW_AFTER_MS)
  giveUpTimer = setTimeout(finishNavigation, GIVE_UP_AFTER_MS)
}

/** Ends the bar: fills it and fades it out, or cancels it if it hadn't shown yet. */
export function finishNavigation() {
  if (!awaiting) return
  awaiting = false
  clearTimeout(showTimer)
  clearTimeout(giveUpTimer)
  if (phase === "loading") {
    setPhase("done")
    idleTimer = setTimeout(() => setPhase("idle"), FADE_MS + 20)
  }
}

export function getNavigationPhase(): NavigationPhase {
  return phase
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** A next/link Link that starts the progress bar when it navigates. */
export function NavLink({
  href,
  onNavigate,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  return (
    <Link
      href={href}
      onNavigate={(event) => {
        onNavigate?.(event)
        startNavigation(href)
      }}
      {...props}
    />
  )
}

export function NavigationProgress() {
  const pathname = usePathname()
  const current = React.useSyncExternalStore(subscribe, getNavigationPhase, () => "idle" as const)
  const barRef = React.useRef<HTMLDivElement>(null)
  const creep = React.useRef<Animation | null>(null)

  // A new address means the navigation landed.
  React.useEffect(() => {
    finishNavigation()
  }, [pathname])

  React.useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (current === "loading") {
      // A click during the fade-out restarts the bar: drop the old fade first.
      bar.getAnimations().forEach((animation) => animation.cancel())
      // Creeps towards 90%, slowing as it goes, so a long wait still looks
      // alive without pretending to know how long is left.
      creep.current = bar.animate(
        reduced ? [{ transform: "scaleX(0.6)" }, { transform: "scaleX(0.6)" }] : [{ transform: "scaleX(0.05)" }, { transform: "scaleX(0.9)" }],
        { duration: reduced ? 1 : 9000, easing: "cubic-bezier(0.1, 0.65, 0.2, 1)", fill: "forwards" },
      )
    } else if (current === "done") {
      // Fill from wherever it got to, then fade.
      const from = getComputedStyle(bar).transform
      creep.current?.cancel()
      bar.animate(
        [
          { transform: from === "none" ? "scaleX(0.05)" : from, opacity: 1 },
          { transform: "scaleX(1)", opacity: 0 },
        ],
        { duration: reduced ? 1 : FADE_MS, easing: "ease-out", fill: "forwards" },
      )
    }
  }, [current])

  if (current === "idle") return null
  return (
    <div
      role="progressbar"
      aria-label="Loading the page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[calc(var(--z-header)+1)] h-0.5"
    >
      <div ref={barRef} className="h-full origin-left bg-brand" style={{ transform: "scaleX(0.05)" }} />
    </div>
  )
}
