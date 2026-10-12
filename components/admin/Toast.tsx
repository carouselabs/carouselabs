"use client"

// Minimal toast system for the admin panel (the app has no toast lib).
// Wrap pages in <ToastProvider>; call useToast().toast("Saved", "success").
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { CheckCircle2, XCircle, Info } from "lucide-react"

type ToastType = "success" | "error" | "info"
type ToastItem = { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void }>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />,
  error: <XCircle className="h-4 w-4 shrink-0 text-danger" />,
  info: <Info className="h-4 w-4 shrink-0 text-brand" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-(--z-toast) flex max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-control border border-border bg-surface-raised px-4 py-3 text-label text-foreground shadow-popover"
            style={{ animation: "adminToastIn 150ms ease-out" }}
          >
            {ICONS[t.type]}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes adminToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastContext.Provider>
  )
}
