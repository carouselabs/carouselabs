"use client"

import * as React from "react"
import { Toast } from "@base-ui/react/toast"
import { CheckCircle2, AlertCircle, Info, XIcon } from "lucide-react"

type ToastTone = "neutral" | "success" | "danger"

const toneIcon: Record<ToastTone, React.ReactNode> = {
  neutral: <Info className="size-4 text-muted-foreground" aria-hidden />,
  success: <CheckCircle2 className="size-4 text-success" aria-hidden />,
  danger: <AlertCircle className="size-4 text-danger" aria-hidden />,
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => {
    const tone = (toast.type as ToastTone | undefined) ?? "neutral"
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        swipeDirection={["right", "down"]}
        className="pointer-events-auto flex w-full items-start gap-3 rounded-control border border-border bg-surface-raised p-4 text-label text-foreground shadow-popover transition-[opacity,transform] duration-(--motion-panel) ease-entry data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0"
      >
        <span className="mt-0.5">{toneIcon[tone]}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="font-semibold" />
          <Toast.Description className="text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label="Dismiss notification"
          className="-mt-1 -mr-1 inline-flex size-8 items-center justify-center rounded-control-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <XIcon className="size-4" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}

/** Mount once near the root of a migrated layout. */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider limit={3} timeout={5000}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed right-4 bottom-4 z-(--z-toast) flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

/**
 * Show a toast only when an inline confirmation would be missed. Errors that
 * belong to a field or task stay next to it.
 */
function useToast() {
  const manager = Toast.useToastManager()
  return React.useMemo(
    () => ({
      show: ({
        title,
        description,
        tone = "neutral",
      }: {
        title: string
        description?: string
        tone?: ToastTone
      }) =>
        manager.add({
          title,
          description,
          type: tone,
          priority: tone === "danger" ? "high" : "low",
        }),
      dismiss: manager.close,
    }),
    [manager]
  )
}

export { ToastProvider, useToast }
