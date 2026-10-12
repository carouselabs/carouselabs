"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-control-border p-0.5 transition-colors duration-(--motion-normal) ease-standard after:absolute after:-inset-2.5 after:content-[''] data-checked:bg-brand data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-5 rounded-full bg-surface-raised shadow-card transition-transform duration-(--motion-normal) ease-standard data-checked:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}

/** Label on the left, switch on the right — the settings-row pattern. */
function SwitchField({
  label,
  description,
  className,
  ...props
}: SwitchPrimitive.Root.Props & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-6 py-1", className)}>
      <span className="flex flex-col gap-0.5">
        <span className="text-label font-medium text-foreground">{label}</span>
        {description && <span className="text-caption text-muted-foreground">{description}</span>}
      </span>
      <Switch {...props} />
    </label>
  )
}

export { Switch, SwitchField }
