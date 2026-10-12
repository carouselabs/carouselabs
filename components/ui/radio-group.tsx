"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  )
}

function Radio({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(
        "relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-control-border bg-surface transition-colors duration-(--motion-fast) after:absolute after:-inset-3 after:content-[''] data-checked:border-brand data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-brand data-unchecked:hidden" />
    </RadioPrimitive.Root>
  )
}

function RadioField({
  label,
  description,
  className,
  ...props
}: RadioPrimitive.Root.Props & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <Radio className="mt-0.5" {...props} />
      <span className="flex flex-col gap-0.5">
        <span className="text-label font-medium text-foreground">{label}</span>
        {description && <span className="text-caption text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

export { RadioGroup, Radio, RadioField }
