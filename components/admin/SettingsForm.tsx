"use client"

// /admin/settings — app-level settings form backed by /api/admin/settings.
import { useEffect, useState } from "react"
import { AdminButton, AdminInput, Spinner } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { SettingsSection } from "@/components/settings/SettingsSection"
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
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-control-sm border border-border bg-background px-4 py-3">
      <div>
        <div className="text-label font-medium text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-caption text-muted-foreground/80">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-surface-raised"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
            checked ? "left-[22px] bg-brand-foreground" : "left-0.5 bg-muted-foreground"
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
      <label className="text-caption font-semibold text-muted-foreground">
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
    <div className="flex max-w-5xl flex-col gap-8">
      <SettingsSection title="Plans & Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          {numField("Pro price (USD/month)", "planPrice", "0.01")}
          {numField("Free plan credit limit", "freePostLimit")}
          {numField("Pro monthly credits", "proCredits")}
        </div>
        <p className="mt-3 text-caption text-muted-foreground/80">
          Stored in the AppSetting table. Note: the credit engine currently reads its limits from
          code constants (lib/credits.ts) — wire it to these values when you&apos;re ready to make
          them live.
        </p>
      </SettingsSection>

      <SettingsSection title="Feature Flags">
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
      </SettingsSection>

      <AdminButton onClick={save} loading={saving}>
        Save Settings
      </AdminButton>
    </div>
  )
}
