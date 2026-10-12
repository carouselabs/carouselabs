"use client"

import * as React from "react"
import { ChevronDown, LogOut, Menu, Plus } from "lucide-react"

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
import { Avatar, CreditPill, FrameSheet } from "../shared"

const ENGAGE_TABS = ["Overview", "Agents", "Profiles", "History", "Settings", "Billing"] as const
const engageId = (platform: "li" | "x", tab: (typeof ENGAGE_TABS)[number]) =>
  `${platform}${tab}` as DestinationId

export function screenToDestination(screen: Screen): DestinationId {
  if (screen === "generate") return "generate"
  if (screen === "create") return "create"
  if (screen.startsWith("stub:")) return screen.slice(5) as DestinationId
  return "generate"
}

function destinationToScreen(id: DestinationId): Screen {
  if (id === "generate") return "generate"
  if (id === "create") return "create"
  return `stub:${id}`
}

function Logo() {
  return (
    <span className="flex items-center gap-2 text-body font-semibold tracking-[-0.02em]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" className="size-6" />
      <span className="hidden @5xl/app:inline">CarouseLabs</span>
    </span>
  )
}

function AccountMenu() {
  const { go } = useFrame()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" aria-label="Account menu" className="rounded-full" />}>
        <Avatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-caption text-muted-foreground">Aarav Mehta · Pro</DropdownMenuLabel>
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

function NewPostMenu({ compact = false }: { compact?: boolean }) {
  const { go } = useFrame()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size={compact ? "icon-sm" : "sm"} aria-label={compact ? "New post" : undefined} />}>
        <Plus aria-hidden />
        {!compact && (
          <>
            New post <ChevronDown aria-hidden className="-mr-1 opacity-70" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={() => go("generate")}>Generate ideas</DropdownMenuItem>
        <DropdownMenuItem onClick={() => go("stub:ownIdea")}>Start from my own idea</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Second row: the active activity's own destinations. */
function SubNav({ group, active }: { group: NavGroup; active: DestinationId }) {
  const { go } = useFrame()
  if (group.id === "engage") {
    const platform = active.startsWith("x") ? "x" : "li"
    return (
      <div className="flex min-w-0 items-center gap-4">
        <div role="group" aria-label="Extension" className="inline-flex shrink-0 rounded-control-sm bg-surface-muted p-0.5">
          {(["li", "x"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platform === p}
              onClick={() => go(`stub:${engageId(p, "Overview")}`)}
              className="h-8 rounded-[6px] px-3 text-label font-medium text-muted-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"
            >
              {p === "li" ? "LinkedIn" : "X"}
            </button>
          ))}
        </div>
        <TabRow
          items={ENGAGE_TABS.map((t) => ({ id: engageId(platform, t), label: t }))}
          active={active}
        />
      </div>
    )
  }
  return (
    <TabRow
      items={group.items.map((id) => ({ id, label: destinations[id].label }))}
      active={active === "create" ? "generate" : active}
    />
  )
}

function TabRow({ items, active }: { items: { id: DestinationId; label: string }[]; active: DestinationId }) {
  const { go } = useFrame()
  return (
    <nav aria-label="Section" className="no-scrollbar -mb-px flex min-w-0 gap-5 overflow-x-auto">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={item.id === active ? "page" : undefined}
          onClick={() => go(destinationToScreen(item.id))}
          className="relative h-11 shrink-0 text-label whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-foreground"
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

/** Mobile: every destination in one sheet, grouped by activity. */
function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { go } = useFrame()
  const pick = (id: DestinationId) => {
    onOpenChange(false)
    go(destinationToScreen(id))
  }
  return (
    <FrameSheet open={open} onOpenChange={onOpenChange} title="Go to" side="full">
      <div className="flex flex-col gap-6">
        {[...groups, { id: "account" as const, label: "Account", items: accountItems }].map((g) => (
          <section key={g.id} aria-label={g.label} className="flex flex-col gap-1">
            <h3 className="text-caption font-medium text-muted-foreground">{g.label}</h3>
            {g.items.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className="flex h-11 items-center rounded-control-sm px-2 text-left text-body hover:bg-surface-muted"
              >
                {destinations[id].label}
              </button>
            ))}
          </section>
        ))}
      </div>
    </FrameSheet>
  )
}

/**
 * Direction A shell: two-tier top bar. Row 1 = activities + global actions;
 * row 2 = the active activity's destinations, or the editor's own toolbar.
 */
export function ShellA({
  active,
  subbar,
  children,
}: {
  active: DestinationId
  /** Replaces the sub-navigation row (used by the editor). */
  subbar?: React.ReactNode
  children: React.ReactNode
}) {
  const { go } = useFrame()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const activeGroupId = groupOf(active)
  const activeGroup = groups.find((g) => g.id === activeGroupId)
  const title = activeGroup ? `${activeGroup.label}` : "Account"

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-(--z-header) border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-3 px-4 @5xl/app:gap-6 @5xl/app:px-6">
          <Logo />
          {/* Desktop: activities */}
          <nav aria-label="Main" className="hidden items-center gap-1 @3xl/app:flex">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-current={g.id === activeGroupId ? "true" : undefined}
                onClick={() => go(destinationToScreen(g.items[0]))}
                className="h-9 rounded-control-sm px-3 text-label font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground aria-[current=true]:bg-surface-muted aria-[current=true]:text-foreground"
              >
                {g.label}
              </button>
            ))}
          </nav>
          {/* Mobile: where am I */}
          <span className="text-body font-semibold @3xl/app:hidden">{title}</span>
          <div className="ml-auto flex items-center gap-2 @5xl/app:gap-4">
            <CreditPill className="hidden @5xl/app:inline-flex" />
            <span className="hidden @3xl/app:inline-flex">
              <NewPostMenu />
            </span>
            <span className="@3xl/app:hidden">
              <NewPostMenu compact />
            </span>
            <AccountMenu />
            <Button variant="ghost" size="icon-sm" aria-label="Open menu" className="@3xl/app:hidden" onClick={() => setMenuOpen(true)}>
              <Menu />
            </Button>
          </div>
        </div>
        <div className="flex min-h-11 items-center border-t border-border/70 px-4 @5xl/app:px-6">
          {subbar ?? (activeGroup ? <SubNav group={activeGroup} active={active} /> : (
            <TabRow items={accountItems.map((id) => ({ id, label: destinations[id].label }))} active={active} />
          ))}
        </div>
      </header>
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
