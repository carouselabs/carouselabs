"use client"

import { usePathname } from "next/navigation"
import { Stickers } from "@/components/shared/Stickers"

function variantFor(path: string): string | null {
  // Billing has real financial content (plans, prices) — floating stickers
  // read as noise there, so it opts out entirely.
  if (path.startsWith("/settings/billing")) return null
  if (path.startsWith("/generate/image")) return "image"
  if (path.startsWith("/generate/carousel")) return "carousel"
  if (path.startsWith("/generate/caption")) return "caption"
  if (path.startsWith("/settings")) return "settings"
  if (path.startsWith("/history")) return "history"
  if (path.startsWith("/pinned")) return "pinned"
  if (path.startsWith("/idea") || path.startsWith("/my-idea")) return "idea"
  if (path.startsWith("/dashboard")) return "idea"
  return "generic"
}

export function AppStickers() {
  const pathname = usePathname()
  const variant = variantFor(pathname)
  if (!variant) return null
  return <Stickers variant={variant} />
}
