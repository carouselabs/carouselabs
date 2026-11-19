"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ChevronDown, Menu, Pause, Play } from "lucide-react"

import { cn } from "@/lib/utils"

// The mobile menu only matters after a tap, so its code loads on demand.
const MobileMenu = dynamic(() => import("./MobileMenu").then((m) => m.MobileMenu), { ssr: false })

// Every destination here already exists. Anchors are absolute ("/#…") so the
// header works from every marketing page, not only the home page.
export const MENUS = [
  {
    label: "Product",
    items: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Thumbnail Recreation", href: "/#thumbnail" },
      { label: "Content Hub", href: "/#content-hub" },
    ],
  },
  {
    label: "Engage",
    items: [
      { label: "CarouseLabs Engage for LinkedIn", href: "/#extension" },
      { label: "CarouseLabs Engage for X", href: "/#x-extension" },
    ],
  },
  { label: "Pricing", href: "/#pricing" },
  {
    label: "Resources",
    items: [
      { label: "Tap & Hold Maker (Free)", href: "/tools/tap-hold-maker" },
      { label: "Verify Certificate", href: "/verify-certificate" },
    ],
  },
  { label: "Contact", href: "/#contact" },
] as const

// The floating pill's links (anantgoyal.in): 15px, ink-2, a soft ink wash on hover.
const navLink =
  "inline-flex h-11 items-center gap-1 rounded-full px-4 text-[15px] font-medium text-[#46426B] transition-colors hover:bg-[#100C33]/5 hover:text-foreground aria-expanded:bg-[#100C33]/5 aria-expanded:text-foreground"

/**
 * Site navigation uses the disclosure pattern (a button that shows a list of
 * links), not an application menu: links stay links for assistive tech, and
 * it needs no menu library on the home page.
 */
function NavDisclosure({ label, items }: { label: string; items: readonly { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        root.current?.querySelector("button")?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div
      ref={root}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={navLink}>
        {label}
        <ChevronDown aria-hidden className={cn("size-3.5 opacity-60 transition-transform duration-(--motion-fast)", open && "rotate-180")} />
      </button>
      <ul
        id={id}
        hidden={!open}
        className="absolute top-full left-0 z-(--z-popover) mt-3 w-72 rounded-[22px] border border-border bg-surface p-2 shadow-float"
      >
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-[14px] px-3 py-2 text-[15px] text-foreground transition-colors hover:bg-surface-muted"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The pause switch for the page's ambient motion (floating pieces, the marquee). */
function useMotionPause() {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem("site-motion") === "paused") {
        document.documentElement.setAttribute("data-motion", "paused")
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors a saved choice once on mount
        setPaused(true)
      }
    } catch {}
  }, [])
  const toggle = () => {
    const next = !paused
    setPaused(next)
    if (next) document.documentElement.setAttribute("data-motion", "paused")
    else document.documentElement.removeAttribute("data-motion")
    try {
      localStorage.setItem("site-motion", next ? "paused" : "on")
    } catch {}
  }
  return { paused, toggle }
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Mount the lazily loaded menu on first use, then keep it so closing
  // animates and focus returns to the button.
  const [menuLoaded, setMenuLoaded] = useState(false)
  const { paused, toggle } = useMotionPause()
  const MotionIcon = paused ? Play : Pause

  return (
    <header className="fixed inset-x-0 top-0 z-(--z-header) px-3 pt-3 font-ui sm:px-4 md:px-6">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-(--z-toast) focus:rounded-full focus:bg-surface focus:px-5 focus:py-3 focus:text-foreground focus:shadow-float"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 rounded-full border border-white/60 bg-white/80 pr-2 pl-4 shadow-[0_10px_40px_-18px_rgb(20_10_90/0.45)] backdrop-blur-xl sm:pl-5"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full text-[17px] font-semibold tracking-[-0.02em] text-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="size-8" />
          <span>CarouseLabs</span>
        </Link>

        <ul className="mx-auto hidden items-center gap-0.5 lg:flex">
          {MENUS.map((menu) => (
            <li key={menu.label} className="relative">
              {"items" in menu ? (
                <NavDisclosure label={menu.label} items={menu.items} />
              ) : (
                <a href={menu.href} className={navLink}>
                  {menu.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={paused}
            aria-label={paused ? "Play background animations" : "Pause background animations"}
            title={paused ? "Play animations" : "Pause animations"}
            className="hidden size-11 place-items-center rounded-full text-[#46426B] transition-colors hover:bg-[#100C33]/5 hover:text-foreground sm:grid"
          >
            <MotionIcon aria-hidden className="size-4" strokeWidth={2.2} />
          </button>
          <Link href="/sign-in" className={cn(navLink, "hidden sm:inline-flex")}>
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground shadow-[0_10px_24px_-10px_rgb(16_12_51/0.6)] transition-[translate,background-color,box-shadow] duration-200 hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 active:scale-[0.97] motion-reduce:hover:translate-y-0"
          >
            Get Started
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground lg:hidden"
            onClick={() => {
              setMenuLoaded(true)
              setMenuOpen(true)
            }}
          >
            <Menu aria-hidden className="size-5" />
          </button>
        </div>
      </nav>

      {menuLoaded && <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} menus={MENUS} />}
    </header>
  )
}
