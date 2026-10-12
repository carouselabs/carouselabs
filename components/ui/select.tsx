"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { controlClasses } from "@/components/ui/input"
import { useFormFieldControl } from "@/components/ui/form-field"

// A styled native <select>: full keyboard, screen-reader and mobile-picker
// support for free. Reach for a custom listbox only when options need rich
// content.
type SelectProps = React.ComponentProps<"select"> & {
  density?: "default" | "compact"
}

function Select({ className, density = "default", children, ...props }: SelectProps) {
  const fieldProps = useFormFieldControl(props)
  return (
    <div data-slot="select" className={cn("relative w-full", className)}>
      <select
        className={cn(
          controlClasses,
          "appearance-none pr-10 pl-3",
          density === "compact" ? "h-9 text-label" : "h-11"
        )}
        {...fieldProps}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { Select }
