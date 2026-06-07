"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Sparkles, Clock, Bookmark, Settings } from "lucide-react"
import { NavItem } from "./NavItem"
import { UserMenu } from "./UserMenu"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Generate", icon: Sparkles },
  { href: "/history", label: "History", icon: Clock },
  { href: "/pinned", label: "Pinned", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useCurrentUser()

  function isActive(href: string) {
    if (href === "/settings") return pathname.startsWith("/settings")
    return pathname === href
  }

  return (
    <>
      {/* Desktop sidebar — row-span-2 so it fills both topbar and main rows */}
      <aside className="hidden md:flex md:row-span-2 flex-col bg-[#0D0D1A] border-r border-[rgba(255,255,255,0.05)]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-[52px] px-4 border-b border-[rgba(255,255,255,0.05)] flex-shrink-0">
          <div className="w-[26px] h-[26px] rounded-md bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="4.67" y1="0" x2="4.67" y2="14" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
              <line x1="9.33" y1="0" x2="9.33" y2="14" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
              <line x1="0" y1="4.67" x2="14" y2="4.67" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
              <line x1="0" y1="9.33" x2="14" y2="9.33" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-[rgba(255,255,255,0.8)] tracking-[-0.2px]">
            CarouseLabs
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-[10px] pt-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.href)}
            />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-[rgba(255,255,255,0.05)] px-2 py-2 flex-shrink-0">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="h-[52px] rounded-lg bg-[rgba(255,255,255,0.02)] animate-pulse" />
          )}
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 h-[56px] bg-[#0D0D1A] border-t border-[rgba(255,255,255,0.07)] flex items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-[3px] flex-1 py-2"
            >
              <Icon
                size={20}
                className={active ? "text-[#8B5CF6]" : "text-[rgba(255,255,255,0.3)]"}
              />
              <span
                className={`text-[10px] font-medium leading-none ${
                  active ? "text-[#A78BFA]" : "text-[rgba(255,255,255,0.28)]"
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
