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
        <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] bg-[#1A1A1A] rounded-r-full" />
      )}
      <Link
        href={href}
        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-[-0.1px] transition-colors ${
          isActive
            ? "bg-[#F1EFE9] text-[#0A0A0A]"
            : "text-[#6B7280] hover:bg-[#F4F2EC] hover:text-[#0A0A0A]"
        }`}
      >
        <Icon
          size={16}
          className={
            isActive
              ? "text-[#1A1A1A]"
              : "text-[#9CA3AF] group-hover:text-[#6B7280]"
          }
        />
        {label}
      </Link>
    </div>
  )
}
