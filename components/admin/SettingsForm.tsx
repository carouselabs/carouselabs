"use client"

// /admin/settings — app-level settings form backed by /api/admin/settings.
import { useEffect, useState } from "react"
import { AdminButton, AdminCard, AdminInput, Spinner } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import type { AppSettings } from "@/lib/appSettings"

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 py-3">
      <div>
        <div className="text-[13px] font-medium text-white">{label}</div>
        {hint && <div className="mt-0.5 text-[11.5px] text-[#6A6A6A]">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#7C3AED]" : "bg-[#2A2A2A]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  )
}

export function SettingsForm() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setSettings)
      .catch(() => toast("Failed to load settings", "error"))
  }, [toast])

  if (!settings) return <Spinner label="Loading settings…" />

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s))

  const numField = (
    label: string,
    key: "planPrice" | "freePostLimit" | "proCredits",
    step?: string,
  ) => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
        {label}
      </label>
      <AdminInput
        type="number"
        step={step}
        min={0}
        value={String(settings[key])}
        onChange={(e) => set(key, Number(e.target.value) as never)}
        className="w-full"
      />
    </div>
  )

  const save = async () => {
    if (
      !Number.isFinite(settings.planPrice) ||
      settings.planPrice <= 0 ||
      !Number.isInteger(settings.freePostLimit) ||
      settings.freePostLimit < 0 ||
      !Number.isInteger(settings.proCredits) ||
      settings.proCredits < 1
    ) {
      toast("Check the number fields — price must be positive, limits non-negative", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      toast("Settings saved", "success")
    } catch {
      toast("Failed to save settings", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <AdminCard title="Plans & Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          {numField("Pro price (USD/month)", "planPrice", "0.01")}
          {numField("Free plan post limit", "freePostLimit")}
          {numField("Pro monthly credits", "proCredits")}
        </div>
        <p className="mt-3 text-[11px] text-[#6A6A6A]">
          Stored in the AppSetting table. Note: the credit engine currently reads its limits from
          code constants (lib/credits.ts) — wire it to these values when you&apos;re ready to make
          them live.
        </p>
      </AdminCard>

      <AdminCard title="Feature Flags">
        <div className="space-y-3">
          <Toggle
            label="Carousels for free users"
            hint="Allow FREE-plan users to generate carousels"
            checked={settings.freeCarouselEnabled}
            onChange={(v) => set("freeCarouselEnabled", v)}
          />
          <Toggle
            label="LinkedIn posting"
            hint="Enable direct publishing to LinkedIn"
            checked={settings.linkedinPostingEnabled}
            onChange={(v) => set("linkedinPostingEnabled", v)}
          />
          <Toggle
            label="Maintenance mode"
            hint="Shows a maintenance banner to all users"
            checked={settings.maintenanceMode}
            onChange={(v) => set("maintenanceMode", v)}
          />
        </div>
      </AdminCard>

      <AdminButton onClick={save} loading={saving}>
        Save Settings
      </AdminButton>
    </div>
  )
}
