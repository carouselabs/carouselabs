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
      <aside className="hidden md:flex md:row-span-2 flex-col bg-white border-r border-[#E5E3DE]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-[56px] px-5 border-b border-[#E5E3DE] flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon.ico"
            alt="CarouseLabs"
            className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
          />
          <span className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.2px]">
            CarouseLabs
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-3 space-y-1 overflow-y-auto">
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
        <div className="border-t border-[#E5E3DE] px-2 py-2 flex-shrink-0">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="h-[52px] rounded-lg bg-[#F1EFE9] animate-pulse" />
          )}
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 h-[58px] bg-white border-t border-[#E5E3DE] flex items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-[3px] flex-1 py-2"
            >
              <Icon size={20} className={active ? "text-[#1A1A1A]" : "text-[#9CA3AF]"} />
              <span
                className={`text-[10px] font-medium leading-none ${
                  active ? "text-[#1A1A1A]" : "text-[#9CA3AF]"
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
