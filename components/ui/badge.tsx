import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 text-caption font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-foreground",
        default: "bg-surface-muted text-foreground",
        secondary: "bg-surface-muted text-foreground",
        solid: "bg-primary text-primary-foreground",
        brand: "bg-brand-soft text-brand",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        destructive: "bg-danger-soft text-danger",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

type Status = "neutral" | "brand" | "success" | "warning" | "danger"

const dotColor: Record<Status, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

/** A badge with a dot. The label always carries the meaning, never color alone. */
function StatusBadge({
  status = "neutral",
  className,
  children,
}: {
  status?: Status
  className?: string
  children: React.ReactNode
}) {
  return (
    <Badge variant={status} className={className}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dotColor[status])} />
      {children}
    </Badge>
  )
}

export { Badge, StatusBadge, badgeVariants }
