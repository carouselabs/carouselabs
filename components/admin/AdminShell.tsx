"use client"

// Admin panel chrome: collapsible dark sidebar + topbar with Admin badge.
import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Coins,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  ShieldCheck,
  ScrollText,
  Megaphone,
  Search,
} from "lucide-react"
import { GlobalSearch } from "@/components/admin/GlobalSearch"

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/credits", label: "Credits", icon: Coins },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/users/") && pathname !== "/admin/users") return "User Profile"
  const item = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => pathname.startsWith(n.href))
  return item ? item.label : "Admin"
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F] text-white">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-[#2A2A2A] bg-[#141414] transition-all duration-200 ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
      >
        <div className="flex h-[56px] items-center gap-2.5 border-b border-[#2A2A2A] px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="truncate text-[13px] font-bold tracking-tight">
              CarouseLabs <span className="text-[#A78BFA]">Admin</span>
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[#7C3AED]/15 text-[#A78BFA]"
                    : "text-[#8A8A8A] hover:bg-[#1F1F1F] hover:text-white"
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-[#2A2A2A] p-2.5">
          <Link
            href="/dashboard"
            title={collapsed ? "Back to app" : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#8A8A8A] transition-colors hover:bg-[#1F1F1F] hover:text-white"
          >
            <ArrowLeft className="h-[17px] w-[17px] shrink-0" />
            {!collapsed && <span>Back to app</span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#8A8A8A] transition-colors hover:bg-[#1F1F1F] hover:text-white"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[17px] w-[17px] shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-[17px] w-[17px] shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#2A2A2A] bg-[#0F0F0F]/90 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold tracking-tight">{pageTitle(pathname)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#A78BFA]">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new Event("admin:open-search"))}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-1.5 text-[12px] text-[#8A8A8A] transition-colors hover:border-[#3A3A3A] hover:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              Search
              <kbd className="rounded border border-[#2A2A2A] bg-[#1F1F1F] px-1.5 py-0.5 text-[10px] text-[#6A6A6A]">
                ⌘K
              </kbd>
            </button>
            <span className="text-[12px] text-[#6A6A6A]">{email}</span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">{children}</main>
      </div>
      <GlobalSearch />
    </div>
  )
}
