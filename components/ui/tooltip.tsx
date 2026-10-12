"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

/** Wrap a page section once so neighbouring tooltips open without delay. */
function TooltipProvider(props: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={400} {...props} />
}

/**
 * Supplementary text for a control that already has an accessible name.
 * Never put essential information only in a tooltip.
 */
function Tooltip({
  content,
  side = "top",
  children,
  className,
}: {
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  children: React.ReactElement
  className?: string
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8} className="z-(--z-tooltip)">
          <TooltipPrimitive.Popup
            className={cn(
              "max-w-64 rounded-control-sm bg-primary px-2.5 py-1.5 text-caption text-primary-foreground shadow-popover transition-opacity duration-(--motion-fast) data-ending-style:opacity-0 data-starting-style:opacity-0",
              className
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip, TooltipProvider }
