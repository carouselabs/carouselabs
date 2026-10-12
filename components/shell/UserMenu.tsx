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
      <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-[10px] hover:bg-[#F4F2EC] rounded-lg transition-colors outline-none">
        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-white">{initials}</span>
        </div>
        <span className="flex-1 text-left text-xs text-[#4B5563] truncate min-w-0 font-medium">
          {displayName}
        </span>
        <PlanBadge plan={user.plan} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={4}
        className="w-52 bg-white border border-[#E5E3DE] rounded-xl shadow-[0_12px_40px_rgba(10,10,10,0.12)] p-1"
      >
        <DropdownMenuItem
          onClick={() => router.push("/settings/profile")}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#374151] hover:bg-[#F4F2EC] hover:text-[#0A0A0A] cursor-pointer rounded-lg outline-none"
        >
          <User size={14} className="text-[#9CA3AF] flex-shrink-0" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/settings/billing")}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#374151] hover:bg-[#F4F2EC] hover:text-[#0A0A0A] cursor-pointer rounded-lg outline-none"
        >
          <CreditCard size={14} className="text-[#9CA3AF] flex-shrink-0" />
          Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#E5E3DE] my-1" />
        <DropdownMenuItem
          onClick={() => signOut(() => router.push("/sign-in"))}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#6B7280] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] cursor-pointer rounded-lg outline-none"
        >
          <LogOut size={14} className="text-[#9CA3AF] flex-shrink-0" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
