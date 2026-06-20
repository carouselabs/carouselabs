"use client"

import { useEffect, useState } from "react"
import { Download, Loader2, Linkedin } from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import type { ProfileData } from "@/lib/profile/options"

interface LinkedInStatus {
  connected: boolean
  name: string | null
  expired: boolean
}

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE")

  const [exporting, setExporting] = useState(false)

  // LinkedIn connection
  const [linkedin, setLinkedin] = useState<LinkedInStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [linkedinBanner, setLinkedinBanner] = useState<string | null>(null)

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

  // Load LinkedIn status + surface the ?linkedin= result from the OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("linkedin")
    if (result === "connected") setLinkedinBanner("LinkedIn connected successfully.")
    else if (result === "error")
      setLinkedinBanner("Couldn't connect LinkedIn. Please try again.")
    if (result) {
      // Clean the query param so a refresh doesn't re-show the banner.
      window.history.replaceState({}, "", window.location.pathname)
    }
    void refreshLinkedIn()
  }, [])

  async function refreshLinkedIn() {
    try {
      const res = await fetch("/api/linkedin/status")
      if (!res.ok) return
      setLinkedin((await res.json()) as LinkedInStatus)
    } catch {
      // best-effort — leave status null
    }
  }

  async function handleDisconnectLinkedIn() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/linkedin/disconnect", { method: "POST" })
      if (!res.ok) throw new Error("Disconnect failed")
      setLinkedin({ connected: false, name: null, expired: false })
      setLinkedinBanner(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect LinkedIn")
    } finally {
      setDisconnecting(false)
    }
  }

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

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-[88px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse" />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Account info */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Account</h2>
            <div className="rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] divide-y divide-[#E9E7E1]">
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="text-[13px] text-[#6B7280]">Email</span>
                <span className="text-[13px] text-[#0A0A0A] truncate">{email}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="text-[13px] text-[#6B7280]">Plan</span>
                <span
                  className={[
                    "text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide",
                    plan === "PRO"
                      ? "text-[#1A1A1A] bg-[rgba(26,26,26,0.14)] border border-[rgba(26,26,26,0.3)]"
                      : "text-[#4B5563] bg-[#ECEAE4] border border-[#E5E3DE]",
                  ].join(" ")}
                >
                  {plan === "PRO" ? "Pro" : "Free"}
                </span>
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[#0A0A0A]">LinkedIn</h2>

            {linkedinBanner && (
              <div className="px-4 py-3 rounded-xl bg-[rgba(10,102,194,0.08)] border border-[rgba(10,102,194,0.2)] text-[13px] text-[#0A66C2]">
                {linkedinBanner}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]">
              <div className="flex items-center gap-3">
                <Linkedin size={20} className="text-[#0A66C2] flex-shrink-0" strokeWidth={2} />
                <div className="flex flex-col gap-0.5">
                  {linkedin?.connected ? (
                    <>
                      <p className="text-[13px] font-medium text-[#1A1A1A]">
                        Connected as {linkedin.name ?? "LinkedIn user"}
                      </p>
                      <p className="text-[12px] text-[#9CA3AF]">
                        {linkedin.expired
                          ? "Connection expired — reconnect to keep posting."
                          : "Post your generated images straight to LinkedIn."}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-[#1A1A1A]">
                        Connect your LinkedIn account
                      </p>
                      <p className="text-[12px] text-[#9CA3AF]">
                        Post generated images and carousels straight to LinkedIn.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {linkedin?.connected ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {linkedin.expired && (
                    <a
                      href="/api/linkedin/connect"
                      className="inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors"
                    >
                      Reconnect
                    </a>
                  )}
                  <button
                    onClick={handleDisconnectLinkedIn}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E3DE] bg-[#F1EFE9] hover:bg-[#E9E7E1] text-[13px] font-medium text-[#374151] transition-colors disabled:opacity-50"
                  >
                    {disconnecting && <Loader2 size={14} className="animate-spin" />}
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <a
                  href="/api/linkedin/connect"
                  className="inline-flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors"
                >
                  <Linkedin size={14} strokeWidth={2} />
                  Connect LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Data */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Your data</h2>
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-medium text-[#1A1A1A]">Export my data</p>
                <p className="text-[12px] text-[#9CA3AF]">
                  Download all your ideas and posts as JSON.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-lg border border-[#E5E3DE] bg-[#F1EFE9] hover:bg-[#E9E7E1] text-[13px] font-medium text-[#374151] transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
                {exporting ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
