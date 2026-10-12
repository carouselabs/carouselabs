"use client"

// Shared platform badge for Content Hub: the platform's own logo
// (components/brand/PlatformLogo.tsx). Kept separate from lib/platforms.ts
// (plain data, server-safe) since this file is JSX and client-only.
import { PlatformLogo } from "@/components/brand/PlatformLogo"
import type { Platform } from "@/lib/platforms"

export function PlatformBadge({ platform, size = 20 }: { platform: Platform; size?: number }) {
  return <PlatformLogo platform={platform} size={size} />
}
