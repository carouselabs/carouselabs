"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Lock } from "lucide-react"

import { cn } from "@/lib/utils"

// Large selectable cards for onboarding answers, format, tone and ratio
// pickers. Single choice = radio semantics (arrow keys move between cards);
// multiple choice = checkbox semantics.

const cardClasses =
  "group/option relative flex w-full flex-col items-start gap-2 rounded-card border border-border bg-surface p-4 text-left transition-[border-color,background-color,box-shadow] duration-(--motion-fast) ease-standard hover:border-control-border data-checked:border-brand data-checked:bg-brand-soft/50 data-checked:shadow-[inset_0_0_0_1px_var(--brand)] data-disabled:cursor-not-allowed data-disabled:opacity-60 sm:p-5"

const check = (
  <span
    aria-hidden
    className="grid size-5 shrink-0 place-items-center rounded-full border border-control-border bg-surface text-brand-foreground group-data-checked/option:border-brand group-data-checked/option:bg-brand"
  >
    <Check className="hidden size-3 group-data-checked/option:block" strokeWidth={3} />
  </span>
)

function OptionBody({
  icon,
  title,
  description,
  extra,
  meta,
  locked,
  lockLabel,
  layout = "stack",
}: OptionContent) {
  if (layout === "row") {
    // Compact: icon, text, check on one line (long lists like onboarding roles).
    return (
      <span className="flex w-full items-center gap-3">
        {icon && <span className="grid size-8 shrink-0 place-items-center text-foreground [&_svg]:size-4">{icon}</span>}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-foreground">{title}</span>
          {description && <span className="text-label text-muted-foreground">{description}</span>}
          {extra}
        </span>
        {check}
      </span>
    )
  }
  return (
    <>
      <span className="flex w-full items-start justify-between gap-3">
        {icon ? (
          <span className="grid size-9 place-items-center rounded-control-sm bg-surface-muted text-foreground group-data-checked/option:bg-surface-raised [&_svg]:size-4">
            {icon}
          </span>
        ) : (
          <span />
        )}
        {check}
      </span>
      <span className="text-body font-semibold text-foreground">{title}</span>
      {description && <span className="text-label text-muted-foreground">{description}</span>}
      {extra}
      {(meta || locked) && (
        <span className="mt-1 flex flex-wrap items-center gap-2 text-caption font-medium text-muted-foreground">
          {meta}
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-foreground">
              <Lock className="size-3" aria-hidden />
              {lockLabel}
            </span>
          )}
        </span>
      )}
    </>
  )
}

type OptionContent = {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Extra content under the description (e.g. a sample line). */
  extra?: React.ReactNode
  /** e.g. the credit cost. */
  meta?: React.ReactNode
  /** Plan-locked: still focusable and selectable so the caller can explain the upgrade. */
  locked?: boolean
  lockLabel?: string
  /** "row" puts icon, text and check on one line. */
  layout?: "stack" | "row"
}

function OptionCardGroup({
  className,
  columns = 3,
  ...props
}: RadioGroupPrimitive.Props & { columns?: 1 | 2 | 3 | 4 }) {
  return (
    <RadioGroupPrimitive
      className={cn(
        "grid gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
      {...props}
    />
  )
}

function OptionCard({
  value,
  disabled,
  className,
  lockLabel = "Pro",
  ...content
}: OptionContent & { value: string; disabled?: boolean; className?: string }) {
  return (
    <RadioPrimitive.Root value={value} disabled={disabled} className={cn(cardClasses, className)}>
      <OptionBody lockLabel={lockLabel} {...content} />
    </RadioPrimitive.Root>
  )
}

function OptionCardCheckbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  lockLabel = "Pro",
  ...content
}: OptionContent & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      disabled={disabled}
      className={cn(cardClasses, className)}
    >
      <OptionBody lockLabel={lockLabel} {...content} />
    </CheckboxPrimitive.Root>
  )
}

export { OptionCardGroup, OptionCard, OptionCardCheckbox }
