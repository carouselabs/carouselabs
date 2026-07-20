"use client"

// Shared admin-panel primitives, hardcoded to the dark admin palette
// (bg #0F0F0F, cards #1A1A1A, borders #2A2A2A, accent #7C3AED) so they don't
// depend on the cream app theme's CSS variables.
import { useEffect, type ReactNode } from "react"
import { Loader2, X } from "lucide-react"

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
    <div className={`rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-white">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
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
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#8A8A8A]">{label}</span>
        {icon && <span className="text-[#7C3AED]">{icon}</span>}
      </div>
      <div className="mt-2 text-[26px] font-bold leading-none text-white tabular-nums">{value}</div>
      {hint && <div className="mt-2 text-[11px] text-[#6A6A6A]">{hint}</div>}
    </div>
  )
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
  const styles = {
    primary: "bg-[#7C3AED] text-white hover:bg-[#6D28D9] border border-transparent",
    secondary: "bg-[#232323] text-white hover:bg-[#2E2E2E] border border-[#2A2A2A]",
    danger: "bg-[#3A1520] text-red-400 hover:bg-[#4A1A28] border border-[#5A2030]",
    ghost: "bg-transparent text-[#B0B0B0] hover:text-white hover:bg-[#232323] border border-transparent",
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props
  return (
    <input
      {...rest}
      className={`h-9 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED] transition-colors ${className}`}
    />
  )
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props
  return (
    <select
      {...rest}
      className={`h-9 rounded-lg border border-[#2A2A2A] bg-[#141414] px-2.5 text-[13px] text-white outline-none focus:border-[#7C3AED] transition-colors ${className}`}
    >
      {children}
    </select>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#8A8A8A] hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
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
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] leading-relaxed text-[#B0B0B0]">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <AdminButton variant="secondary" onClick={onClose}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </AdminButton>
      </div>
    </Modal>
  )
}

export function PlanBadge({ plan }: { plan: string }) {
  return plan === "PRO" ? (
    <span className="inline-flex rounded-full bg-[#7C3AED]/15 px-2 py-0.5 text-[11px] font-semibold text-[#A78BFA]">
      PRO
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[11px] font-medium text-[#8A8A8A]">
      FREE
    </span>
  )
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#8A8A8A]">
      <Loader2 className="h-4 w-4 animate-spin text-[#7C3AED]" />
      {label}
    </div>
  )
}

// Shared table class strings so every admin table looks identical.
export const tableCls = {
  wrap: "overflow-x-auto rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]",
  table: "w-full text-left text-[12.5px]",
  th: "whitespace-nowrap border-b border-[#2A2A2A] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]",
  td: "whitespace-nowrap border-b border-[#232323] px-4 py-3 text-[#D0D0D0]",
  row: "hover:bg-[#1F1F1F] transition-colors",
}

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
