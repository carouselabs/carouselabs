"use client"

import { usePathname } from "next/navigation"
import { Stickers } from "@/components/shared/Stickers"

function variantFor(path: string): string {
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
  return <Stickers variant={variantFor(pathname)} />
}
