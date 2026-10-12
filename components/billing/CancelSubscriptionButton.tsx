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
        className="self-start px-4 py-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.14)] text-[13px] font-semibold text-[rgba(239,68,68,0.9)] transition-colors"
      >
        Cancel Subscription
      </button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E3DE] text-[#0A0A0A]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#0A0A0A]">
              Cancel your Pro subscription?
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#6B7280] leading-[1.55]">
              You&apos;ll keep Pro access and your remaining credits until the end of the current
              billing period. After that, your account moves to Free and unused monthly credits
              expire.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50"
            >
              Keep Pro
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors disabled:opacity-60"
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
