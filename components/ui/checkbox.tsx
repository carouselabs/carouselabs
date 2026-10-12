"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative inline-flex size-5 shrink-0 items-center justify-center rounded-detail border border-control-border bg-surface text-primary-foreground transition-colors duration-(--motion-fast) after:absolute after:-inset-3 after:content-[''] data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-danger",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex data-unchecked:hidden"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <Minus className="size-3.5" strokeWidth={3} />
            ) : (
              <Check className="size-3.5" strokeWidth={3} />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  )
}

/** Checkbox + clickable label text, the usual pairing. */
function CheckboxField({
  label,
  description,
  className,
  ...props
}: CheckboxPrimitive.Root.Props & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <Checkbox className="mt-0.5" {...props} />
      <span className="flex flex-col gap-0.5">
        <span className="text-label font-medium text-foreground">{label}</span>
        {description && <span className="text-caption text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

export { Checkbox, CheckboxField }
