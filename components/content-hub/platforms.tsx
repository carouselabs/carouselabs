"use client"

// Shared platform icon/badge for Content Hub. Kept separate from
// lib/platforms.ts (plain data, server-safe) since this file pulls in
// lucide-react + JSX and is client-only.
import { Camera } from "lucide-react"
import { PLATFORM_META, type Platform } from "@/lib/platforms"

// lucide-react dropped brand logos, so LinkedIn keeps the hand-inlined "in"
// mark used elsewhere (see components/generate/PostToLinkedInButton.tsx).
function LinkedInIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-white" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

// Every platform besides LinkedIn/Instagram has no real integration yet, so
// rather than guessing at an inaccurate brand mark, it gets a plain letter
// avatar in its brand color — a deliberate "this is a placeholder" look.
export function PlatformIcon({ platform, size = 12 }: { platform: Platform; size?: number }) {
  if (platform === "linkedin") return <LinkedInIcon size={size} />
  if (platform === "instagram") return <Camera size={size} className="text-white" strokeWidth={2.2} />
  return (
    <span className="text-white font-bold leading-none" style={{ fontSize: Math.round(size * 0.85) }}>
      {PLATFORM_META[platform].label[0]}
    </span>
  )
}

export function PlatformBadge({ platform, size = 20 }: { platform: Platform; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: PLATFORM_META[platform].color }}
    >
      <PlatformIcon platform={platform} size={Math.round(size * 0.55)} />
    </span>
  )
}
