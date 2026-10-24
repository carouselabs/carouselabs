"use client"

// Admin panel chrome: collapsible sidebar (a drawer on phones) + topbar with
// the page title, Admin badge, search and the signed-in email. Dark theme.
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  HeartPulse,
  MonitorSmartphone,
  Cpu,
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
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConsoleMark } from "@/components/brand/ConsoleMark"
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
      { href: "/admin/engage/ai", label: "AI", icon: Cpu },
      { href: "/admin/engage/errors", label: "Errors", icon: AlertTriangle },
      { href: "/admin/engage/health", label: "Health", icon: HeartPulse },
      { href: "/admin/engage/sessions", label: "Sessions", icon: MonitorSmartphone },
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
  if (pathname.startsWith("/admin/users/") && pathname.endsWith("/email")) return "Email with AI"
  if (pathname.startsWith("/admin/users/") && pathname !== "/admin/users") return "User Profile"
  if (pathname.startsWith("/admin/interns/") && pathname !== "/admin/interns") return "Intern Profile"
  if (pathname.startsWith("/admin/engage/users/")) return "Engage user"
  if (pathname === "/admin/engage") return "Engage overview"
  if (pathname === "/admin/broadcasts/writer") return "Write with AI"
  if (pathname === "/admin/broadcasts/campaigns") return "Campaigns"
  if (pathname === "/admin/broadcasts/sent") return "Sent emails"
  if (pathname === "/admin/broadcasts/leads") return "Leads"
  if (pathname === "/admin/broadcasts/report") return "Email report"
  if (pathname.startsWith("/admin/broadcasts/campaigns/")) return "Campaign"
  const item = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => pathname.startsWith(n.href))
  return item ? item.label : "Admin"
}

const navRow =
  "group relative flex items-center gap-3 rounded-control-sm px-3 py-2 text-label font-medium transition-colors duration-(--motion-fast)"

export function AdminShell({
  email,
  children,
  pathname: pathnameOverride,
}: {
  email: string
  children: ReactNode
  /** Preview only: render as if on this path. */
  pathname?: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useStoredState<string[]>("admin:open-nav-groups", [])
  const currentPath = usePathname()
  const pathname = pathnameOverride ?? currentPath

  // Dialogs, menus and toasts render outside the admin wrapper, at the end of
  // <body>; theme the whole page dark while the admin is open so they match.
  useEffect(() => {
    const root = document.documentElement
    const before = root.getAttribute("data-theme")
    root.setAttribute("data-theme", "dark")
    return () => {
      if (before === null) root.removeAttribute("data-theme")
      else root.setAttribute("data-theme", before)
    }
  }, [])

  // Phones: Escape closes the drawer.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileOpen])

  const narrow = collapsed && !mobileOpen

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground print:h-auto print:overflow-visible print:bg-white">
      {/* Phones: the sidebar is a drawer over the page */}
      {mobileOpen && (
        <div aria-hidden className="fixed inset-0 z-(--z-dialog) bg-overlay md:hidden print:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        aria-label="Admin"
        className={cn(
          "fixed inset-y-0 left-0 z-(--z-dialog) flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-[transform,width,visibility] duration-(--motion-panel) ease-standard md:static md:z-auto md:translate-x-0 print:hidden",
          // Closed on phones: off-screen and out of the tab order.
          mobileOpen ? "translate-x-0 shadow-dialog" : "-translate-x-full max-md:invisible",
          narrow ? "md:w-16" : "md:w-60"
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- the brand mark, a fixed 28px image */}
          <img src="/icon.png" alt="" width={28} height={28} className="size-7 shrink-0 rounded-[8px]" />
          {!narrow && (
            <span className="truncate text-label font-semibold tracking-[-0.01em]">
              CarouseLabs <span className="text-brand">Admin</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="-mr-1 ml-auto flex size-9 items-center justify-center rounded-control-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground md:hidden"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <nav aria-label="Admin pages" className="flex-1 overflow-y-auto p-2.5">
          {SECTIONS.map((section, index) => {
            // A group holding the current page never hides it.
            const holdsCurrent = section.items.some((item) => isActive(item.href, pathname))
            const open = narrow || holdsCurrent || openGroups.includes(section.id)
            return (
              <div key={section.id} className="pb-2">
                {narrow ? (
                  index > 0 && <div className="mx-3 my-2 border-t border-border" aria-hidden />
                ) : (
                  <button
                    type="button"
                    aria-expanded={open}
                    disabled={holdsCurrent}
                    onClick={() =>
                      setOpenGroups(open ? openGroups.filter((id) => id !== section.id) : [...openGroups, section.id])
                    }
                    className="flex w-full items-center justify-between rounded-control-sm px-3 pt-3 pb-1.5 text-caption font-medium text-muted-foreground/80 transition-colors duration-(--motion-fast) hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground/80"
                  >
                    {section.title}
                    {!holdsCurrent && (
                      <ChevronDown
                        className={cn("size-3.5 transition-transform duration-(--motion-fast)", !open && "-rotate-90")}
                        aria-hidden
                      />
                    )}
                  </button>
                )}
                {open && (
                  <div className="flex flex-col gap-0.5">
                    {section.items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href, pathname)
                      return (
                        <Link
                          key={href}
                          href={href}
                          title={narrow ? label : undefined}
                          aria-label={narrow ? label : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            navRow,
                            active
                              ? "bg-surface-raised text-foreground"
                              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                          )}
                        >
                          {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" />}
                          <Icon className={cn("size-4 shrink-0", active && "text-brand")} aria-hidden />
                          {!narrow && <span className="truncate">{label}</span>}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-border p-2.5">
          <Link
            href="/dashboard"
            title={narrow ? "Back to app" : undefined}
            aria-label={narrow ? "Back to app" : undefined}
            className={cn(navRow, "text-muted-foreground hover:bg-surface-muted hover:text-foreground")}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {!narrow && <span>Back to app</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={narrow ? "Expand" : undefined}
            className={cn(navRow, "hidden text-muted-foreground hover:bg-surface-muted hover:text-foreground md:flex")}
          >
            {narrow ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" aria-hidden />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm md:px-8 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-control-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground md:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <h1 className="truncate text-body font-semibold tracking-[-0.01em]">{pageTitle(pathname)}</h1>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-control-sm border border-border px-2 py-0.5 text-caption font-medium text-muted-foreground sm:inline-flex">
              <ConsoleMark className="size-3" />
              Admin
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("admin:open-search"))}
              className="flex h-9 items-center gap-2 rounded-control-sm border border-border bg-surface px-3 text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground"
            >
              <Search className="size-3.5" aria-hidden />
              Search
              <kbd className="hidden rounded-[4px] border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">
                ⌘K
              </kbd>
            </button>
            <span className="hidden text-caption text-muted-foreground lg:inline">{email}</span>
          </div>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 print:h-auto print:overflow-visible print:p-0">
          <div className="mx-auto w-full max-w-[90rem]">{children}</div>
        </main>
      </div>
      <GlobalSearch />
    </div>
  )
}
