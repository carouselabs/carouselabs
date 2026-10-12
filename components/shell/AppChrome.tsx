"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import {
  Award,
  Calendar,
  ChevronDown,
  CreditCard,
  LogOut,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  UserRound,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser, type CurrentUser } from "@/lib/hooks/useCurrentUser"
import { ConsoleMark } from "@/components/brand/ConsoleMark"
import { useInternAccess } from "@/lib/hooks/useInternAccess"
import { useIdeaSessionStore } from "@/lib/store/ideaSessionStore"
import { useCreditStore } from "@/lib/store/creditStore"
import { ENGAGE_EXTENSIONS, ENGAGE_PLATFORMS } from "@/components/extension/engageExtensions"
import { GoToPalette } from "./GoToPalette"
import { PlanBadge } from "./PlanBadge"
import { GROUPS, SETTINGS_ITEMS, groupOf, isActiveItem, subNavItems, type GroupId, type NavItem } from "./nav"

const GROUP_ICONS: Record<GroupId, React.ReactNode> = {
  create: <Sparkles aria-hidden />,
  content: <Calendar aria-hidden />,
  engage: <MessagesSquare aria-hidden />,
}

const INTERN_ITEM: NavItem = { label: "Intern Points", href: "/intern" }

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }
  return email[0].toUpperCase()
}

/* Credits ─────────────────────────────────────────────────────────── */

/** The balance line, same wording and rules as before the redesign. */
function Credits({ user, className }: { user: CurrentUser; className?: string }) {
  // Live balance — updated by generation clients after each charge, so the
  // count refreshes without a page reload. Falls back to the initial fetch.
  const liveCredits = useCreditStore((s) => s.creditsRemaining)
  const left = liveCredits ?? user.creditsRemaining ?? 0
  const limit = user.freeLimit ?? 1
  // Purchased top-up credits (already inside `left`). The breakdown is only
  // trustworthy while the balance matches the initial fetch — after a live
  // charge we only know the combined total, since spends may have come out
  // of the extras.
  const extra = user.extraCredits ?? 0
  const showExtraBreakdown = extra > 0 && left === user.creditsRemaining
  return (
    <span className={cn("text-caption text-muted-foreground tabular-nums whitespace-nowrap", className)}>
      {user.plan !== "FREE" ? (
        showExtraBreakdown ? (
          <>
            {left - extra} credits + {extra} extra
          </>
        ) : (
          <>{left} credits left</>
        )
      ) : (
        <span className={left === 0 ? "font-medium text-warning" : undefined}>
          {left} / {limit} free credit{limit === 1 ? "" : "s"} left
        </span>
      )}
    </span>
  )
}

/* Account ─────────────────────────────────────────────────────────── */

function useSignOut() {
  const { signOut } = useClerk()
  const router = useRouter()
  return () => signOut(() => router.push("/sign-in"))
}

function accountItems(isEmployeeSubdomain: boolean) {
  return [
    { label: "View Profile", href: "/settings/profile", icon: <User aria-hidden /> },
    { label: "Billing", href: "/settings/billing", icon: <CreditCard aria-hidden /> },
    // The full settings area doesn't apply to an intern-only account.
    ...(isEmployeeSubdomain ? [] : [{ label: "Settings", href: "/settings", icon: <Settings aria-hidden /> }]),
  ]
}

function AccountMenu({ user, isEmployeeSubdomain }: { user: CurrentUser | null; isEmployeeSubdomain: boolean }) {
  const router = useRouter()
  const signOut = useSignOut()
  if (!user) return <span className="size-8 shrink-0 animate-pulse rounded-full bg-skeleton" aria-hidden />
  const displayName = user.name ?? user.email.split("@")[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground after:absolute after:-inset-1.5 after:content-['']"
          />
        }
      >
        {getInitials(user.name, user.email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 px-2.5 py-2">
            <span className="min-w-0 flex-1 truncate text-label font-medium text-foreground">{displayName}</span>
            <PlanBadge plan={user.plan} />
          </DropdownMenuLabel>
          {!isEmployeeSubdomain && (
            <DropdownMenuLabel className="px-2.5 pt-0 pb-2 lg:hidden">
              <Credits user={user} />
            </DropdownMenuLabel>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {accountItems(isEmployeeSubdomain).map((item) => (
          <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)} className="[&_svg]:text-muted-foreground">
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOut aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* Desktop pieces ──────────────────────────────────────────────────── */

function NewPostMenu() {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" variant="brand" className="max-lg:w-9 max-lg:px-0" aria-label="New post" />}
      >
        <Plus aria-hidden />
        <span className="hidden lg:inline">New post</span>
        <ChevronDown aria-hidden className="-mr-1 hidden opacity-70 lg:inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        {GROUPS[0].items.slice(0, 2).map((item) => (
          <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Ctrl K on Windows/Linux, ⌘K on Apple devices (decided after hydration). */
function useIsApple() {
  return React.useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false
  )
}

function GoToButton({ onOpen }: { onOpen: () => void }) {
  const isApple = useIsApple()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-keyshortcuts={isApple ? "Meta+K" : "Control+K"}
      className="relative inline-flex h-9 shrink-0 items-center gap-2 rounded-control-sm border border-border bg-surface px-2.5 text-label text-muted-foreground transition-colors duration-(--motion-fast) after:absolute after:-inset-1 after:content-[''] hover:border-control-border hover:text-foreground"
    >
      <Search className="size-4" aria-hidden />
      <span className="hidden xl:inline">Go to…</span>
      <span className="sr-only xl:hidden">Go to…</span>
      <kbd className="hidden rounded-detail border border-border px-1 font-ui text-[11px] leading-4 xl:inline">
        {isApple ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  )
}

function SubNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav aria-label="Section" className="no-scrollbar -mb-px flex min-w-0 gap-5 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActiveItem(item.href, pathname) ? "page" : undefined}
          className="relative flex h-11 shrink-0 items-center text-label whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

/* Mobile tab bar ──────────────────────────────────────────────────── */

type Sheet = GroupId | "intern" | "you"
/** A tab either opens a sheet of pages or, with a single page, goes straight there. */
type Tab = { id: Sheet; label: string; icon: React.ReactNode } & ({ items: NavItem[]; href?: never } | { href: string; items?: never })

function MobileTabBar({
  tabs,
  active,
  user,
  isEmployeeSubdomain,
  pathname,
}: {
  tabs: Tab[]
  active: string | null
  user: CurrentUser | null
  isEmployeeSubdomain: boolean
  pathname: string
}) {
  const [open, setOpen] = React.useState<Sheet | null>(null)
  const signOut = useSignOut()
  const sheet = tabs.find((t) => t.id === open)
  const close = () => setOpen(null)

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-(--z-header) grid border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => {
          const cls =
            "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground aria-[current=true]:text-foreground [&_svg]:size-5"
          return t.href ? (
            <Link key={t.id} href={t.href} aria-current={active === t.id ? "true" : undefined} className={cls}>
              {t.icon}
              {t.label}
            </Link>
          ) : (
            <button
              key={t.id}
              type="button"
              aria-current={active === t.id ? "true" : undefined}
              aria-haspopup="dialog"
              onClick={() => setOpen(t.id)}
              className={cls}
            >
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </nav>
      <Drawer open={open !== null} onOpenChange={(o) => !o && close()}>
        <DrawerContent side="bottom" title={sheet?.label ?? ""} className="md:hidden">
          {open === "you" && user && (
            <div className="flex items-center gap-3 rounded-control bg-surface-muted px-3 py-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {getInitials(user.name, user.email)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label font-medium">{user.name ?? user.email.split("@")[0]}</span>
                {!isEmployeeSubdomain && <Credits user={user} />}
              </span>
              <PlanBadge plan={user.plan} />
            </div>
          )}
          <ul className="flex flex-col">
            {sheet?.items?.map((item) => (
              <li key={item.href} className="border-b border-border last:border-b-0">
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex h-12 items-center text-body aria-[current=page]:font-semibold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {open === "you" && (
            <Button
              variant="outline"
              className="text-danger"
              onClick={() => {
                close()
                signOut()
              }}
            >
              <LogOut aria-hidden />
              Log out
            </Button>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}

/* Shell ───────────────────────────────────────────────────────────── */

/**
 * The signed-in app frame (approved layout A): a two-row top bar — activities
 * and global actions, then the active activity's pages — with B's bottom tab
 * bar on phones and "Go to…" (Ctrl/⌘ K) everywhere. `main` stays the scroll
 * container, with the same padding pages were built against.
 */
export function AppChrome({
  isEmployeeSubdomain = false,
  pathname: pathnameOverride,
  children,
}: {
  isEmployeeSubdomain?: boolean
  /** Development previews only: the route to show as current. */
  pathname?: string
  children: React.ReactNode
}) {
  const realPathname = usePathname()
  const pathname = pathnameOverride ?? realPathname
  const { user } = useCurrentUser()
  const isIntern = useInternAccess()
  const reset = useIdeaSessionStore((s) => s.reset)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const isDashboard = pathname === "/dashboard"
  const isAdmin = !isEmployeeSubdomain && !!user?.isAdmin

  const activeGroupId = groupOf(pathname)
  // employee.carouselabs.com is restricted to the intern portal (see
  // proxy.ts) — interns never see CarouseLabs' content-creation nav there.
  const groups = isEmployeeSubdomain ? [] : GROUPS
  // The intern-only subdomain has no activity groups, so no second row there.
  const subItems = isEmployeeSubdomain ? null : subNavItems(pathname)

  React.useEffect(() => {
    if (isEmployeeSubdomain) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEmployeeSubdomain])

  const primary: { id: GroupId | "intern"; label: string; href: string }[] = [
    ...groups.map((g) => ({ id: g.id, label: g.label, href: g.items[0].href })),
    ...(isEmployeeSubdomain || isIntern ? [{ id: "intern" as const, ...INTERN_ITEM }] : []),
  ]

  const youItems = [
    ...accountItems(isEmployeeSubdomain)
      .filter((i) => i.href !== "/settings")
      .map(({ label, href }) => ({ label, href })),
    ...(isEmployeeSubdomain ? [] : SETTINGS_ITEMS.filter((i) => i.href !== "/settings/profile" && i.href !== "/settings/billing")),
    ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
  ]
  const tabs: Tab[] = [
    ...groups.map((g) => ({
      id: g.id,
      label: g.label,
      icon: GROUP_ICONS[g.id],
      // Engage has one page per extension rather than sub-tabs (yet).
      items:
        g.id === "engage"
          ? ENGAGE_PLATFORMS.map((p) => ({ label: ENGAGE_EXTENSIONS[p].name, href: ENGAGE_EXTENSIONS[p].base }))
          : g.items,
    })),
    ...(isEmployeeSubdomain || isIntern ? [{ id: "intern" as const, label: INTERN_ITEM.label, icon: <Award aria-hidden />, href: INTERN_ITEM.href }] : []),
    { id: "you" as const, label: "You", icon: <UserRound aria-hidden />, items: youItems },
  ]
  const activeTab = activeGroupId === "settings" ? "you" : activeGroupId

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-toast) focus:rounded-control-sm focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-label focus:shadow-popover"
      >
        Skip to content
      </a>
      <header className="relative z-(--z-header) shrink-0 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-3 px-6 md:gap-4 md:px-10 lg:gap-6">
          <Link href={isEmployeeSubdomain ? "/intern" : "/dashboard"} className="flex shrink-0 items-center gap-2 rounded-control-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="CarouseLabs" className="size-7 rounded-lg object-cover" />
            <span className="hidden text-body font-semibold tracking-[-0.02em] lg:inline" aria-hidden>
              CarouseLabs
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {primary.map((g) => (
              <Link
                key={g.id}
                href={g.href}
                aria-current={g.id === activeGroupId ? "true" : undefined}
                className="inline-flex h-9 items-center rounded-control-sm px-3 text-label font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-muted hover:text-foreground aria-[current=true]:bg-surface-muted aria-[current=true]:text-foreground"
              >
                {g.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 lg:gap-3">
            {/* Admin quick-link and credit balance are CarouseLabs-app-wide
                concepts that don't apply to an intern-only account — and on
                employee.carouselabs.com "/admin" would just bounce back here
                (see proxy.ts), so hide it there entirely. */}
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden h-7 items-center gap-1.5 rounded-control-sm bg-foreground px-2.5 text-caption font-semibold text-background transition-opacity duration-(--motion-fast) hover:opacity-85 md:inline-flex"
              >
                <ConsoleMark />
                Admin
              </Link>
            )}
            {!isEmployeeSubdomain && user && <Credits user={user} className="min-w-0 truncate md:hidden lg:inline" />}
            {isDashboard && (
              <Button variant="outline" size="xs" onClick={reset} className="border-border">
                New session
              </Button>
            )}
            {!isEmployeeSubdomain && (
              <>
                <span className="hidden md:contents">
                  <NewPostMenu />
                </span>
                <GoToButton onOpen={() => setPaletteOpen(true)} />
              </>
            )}
            <span className="hidden md:contents">
              <AccountMenu user={user} isEmployeeSubdomain={isEmployeeSubdomain} />
            </span>
          </div>
        </div>
        {subItems && (
          <div className="flex min-h-11 items-center border-t border-border/70 px-6 md:px-10">
            <SubNav items={subItems} pathname={pathname} />
          </div>
        )}
      </header>

      {/* scroll-pb: whatever scrolls into view (a focused field, a button)
          stops above the phone tab bar instead of behind it. */}
      <main
        id="main"
        tabIndex={-1}
        className="relative min-h-0 flex-1 scroll-pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto px-6 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none md:scroll-pb-0 md:px-10 md:pb-10"
      >
        {/* min-h, not h: a fixed-height wrapper lets long pages overflow it, which drops main's bottom padding */}
        <div className="relative min-h-full">{children}</div>
      </main>

      <MobileTabBar
        tabs={tabs}
        active={activeTab}
        user={user}
        isEmployeeSubdomain={isEmployeeSubdomain}
        pathname={pathname}
      />
      {!isEmployeeSubdomain && (
        <GoToPalette open={paletteOpen} onOpenChange={setPaletteOpen} isIntern={isIntern} isAdmin={isAdmin} />
      )}
    </>
  )
}
