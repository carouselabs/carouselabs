"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#0D0D1A] border-b border-[rgba(255,255,255,0.06)] backdrop-blur-sm"
          : "bg-transparent",
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">C</span>
          </div>
          <span className="text-[15px] font-semibold text-white">CarouseLabs</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.55)] hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-[13px] font-semibold text-white transition-colors"
          >
            Start for free
          </Link>
        </div>
      </div>
    </nav>
  )
}
