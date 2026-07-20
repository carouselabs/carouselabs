"use client"

import { usePathname } from "next/navigation"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useIdeaSessionStore } from "@/lib/store/ideaSessionStore"
import { useCreditStore } from "@/lib/store/creditStore"

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
  // Live balance — updated by generation clients after each charge, so the
  // count refreshes without a page reload. Falls back to the initial fetch.
  const liveCredits = useCreditStore((s) => s.creditsRemaining)
  const reset = useIdeaSessionStore((s) => s.reset)
  const title = getTitle(pathname)
  const isDashboard = pathname === "/dashboard"

  return (
    <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-6 bg-[#F9F7F2]/80 backdrop-blur-md border-b border-[#E5E3DE]">
      <span className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.2px]">{title}</span>

      <div className="flex items-center gap-4">
        {user &&
          (() => {
            const left = liveCredits ?? user.creditsRemaining ?? 0
            const limit = user.freeLimit ?? 1
            return (
              <span className="text-[11px] text-[#9CA3AF] tabular-nums">
                {user.plan === "PRO" ? (
                  <>{left} credits left</>
                ) : (
                  <span className={left === 0 ? "text-[#D97706]" : undefined}>
                    {left} / {limit} free post{limit === 1 ? "" : "s"} left
                  </span>
                )}
              </span>
            )
          })()}
        {isDashboard && (
          <button
            onClick={reset}
            className="text-[12px] font-medium text-[#6B7280] border border-[#E5E3DE] px-3 py-[5px] rounded-lg hover:border-[#D1D5DB] hover:text-[#0A0A0A] hover:bg-[#F4F2EC] transition-colors"
          >
            New session
          </button>
        )}
      </div>
    </header>
  )
}
