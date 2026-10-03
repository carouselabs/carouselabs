"use client"

// Admin panel chrome: collapsible dark sidebar + topbar with Admin badge.
import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SlidersHorizontal,
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
  Award,
  ListChecks,
  CalendarClock,
  UserPlus,
  Gift,
  Workflow,
  Activity,
  UserCog,
  KeyRound,
  History,
  ChevronDown,
} from "lucide-react"
import { GlobalSearch } from "@/components/admin/GlobalSearch"
import { useStoredState } from "@/components/admin/useStoredState"

// One group per product. The product you're in is open; the others start
// folded so its pages stay in view, and open with a click (remembered in this
// browser).
const SECTIONS = [
  {
    id: "web",
    title: "CarouseLabs",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/prefill-user", label: "Pre-fill Profile", icon: UserPlus },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/admin/posts", label: "Posts", icon: FileText },
      { href: "/admin/credits", label: "Credits", icon: Coins },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/interns", label: "Interns", icon: Award },
      { href: "/admin/tasks", label: "Manage Tasks", icon: ListChecks },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
      { href: "/admin/sequences", label: "Sequences", icon: Workflow },
      { href: "/admin/scheduled-emails", label: "Scheduled Emails", icon: CalendarClock },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    id: "engage",
    title: "CarouseLabs Engage",
    items: [
      { href: "/admin/engage", label: "Overview", icon: Activity },
      { href: "/admin/engage/users", label: "Engage users", icon: UserCog },
      { href: "/admin/engage/access", label: "Free access", icon: KeyRound },
      { href: "/admin/engage/controls", label: "Controls", icon: SlidersHorizontal },
      { href: "/admin/engage/audit", label: "Engage audit log", icon: History },
    ],
  },
]

const NAV = SECTIONS.flatMap((s) => s.items)

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin" || href === "/admin/engage") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/users/") && pathname !== "/admin/users") return "User Profile"
  if (pathname.startsWith("/admin/interns/") && pathname !== "/admin/interns") return "Intern Profile"
  if (pathname.startsWith("/admin/engage/users/")) return "Engage user"
  if (pathname === "/admin/engage") return "Engage overview"
  const item = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => pathname.startsWith(n.href))
  return item ? item.label : "Admin"
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useStoredState<string[]>("admin:open-nav-groups", [])
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F] text-white print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-[#2A2A2A] bg-[#141414] transition-all duration-200 print:hidden ${
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

        <nav className="flex-1 overflow-y-auto p-2.5">
          {SECTIONS.map((section, index) => {
            // A group holding the current page never hides it.
            const holdsCurrent = section.items.some((item) => isActive(item.href, pathname))
            const open = collapsed || holdsCurrent || openGroups.includes(section.id)
            return (
              <div key={section.id} className="pb-1">
                {collapsed ? (
                  index > 0 && <div className="mx-3 my-2 border-t border-[#2A2A2A]" aria-hidden />
                ) : (
                  <button
                    type="button"
                    aria-expanded={open}
                    disabled={holdsCurrent}
                    onClick={() =>
                      setOpenGroups(open ? openGroups.filter((id) => id !== section.id) : [...openGroups, section.id])
                    }
                    className="flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#8A8A8A] transition-colors hover:text-white disabled:cursor-default disabled:hover:text-[#8A8A8A]"
                  >
                    {section.title}
                    {!holdsCurrent && (
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
                    )}
                  </button>
                )}
                {open && (
                  <div className="space-y-1">
                    {section.items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href, pathname)
                      return (
                        <Link
                          key={href}
                          href={href}
                          title={collapsed ? label : undefined}
                          aria-current={active ? "page" : undefined}
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
                  </div>
                )}
              </div>
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
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#2A2A2A] bg-[#0F0F0F]/90 px-6 backdrop-blur print:hidden">
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
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8 print:h-auto print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
      <GlobalSearch />
    </div>
  )
}
