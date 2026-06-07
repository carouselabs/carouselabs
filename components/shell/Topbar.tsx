"use client"

import { usePathname } from "next/navigation"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Generate",
  "/history": "History",
  "/pinned": "Pinned",
  "/settings": "Settings",
}

function getTitle(pathname: string): string {
  if (pathname.startsWith("/settings")) return "Settings"
  return PAGE_TITLES[pathname] ?? ""
}

export function Topbar() {
  const pathname = usePathname()
  const { user } = useCurrentUser()
  const title = getTitle(pathname)
  const isDashboard = pathname === "/dashboard"

  return (
    <header className="h-[52px] flex-shrink-0 flex items-center justify-between px-6 bg-[#080810] border-b border-[rgba(255,255,255,0.05)]">
      <span className="text-[14px] font-semibold text-[rgba(255,255,255,0.65)] tracking-[-0.2px]">
        {title}
      </span>

      <div className="flex items-center gap-4">
        {user && (
          <span className="text-[11px] text-[rgba(255,255,255,0.22)] tabular-nums">
            {user.plan === "PRO" ? (
              <>{user.postsToday} posts today</>
            ) : (
              <span className="text-amber-400/60">{user.postsToday} / 5 free posts used</span>
            )}
          </span>
        )}
        {isDashboard && (
          <button className="text-[12px] font-medium text-[rgba(255,255,255,0.45)] border border-[rgba(255,255,255,0.08)] px-3 py-[5px] rounded-lg hover:border-[rgba(255,255,255,0.14)] hover:text-[rgba(255,255,255,0.65)] transition-colors">
            New session
          </button>
        )}
      </div>
    </header>
  )
}
