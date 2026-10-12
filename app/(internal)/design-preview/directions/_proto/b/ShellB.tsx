"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Calendar, CornerDownLeft, LogOut, MessagesSquare, Plus, Search, Sparkles, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFrame, type Screen } from "../Frame"
import { accountItems, destinations, groupOf, groups, type DestinationId, type NavGroup } from "../nav"
import { Avatar, FrameSheet } from "../shared"

const ICONS: Record<NavGroup["id"], React.ReactNode> = {
  create: <Sparkles aria-hidden />,
  content: <Calendar aria-hidden />,
  engage: <MessagesSquare aria-hidden />,
}

export function toScreen(id: DestinationId): Screen {
  if (id === "generate") return "generate"
  if (id === "create") return "create"
  return `stub:${id}`
}

/* Go to… (⌘K) ─────────────────────────────────────────────────────── */

const ALL = [
  ...groups.flatMap((g) => g.items.map((id) => ({ id, group: g.label }))),
  ...accountItems.map((id) => ({ id, group: "Account" })),
]

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { go, container } = useFrame()
  const [query, setQuery] = React.useState("")
  const results = ALL.filter(({ id, group }) =>
    `${destinations[id].label} ${group} ${destinations[id].route}`.toLowerCase().includes(query.trim().toLowerCase())
  )
  const pick = (id: DestinationId) => {
    onOpenChange(false)
    setQuery("")
    go(toScreen(id))
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-dialog) bg-overlay data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-x-3 top-16 z-(--z-dialog) mx-auto flex max-h-[70%] max-w-xl flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-dialog outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0">
          <DialogPrimitive.Title className="sr-only">Go to</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) pick(results[0].id)
              }}
              placeholder="Go to a page — try “calendar” or “billing”"
              aria-label="Search pages"
              className="h-13 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-label text-muted-foreground">Nothing matches “{query}”.</p>
            ) : (
              <ul className="flex flex-col">
                {results.map(({ id, group }, i) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => pick(id)}
                      className="flex w-full items-center justify-between gap-3 rounded-control-sm px-3 py-2.5 text-left hover:bg-surface-muted focus-visible:bg-surface-muted"
                    >
                      <span className="flex flex-col">
                        <span className="text-label font-medium">{destinations[id].label}</span>
                        <span className="text-caption text-muted-foreground">{group}</span>
                      </span>
                      {i === 0 && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* Account ─────────────────────────────────────────────────────────── */

function AccountMenu() {
  const { go } = useFrame()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" aria-label="Account menu" className="rounded-full" />}>
        <Avatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-caption text-muted-foreground">Aarav Mehta · Pro · 642 credits</DropdownMenuLabel>
          {accountItems.map((id) => (
            <DropdownMenuItem key={id} onClick={() => go(`stub:${id}`)}>
              {destinations[id].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* Dock (desktop) and tab bar (mobile) ─────────────────────────────── */

function Dock({ activeGroup }: { activeGroup: string }) {
  const { go } = useFrame()
  return (
    <div className="pointer-events-none sticky bottom-6 z-(--z-sticky) hidden justify-center @3xl/app:flex">
      <nav aria-label="Main" className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface-raised/95 p-1.5 shadow-dialog backdrop-blur-sm">
        {groups.map((g) => (
          <DropdownMenu key={g.id}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-current={activeGroup === g.id ? "true" : undefined}
                  className="relative inline-flex h-10 items-center gap-2 rounded-full px-4 text-label font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground aria-[current=true]:bg-surface-muted aria-[current=true]:text-foreground [&_svg]:size-4"
                />
              }
            >
              {ICONS[g.id]}
              {g.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" sideOffset={10} className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-caption text-muted-foreground">{g.label}</DropdownMenuLabel>
                {g.items.map((id) => (
                  <DropdownMenuItem key={id} onClick={() => go(toScreen(id))}>
                    {destinations[id].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
        <span aria-hidden className="mx-1 h-6 w-px bg-border" />
        <Button size="sm" variant="brand" className="rounded-full" onClick={() => go("generate")}>
          <Plus aria-hidden /> New post
        </Button>
      </nav>
    </div>
  )
}

function TabBar({ activeGroup }: { activeGroup: string }) {
  const { go } = useFrame()
  const [open, setOpen] = React.useState<null | NavGroup["id"] | "account">(null)
  const tabs = [...groups.map((g) => ({ id: g.id, label: g.label, icon: ICONS[g.id] })), { id: "account" as const, label: "You", icon: <UserRound aria-hidden /> }]
  const sheetItems = open === "account" ? accountItems : groups.find((g) => g.id === open)?.items ?? []
  return (
    <>
      <nav aria-label="Main" className="sticky bottom-0 z-(--z-sticky) grid grid-cols-4 border-t border-border bg-background/95 pb-2 backdrop-blur-sm @3xl/app:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={activeGroup === t.id ? "true" : undefined}
            onClick={() => setOpen(t.id)}
            className="flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground aria-[current=true]:text-foreground [&_svg]:size-5"
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
      <FrameSheet
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open === "account" ? "You" : groups.find((g) => g.id === open)?.label ?? ""}
      >
        <div className="flex flex-col">
          {open === "create" && (
            <Button variant="brand" className="mb-2" onClick={() => { setOpen(null); go("generate") }}>
              <Plus aria-hidden /> New post
            </Button>
          )}
          {sheetItems.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setOpen(null)
                go(toScreen(id))
              }}
              className="flex h-12 items-center justify-between border-b border-border text-left text-body last:border-b-0"
            >
              {destinations[id].label}
            </button>
          ))}
        </div>
      </FrameSheet>
    </>
  )
}

/**
 * Direction B shell: almost no chrome. A slim top bar (where you are + Go to…),
 * a floating dock on desktop, a tab bar on mobile. The work fills the page.
 */
export function ShellB({
  active,
  crumb,
  actions,
  hideNav = false,
  children,
}: {
  active: DestinationId
  /** Override the breadcrumb's last part (e.g. the post title in the editor). */
  crumb?: string
  /** Contextual actions on the right of the top bar. */
  actions?: React.ReactNode
  /** Focus mode (the editor): no dock or tab bar. */
  hideNav?: boolean
  children: React.ReactNode
}) {
  const [palette, setPalette] = React.useState(false)
  const g = groupOf(active)
  const groupLabel = g === "account" ? "Account" : groups.find((x) => x.id === g)?.label
  const label = crumb ?? destinations[active].label

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-(--z-header) flex h-14 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-sm @5xl/app:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="CarouseLabs" className="size-6" />
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-2 text-label">
            <li className="hidden text-muted-foreground @3xl/app:block">{groupLabel}</li>
            <li aria-hidden className="hidden text-muted-foreground/60 @3xl/app:block">/</li>
            <li aria-current="page" className="truncate font-medium">{label}</li>
          </ol>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="inline-flex h-9 items-center gap-2 rounded-control-sm border border-border bg-surface px-2.5 text-label text-muted-foreground transition-colors hover:border-control-border hover:text-foreground"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden @5xl/app:inline">Go to…</span>
            <kbd className="hidden rounded-[4px] border border-border px-1 text-[11px] @5xl/app:inline">Ctrl K</kbd>
            <span className="sr-only @5xl/app:hidden">Go to</span>
          </button>
          <AccountMenu />
        </div>
      </header>
      <main className={cn("flex flex-1 flex-col")}>{children}</main>
      {!hideNav && <Dock activeGroup={g} />}
      {!hideNav && <TabBar activeGroup={g} />}
      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  )
}
