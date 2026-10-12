import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

// Focus styling comes from the global :focus-visible rule in app/globals.css.
// Compact sizes (xs, sm, icon-xs, icon-sm) keep a 44px hit area with an
// invisible ::after so dense admin screens stay touch-friendly.
const buttonStyles = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,opacity] duration-(--motion-fast) ease-standard disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[pending=true]:cursor-progress data-[pending=true]:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        brand: "bg-brand text-brand-foreground hover:bg-brand-hover",
        secondary:
          "bg-surface-muted text-foreground hover:bg-[color-mix(in_oklab,var(--surface-muted),var(--foreground)_7%)] aria-expanded:bg-[color-mix(in_oklab,var(--surface-muted),var(--foreground)_7%)]",
        outline:
          "border-control-border bg-surface text-foreground hover:bg-surface-muted aria-expanded:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted aria-expanded:bg-surface-muted",
        destructive:
          "bg-danger text-danger-foreground hover:bg-[color-mix(in_oklab,var(--danger),var(--foreground)_14%)]",
        link: "h-auto! rounded-detail px-0! text-brand underline decoration-1 underline-offset-4 hover:decoration-2",
      },
      size: {
        xs: "h-8 gap-1.5 px-2.5 text-caption after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-label after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
        default: "h-11 px-4 text-label",
        lg: "h-12 px-5 text-body",
        icon: "size-11",
        "icon-xs":
          "size-8 after:absolute after:-inset-1.5 after:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 after:absolute after:-inset-1 after:content-['']",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Classes for anything that should look like a button (e.g. a Link). Runs
 * through cn() so a variant's colors and borders replace the defaults instead
 * of fighting them — cva alone just concatenates.
 */
function buttonVariants({ className, ...variants }: VariantProps<typeof buttonStyles> & { className?: string } = {}) {
  return cn(buttonStyles(variants), className)
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonStyles> & {
    /** Shows a spinner, keeps the label's width and blocks repeat clicks. */
    pending?: boolean
    /** Announced to screen readers while pending. */
    pendingLabel?: string
  }

function Button({
  className,
  variant = "default",
  size = "default",
  pending = false,
  pendingLabel = "Working",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-pending={pending || undefined}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      focusableWhenDisabled={pending}
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    >
      {pending ? (
        <>
          <span className="invisible inline-flex items-center gap-[inherit]">{children}</span>
          <span className="absolute inset-0 grid place-items-center" aria-hidden>
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          </span>
          <span className="sr-only">{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
