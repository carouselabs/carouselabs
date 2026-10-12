"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ChevronDown, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

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

const navLink =
  "inline-flex h-9 items-center gap-1 rounded-control-sm px-3 text-label font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground aria-expanded:bg-surface-muted aria-expanded:text-foreground"

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
        className="absolute top-full left-0 z-(--z-popover) mt-2 w-64 rounded-control border border-border bg-popover p-1 shadow-popover"
      >
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center rounded-control-sm px-2.5 py-2 text-label text-foreground hover:bg-surface-muted"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Mount the lazily loaded menu on first use, then keep it so closing
  // animates and focus returns to the button.
  const [menuLoaded, setMenuLoaded] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-0 top-0 z-(--z-header) font-ui transition-[background-color,border-color] duration-(--motion-normal)",
        scrolled ? "border-b border-border bg-background/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-showcase items-center gap-6 gutter-x">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-body font-semibold tracking-[-0.02em] text-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="CarouseLabs" className="size-7" />
          <span>CarouseLabs</span>
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
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

        <div className="ml-auto flex items-center gap-2">
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
            Get Started
          </Link>
          <Button variant="ghost" size="icon-sm" aria-label="Open menu" className="lg:hidden" onClick={() => {
              setMenuLoaded(true)
              setMenuOpen(true)
            }}>
            <Menu />
          </Button>
        </div>
      </div>

      {menuLoaded && <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} menus={MENUS} />}
    </nav>
  )
}
