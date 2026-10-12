"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type FormFieldContextValue = {
  id: string
  hintId?: string
  errorId?: string
  invalid: boolean
  required: boolean
  disabled: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

/**
 * Props a control spreads to join the surrounding FormField: id for the
 * label, aria-describedby for hint + error, aria-invalid and required.
 * Explicit props on the control always win.
 */
function useFormFieldControl<P extends Record<string, unknown>>(props: P) {
  const field = React.useContext(FormFieldContext)
  if (!field) return props
  const describedBy = [props["aria-describedby"], field.hintId, field.errorId]
    .filter(Boolean)
    .join(" ")
  return {
    ...props,
    id: (props.id as string | undefined) ?? field.id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": (props["aria-invalid"] as boolean | undefined) ?? (field.invalid || undefined),
    required: (props.required as boolean | undefined) ?? (field.required || undefined),
    disabled: (props.disabled as boolean | undefined) ?? (field.disabled || undefined),
  }
}

type FormFieldProps = {
  label: React.ReactNode
  hint?: React.ReactNode
  /** A message here marks the field invalid and is announced politely. */
  error?: React.ReactNode
  required?: boolean
  disabled?: boolean
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean
  id?: string
  className?: string
  children: React.ReactNode
}

function FormField({
  label,
  hint,
  error,
  required = false,
  disabled = false,
  hideLabel = false,
  id: idProp,
  className,
  children,
}: FormFieldProps) {
  const generated = React.useId()
  const id = idProp ?? `field-${generated}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <FormFieldContext.Provider
      value={{ id, hintId, errorId, invalid: Boolean(error), required, disabled }}
    >
      <div
        data-slot="form-field"
        data-invalid={error ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn("flex flex-col gap-1.5", className)}
      >
        <label
          htmlFor={id}
          className={cn(
            "text-label font-medium text-foreground",
            disabled && "opacity-60",
            hideLabel && "sr-only"
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-muted-foreground" aria-hidden>
              *
            </span>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-caption text-muted-foreground">
            {hint}
          </p>
        )}
        <div aria-live="polite">
          {error && (
            <p id={errorId} className="text-caption font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </FormFieldContext.Provider>
  )
}

export { FormField, useFormFieldControl }
