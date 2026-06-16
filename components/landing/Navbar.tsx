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
          ? "bg-[#F9F7F2]/90 border-b border-[#E5E3DE] backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="CarouseLabs" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-[15px] font-semibold text-[#0A0A0A]">CarouseLabs</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/#pricing"
            className="text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/#contact"
            className="text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
          >
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/sign-in"
            className="px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-black text-[13px] font-semibold text-white transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}
