"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** "danger" for destructive or irreversible actions. */
  tone?: "default" | "danger"
  /** Keeps the dialog open with a spinner while the action runs. */
  pending?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}

/**
 * An alert dialog (role="alertdialog") for decisions the user must answer.
 * The cancel action receives focus first so Enter never confirms by accident.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  pending = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-(--z-dialog) bg-overlay duration-(--motion-panel) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-(--z-dialog) grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-card border border-border bg-surface-raised p-6 text-label text-foreground shadow-dialog duration-(--motion-panel) ease-entry outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0"
          )}
        >
          <div className="flex flex-col gap-2">
            <AlertDialogPrimitive.Title className="text-lead font-semibold tracking-[-0.01em]">
              {title}
            </AlertDialogPrimitive.Title>
            {description && (
              <AlertDialogPrimitive.Description className="text-label text-muted-foreground">
                {description}
              </AlertDialogPrimitive.Description>
            )}
          </div>
          {children}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close
              disabled={pending}
              render={<Button variant="outline" autoFocus />}
            >
              {cancelLabel}
            </AlertDialogPrimitive.Close>
            <Button
              variant={tone === "danger" ? "destructive" : "default"}
              pending={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}

export { ConfirmDialog }
