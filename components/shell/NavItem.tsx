"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"

interface NavItemProps {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
}

export function NavItem({ href, label, icon: Icon, isActive }: NavItemProps) {
  return (
    <div className="relative">
      {isActive && (
        <span className="absolute left-0 top-[5px] bottom-[5px] w-[2px] bg-[#7C3AED] rounded-r-full" />
      )}
      <Link
        href={href}
        className={`group flex items-center gap-[10px] px-3 py-[9px] rounded-lg text-[13px] tracking-[-0.1px] transition-colors ${
          isActive
            ? "bg-[rgba(124,58,237,0.12)] text-[rgba(255,255,255,0.85)]"
            : "text-[rgba(255,255,255,0.35)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.6)]"
        }`}
      >
        <Icon
          size={15}
          className={
            isActive
              ? "text-[#8B5CF6]"
              : "text-[rgba(255,255,255,0.3)] group-hover:text-[rgba(255,255,255,0.5)]"
          }
        />
        {label}
      </Link>
    </div>
  )
}
