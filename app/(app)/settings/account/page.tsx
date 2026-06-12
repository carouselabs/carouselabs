"use client"

import { useEffect, useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { Download, Loader2 } from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ProfileData } from "@/lib/profile/options"

export default function AccountSettingsPage() {
  const { signOut } = useClerk()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE")

  const [exporting, setExporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/profile")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load")
        if (!active) return
        const p: ProfileData = data.profile
        setEmail(p.email)
        setPlan(p.plan)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const res = await fetch("/api/account/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carouselabs-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/account/delete", { method: "POST" })
      if (!res.ok) throw new Error("Failed to delete account")
      // Sign the user out and return them to the landing page.
      await signOut({ redirectUrl: "/" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-[88px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] animate-pulse" />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Account info */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[rgba(255,255,255,0.85)]">Account</h2>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] divide-y divide-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="text-[13px] text-[rgba(255,255,255,0.45)]">Email</span>
                <span className="text-[13px] text-[rgba(255,255,255,0.85)] truncate">{email}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="text-[13px] text-[rgba(255,255,255,0.45)]">Plan</span>
                <span
                  className={[
                    "text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide",
                    plan === "PRO"
                      ? "text-[#A78BFA] bg-[rgba(124,58,237,0.14)] border border-[rgba(124,58,237,0.3)]"
                      : "text-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]",
                  ].join(" ")}
                >
                  {plan === "PRO" ? "Pro" : "Free"}
                </span>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[rgba(255,255,255,0.85)]">Your data</h2>
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-medium text-[rgba(255,255,255,0.8)]">Export my data</p>
                <p className="text-[12px] text-[rgba(255,255,255,0.38)]">
                  Download all your ideas and posts as JSON.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] text-[13px] font-medium text-[rgba(255,255,255,0.75)] transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
                {exporting ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[rgba(239,68,68,0.9)]">Danger zone</h2>
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.04)]">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-medium text-[rgba(255,255,255,0.8)]">Delete account</p>
                <p className="text-[12px] text-[rgba(255,255,255,0.38)]">
                  Deactivate your account. This can&apos;t be undone from here.
                </p>
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex-shrink-0 px-4 py-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.14)] text-[13px] font-semibold text-[rgba(239,68,68,0.9)] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent className="bg-[#0D0D1A] border-[rgba(255,255,255,0.08)] text-[#F0F0FA]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
              Delete your account?
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.55]">
              Your account will be deactivated and you&apos;ll be signed out. Your
              data is retained but you&apos;ll lose access. This can&apos;t be
              undone from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors disabled:opacity-60"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              {deleting ? "Deleting…" : "Delete account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
