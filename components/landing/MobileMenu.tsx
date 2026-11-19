"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { X } from "lucide-react"

import type { MENUS } from "./Navbar"

/**
 * Loaded on demand from Navbar the first time the menu button is tapped.
 * A full-screen sheet on the blue → violet ground, after anantgoyal.in:
 * large white links, the main action at the foot. Escape or any link closes it.
 */
export function MobileMenu({
  open,
  onOpenChange,
  menus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  menus: typeof MENUS
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const close = () => onOpenChange(false)

  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open, onOpenChange])

  return (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      className={`ground-canvas fixed inset-0 z-(--z-dialog) flex flex-col overflow-y-auto px-6 pt-6 pb-8 font-ui transition-[opacity,visibility] duration-300 lg:hidden ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="flex justify-end">
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="grid size-11 place-items-center rounded-full bg-white text-[#100C33]"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="mt-6 flex flex-col gap-7">
        {menus.map((menu) =>
          "items" in menu ? (
            <section key={menu.label} aria-label={menu.label} className="flex flex-col">
              <h2 className="mb-1 text-[13px] font-medium text-white/85">{menu.label}</h2>
              {menu.items.map((item) => (
                <a key={item.href} href={item.href} onClick={close} className="flex min-h-12 items-center text-xl font-semibold tracking-[-0.02em] text-white">
                  {item.label}
                </a>
              ))}
            </section>
          ) : (
            <a key={menu.label} href={menu.href} onClick={close} className="flex min-h-12 items-center text-3xl font-semibold tracking-[-0.03em] text-white">
              {menu.label}
            </a>
          )
        )}
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Link href="/sign-up" onClick={close} className="inline-flex h-14 items-center justify-center rounded-full bg-white text-base font-medium text-[#100C33]">
          Get Started
        </Link>
        <Link href="/sign-in" onClick={close} className="inline-flex h-14 items-center justify-center rounded-full border border-white/40 text-base font-medium text-white">
          Sign in
        </Link>
      </div>
    </div>
  )
}
