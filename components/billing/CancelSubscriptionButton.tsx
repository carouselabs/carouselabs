"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function CancelSubscriptionButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/cancel-subscription", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Failed to cancel")
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="self-start px-4 py-2 rounded-control-sm border border-danger/35 bg-danger-soft hover:bg-[rgba(239,68,68,0.14)] text-label font-semibold text-danger transition-colors"
      >
        Cancel Subscription
      </button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="bg-surface-raised border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-body font-semibold text-foreground">
              Cancel your Pro subscription?
            </DialogTitle>
            <DialogDescription className="text-label text-muted-foreground leading-[1.55]">
              You&apos;ll keep Pro access and your remaining credits until the end of the current
              billing period. After that, your account moves to Free and unused monthly credits
              expire.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-caption text-danger">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-4 py-2 rounded-control text-label font-medium text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              Keep Pro
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-control text-label font-semibold text-white bg-danger hover:bg-danger/90 transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? "Cancelling…" : "Cancel subscription"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
