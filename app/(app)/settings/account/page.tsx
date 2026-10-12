"use client"

import { useEffect, useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { Download, Loader2, ShieldCheck } from "lucide-react"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { SettingsSection } from "@/components/settings/SettingsSection"
import type { ProfileData } from "@/lib/profile/options"

// Small self-contained toggle switch, same visual language as
// components/admin/SettingsForm.tsx's Toggle (that one's admin-dark-themed;
// this is the cream-app-theme equivalent).
function NotificationToggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3.5 cursor-pointer">
      <div className="flex flex-col gap-0.5">
        <span className="text-label font-medium text-foreground">{label}</span>
        <span className="text-caption text-muted-foreground">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-brand" : "bg-[#D1D5DB]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-raised shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  )
}

// lucide-react dropped brand logos, so inline the LinkedIn "in" mark.
function LinkedInIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

interface LinkedInStatus {
  connected: boolean
  name: string | null
  expired: boolean
}

export default function AccountSettingsPage() {
  const clerk = useClerk()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState<"FREE" | "PRO" | "GROWTH">("FREE")

  const [exporting, setExporting] = useState(false)

  // LinkedIn connection
  const [linkedin, setLinkedin] = useState<LinkedInStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [linkedinBanner, setLinkedinBanner] = useState<string | null>(null)

  // Notification preferences
  const [notifyPostPublished, setNotifyPostPublished] = useState(true)
  const [notifyPostFailed, setNotifyPostFailed] = useState(true)
  const [notifyWeeklySummary, setNotifyWeeklySummary] = useState(true)
  const [savingNotif, setSavingNotif] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // Fetched together so `loading` doesn't clear (and the LinkedIn card
        // render) until BOTH resolve — otherwise linkedin stays null for a
        // moment after the skeleton disappears and the card flashes
        // "disconnected" before flipping to "Connected as…".
        const [profileRes, linkedinRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/linkedin/status"),
        ])
        const data = await profileRes.json()
        if (!profileRes.ok) throw new Error((data as { error?: string }).error ?? "Failed to load")
        if (!active) return
        const p: ProfileData = data.profile
        setEmail(p.email)
        setPlan(p.plan)
        setNotifyPostPublished(p.notifyPostPublished)
        setNotifyPostFailed(p.notifyPostFailed)
        setNotifyWeeklySummary(p.notifyWeeklySummary)
        if (linkedinRes.ok) setLinkedin((await linkedinRes.json()) as LinkedInStatus)
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

  async function refreshLinkedIn() {
    try {
      const res = await fetch("/api/linkedin/status")
      if (!res.ok) return
      setLinkedin((await res.json()) as LinkedInStatus)
    } catch {
      // best-effort — leave status null
    }
  }

  // Surface the ?linkedin= result from the OAuth redirect (status itself is
  // fetched above, alongside the profile). The banner's setState calls are
  // placed after the refetch's `await` rather than synchronously at the top
  // of the effect, so they run as a microtask continuation instead of
  // synchronously within the effect body.
  useEffect(() => {
    void (async () => {
      // Re-fetch (the initial status came in already, above, alongside the
      // profile) in case this mount is a fresh OAuth-redirect landing.
      await refreshLinkedIn()

      const params = new URLSearchParams(window.location.search)
      const result = params.get("linkedin")
      if (result === "connected") setLinkedinBanner("LinkedIn connected successfully.")
      else if (result === "error") setLinkedinBanner("Couldn't connect LinkedIn. Please try again.")
      if (result) {
        // Clean the query param so a refresh doesn't re-show the banner.
        window.history.replaceState({}, "", window.location.pathname)
      }
    })()
  }, [])

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

  async function handleToggleNotification(
    key: "postPublished" | "postFailed" | "weeklySummary",
    next: boolean,
  ) {
    const setters = {
      postPublished: setNotifyPostPublished,
      postFailed: setNotifyPostFailed,
      weeklySummary: setNotifyWeeklySummary,
    }
    const setter = setters[key]
    setter(next)
    setSavingNotif(key)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: { [key]: next } }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setter(!next) // revert on failure
    } finally {
      setSavingNotif(null)
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <SettingsHeader />

      {error && (
        <div className="px-4 py-3 rounded-control bg-danger-soft border border-danger/25 text-label text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-[88px] rounded-control bg-surface border border-border animate-pulse" />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Account info */}
          <SettingsSection title="Account">
<div className="rounded-control border border-border bg-surface divide-y divide-border">
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="text-label text-muted-foreground">Email</span>
                <span className="text-label text-foreground truncate">{email}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="text-label text-muted-foreground">Plan</span>
                <span
                  className={[
                    "text-caption font-semibold px-2.5 py-1 rounded-full tracking-wide",
                    plan === "GROWTH"
                      ? "text-white bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
                      : plan === "PRO"
                        ? "text-foreground bg-surface-muted border border-control-border"
                        : "text-muted-foreground bg-surface-muted border border-border",
                  ].join(" ")}
                >
                  {plan === "GROWTH" ? "Growth" : plan === "PRO" ? "Pro" : "Free"}
                </span>
              </div>
            </div>
          </SettingsSection>

          {/* Security — password + two-factor auth are managed entirely by
              Clerk (openUserProfile opens its own modal with Security tab
              built in); nothing to build here beyond the entry point. If 2FA
              isn't offered, it needs enabling in the Clerk Dashboard under
              User & Authentication > Multi-factor — that's a config change,
              not code. */}
          <SettingsSection title="Security">
<div className="flex items-center justify-between gap-4 p-4 rounded-control border border-border bg-surface">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-brand flex-shrink-0" strokeWidth={1.8} />
                <div className="flex flex-col gap-0.5">
                  <p className="text-label font-medium text-foreground">Password &amp; two-factor authentication</p>
                  <p className="text-caption text-muted-foreground">Manage your password, 2FA, and active sessions.</p>
                </div>
              </div>
              <button
                onClick={() => clerk.openUserProfile()}
                className="inline-flex items-center flex-shrink-0 px-4 py-2 rounded-control-sm border border-border bg-surface-raised hover:bg-surface-muted text-label font-medium text-foreground transition-colors"
              >
                Manage
              </button>
            </div>
          </SettingsSection>

          {/* LinkedIn */}
          <SettingsSection title="LinkedIn">

{linkedinBanner && (
              <div className="px-4 py-3 rounded-control bg-[rgba(10,102,194,0.08)] border border-[rgba(10,102,194,0.2)] text-label text-[#0A66C2]">
                {linkedinBanner}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 p-4 rounded-control border border-border bg-surface">
              <div className="flex items-center gap-3">
                <LinkedInIcon size={20} className="text-[#0A66C2] flex-shrink-0" />
                <div className="flex flex-col gap-0.5">
                  {linkedin?.connected ? (
                    <>
                      <p className="text-label font-medium text-foreground">
                        Connected as {linkedin.name ?? "LinkedIn user"}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {linkedin.expired
                          ? "Connection expired — reconnect to keep posting."
                          : "Post your generated images straight to LinkedIn."}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-label font-medium text-foreground">
                        Connect your LinkedIn account
                      </p>
                      <p className="text-caption text-muted-foreground">
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
                      className="inline-flex items-center px-4 py-2 rounded-control-sm text-label font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors"
                    >
                      Reconnect
                    </a>
                  )}
                  <button
                    onClick={handleDisconnectLinkedIn}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-control-sm border border-border bg-surface-muted hover:bg-surface-muted text-label font-medium text-foreground transition-colors disabled:opacity-50"
                  >
                    {disconnecting && <Loader2 size={14} className="animate-spin" />}
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <a
                  href="/api/linkedin/connect"
                  className="inline-flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-control-sm text-label font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors"
                >
                  <LinkedInIcon size={14} />
                  Connect LinkedIn
                </a>
              )}
            </div>
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notifications">
<div className="rounded-control border border-border bg-surface divide-y divide-border">
              <NotificationToggle
                label="Post published"
                hint="Email me when a scheduled post publishes"
                checked={notifyPostPublished}
                disabled={savingNotif === "postPublished"}
                onChange={(v) => void handleToggleNotification("postPublished", v)}
              />
              <NotificationToggle
                label="Post failed"
                hint="Email me when a scheduled post fails to publish"
                checked={notifyPostFailed}
                disabled={savingNotif === "postFailed"}
                onChange={(v) => void handleToggleNotification("postFailed", v)}
              />
              <NotificationToggle
                label="Weekly summary"
                hint="Email me weekly referral & performance summaries"
                checked={notifyWeeklySummary}
                disabled={savingNotif === "weeklySummary"}
                onChange={(v) => void handleToggleNotification("weeklySummary", v)}
              />
            </div>
          </SettingsSection>

          {/* Data */}
          <SettingsSection title="Your data">
<div className="flex items-center justify-between gap-4 p-4 rounded-control border border-border bg-surface">
              <div className="flex flex-col gap-0.5">
                <p className="text-label font-medium text-foreground">Export my data</p>
                <p className="text-caption text-muted-foreground">
                  Download all your ideas and posts as JSON.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-control-sm border border-border bg-surface-muted hover:bg-surface-muted text-label font-medium text-foreground transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
                {exporting ? "Exporting…" : "Export"}
              </button>
            </div>
          </SettingsSection>
        </div>
      )}
    </div>
  )
}
