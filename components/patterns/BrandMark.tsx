"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * PROPOSAL, pending owner approval — not used on live pages. Two offset
 * editorial sheets; the front one forms an open "C". One color
 * (currentColor), legible from 16px. Not trademark-cleared.
 */
function BrandMark({ className, title }: { className?: string; title?: string }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-8 shrink-0", className)}
    >
      <defs>
        {/* Gap that separates the back sheet from the front one */}
        <mask id={`${id}-back`} maskUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#fff" />
          <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" fill="#000" />
        </mask>
        {/* The C's opening, cut from the front sheet */}
        <mask id={`${id}-front`} maskUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#fff" />
          <rect x="22" y="18.5" width="20" height="11" rx="5.5" fill="#000" />
        </mask>
      </defs>
      <rect x="2" y="2" width="27" height="27" rx="8" fill="currentColor" mask={`url(#${id}-back)`} />
      <rect x="12" y="12" width="26" height="26" rx="7.5" fill="currentColor" mask={`url(#${id}-front)`} />
    </svg>
  )
}

function BrandLockup({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-lead font-semibold tracking-[-0.02em]", className)}>
      <BrandMark className={cn("size-7", markClassName)} />
      CarouseLabs
    </span>
  )
}

export { BrandMark, BrandLockup }
