"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { controlClasses } from "@/components/ui/input"
import { useFormFieldControl } from "@/components/ui/form-field"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const fieldProps = useFormFieldControl(props)
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClasses, "flex field-sizing-content min-h-28 px-3 py-2.5", className)}
      {...fieldProps}
    />
  )
}

export { Textarea }
