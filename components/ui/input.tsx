"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { useFormFieldControl } from "@/components/ui/form-field"

// Shared look for text-like controls. 16px text on phones prevents iOS zoom.
const controlClasses =
  "w-full min-w-0 rounded-control border border-control-border bg-surface text-body text-foreground transition-[border-color,background-color] duration-(--motion-fast) ease-standard placeholder:text-muted-foreground hover:border-[color-mix(in_oklab,var(--control-border),var(--foreground)_25%)] focus-visible:border-brand disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:bg-danger-soft/40"

type InputProps = React.ComponentProps<"input"> & {
  density?: "default" | "compact"
}

function Input({ className, type, density = "default", ...props }: InputProps) {
  const fieldProps = useFormFieldControl(props)
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        controlClasses,
        "px-3 file:mr-3 file:border-0 file:bg-transparent file:text-label file:font-medium file:text-foreground",
        density === "compact" ? "h-9 text-label md:text-label" : "h-11",
        className
      )}
      {...fieldProps}
    />
  )
}

export { Input, controlClasses }
