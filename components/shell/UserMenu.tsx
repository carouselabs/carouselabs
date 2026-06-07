"use client"

import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, CreditCard, LogOut } from "lucide-react"
import type { CurrentUser } from "@/lib/hooks/useCurrentUser"
import { PlanBadge } from "./PlanBadge"

interface UserMenuProps {
  user: CurrentUser
}

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

export function UserMenu({ user }: UserMenuProps) {
  const { signOut } = useClerk()
  const router = useRouter()
  const initials = getInitials(user.name, user.email)
  const displayName = user.name ?? user.email.split("@")[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-[10px] hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors outline-none">
        <div className="w-8 h-8 rounded-full bg-[rgba(124,58,237,0.2)] flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-[#A78BFA]">{initials}</span>
        </div>
        <span className="flex-1 text-left text-xs text-[rgba(255,255,255,0.55)] truncate min-w-0 font-medium">
          {displayName}
        </span>
        <PlanBadge plan={user.plan} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={4}
        className="w-52 bg-[#0D0D1A] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl p-1"
      >
        <DropdownMenuItem
          onClick={() => router.push("/settings/profile")}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F0F0FA] cursor-pointer rounded-lg outline-none"
        >
          <User size={14} className="text-[rgba(255,255,255,0.35)] flex-shrink-0" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/settings/billing")}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F0F0FA] cursor-pointer rounded-lg outline-none"
        >
          <CreditCard size={14} className="text-[rgba(255,255,255,0.35)] flex-shrink-0" />
          Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)] my-1" />
        <DropdownMenuItem
          onClick={() => signOut(() => router.push("/sign-in"))}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[rgba(255,255,255,0.45)] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] cursor-pointer rounded-lg outline-none"
        >
          <LogOut size={14} className="text-[rgba(255,255,255,0.3)] flex-shrink-0" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
