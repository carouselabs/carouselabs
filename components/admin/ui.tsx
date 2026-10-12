"use client"

// Shared admin-panel primitives. They keep the exports every admin page
// already uses, but now render the design system's parts (Button, Dialog,
// ConfirmDialog, the control styles, the tokens) under the admin's dark theme.
import { forwardRef, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export function AdminCard({
  title,
  children,
  className = "",
  actions,
}: {
  title?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <section className={cn("rounded-card border border-border bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <h2 className="text-label font-semibold text-foreground">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span aria-hidden className="text-muted-foreground/80 [&_svg]:size-4">
            {icon}
          </span>
        )}
      </div>
      <div className="text-title-sm leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">{value}</div>
      {hint && <div className="text-caption text-muted-foreground/80">{hint}</div>}
    </div>
  )
}

const ADMIN_BUTTON: Record<"primary" | "secondary" | "danger" | "ghost", { variant: "brand" | "outline" | "ghost"; className?: string }> = {
  primary: { variant: "brand" },
  secondary: { variant: "outline", className: "border-border bg-surface-muted hover:bg-surface-raised" },
  danger: { variant: "outline", className: "border-danger/35 bg-danger-soft text-danger hover:bg-danger-soft/70 hover:text-danger" },
  ghost: { variant: "ghost", className: "text-muted-foreground hover:text-foreground" },
}

export function AdminButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "danger" | "ghost"
  disabled?: boolean
  loading?: boolean
  type?: "button" | "submit"
  className?: string
}) {
  const style = ADMIN_BUTTON[variant]
  return (
    <Button
      type={type}
      size="sm"
      variant={style.variant}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("[&_svg:not([class*='size-'])]:size-3.5", style.className, className)}
    >
      {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
      {children}
    </Button>
  )
}

const adminControl = cn(controlClasses, "h-9 text-label md:text-label")

export const AdminInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function AdminInput(props, ref) {
    const { className = "", ...rest } = props
    return <input ref={ref} {...rest} className={cn(adminControl, "px-3", className)} />
  },
)

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props
  return (
    <select {...rest} className={cn(adminControl, "w-auto px-2.5", className)}>
      {children}
    </select>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  // For forms with a label column and controls side by side.
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={wide ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-body-lg">{title}</DialogTitle>
        </DialogHeader>
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  )
}

// Confirmation dialog for destructive actions.
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel?: string
  loading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      description={body}
      confirmLabel={confirmLabel}
      tone="danger"
      pending={loading}
      onConfirm={onConfirm}
    />
  )
}

export function PlanBadge({ plan }: { plan: string }) {
  if (plan === "GROWTH") {
    return (
      <span className="inline-flex rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
        GROWTH
      </span>
    )
  }
  return plan === "PRO" ? (
    <span className="inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">PRO</span>
  ) : (
    <span className="inline-flex rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      FREE
    </span>
  )
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-label text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
      {label}
    </div>
  )
}

// Shared table class strings so every admin table looks identical.
export { tableCls } from "./tableStyles"

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
