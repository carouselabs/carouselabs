"use client"

// "Edit access & limits" for one user: each feature on/off and each limit,
// against the plan default, with the effective value shown before saving.
import { useMemo, useState } from "react"
import { AdminButton, AdminInput, AdminSelect, Modal } from "@/components/admin/ui"
import {
  ENGAGE_FEATURES,
  FEATURE_LABELS,
  LIMIT_KEYS,
  PLAN_FREE_GENERATIONS,
  formatLimit,
  type EngageFeature,
  type Limit,
  type LimitKey,
} from "@/lib/engage/features"
import type { EngageAccess } from "@/lib/engage/accessRules"
import { adminSend } from "./shared"

type FeatureChoice = "default" | "on" | "off"
type LimitChoice = { mode: "default" | "number" | "unlimited"; value: string }

const LIMIT_LABELS: Record<LimitKey, string> = Object.fromEntries(
  LIMIT_KEYS.map((k) => {
    if (k === "dailyCap") return [k, "All generations, rolling 24 hours"]
    const [feature, period] = k.split(".") as [EngageFeature, "day" | "month"]
    return [k, `${FEATURE_LABELS[feature]} per ${period}`]
  }),
) as Record<LimitKey, string>

export function AccessEditor({
  open,
  onClose,
  onSaved,
  userId,
  access,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  userId: string
  access: Pick<EngageAccess, "features" | "limits" | "freeGenerations">
}) {
  const [features, setFeatures] = useState<Record<EngageFeature, FeatureChoice>>(
    () => Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, access.features[f].override ?? "default"])) as Record<EngageFeature, FeatureChoice>,
  )
  const [limits, setLimits] = useState<Record<LimitKey, LimitChoice>>(
    () =>
      Object.fromEntries(
        LIMIT_KEYS.map((k) => {
          const o = access.limits[k].override
          return [k, o === null ? { mode: "default", value: "" } : o === "unlimited" ? { mode: "unlimited", value: "" } : { mode: "number", value: String(o) }]
        }),
      ) as Record<LimitKey, LimitChoice>,
  )
  const [free, setFree] = useState(access.freeGenerations.override === null ? "" : String(access.freeGenerations.override))
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effective = useMemo(() => {
    const out = {} as Record<LimitKey, string>
    for (const k of LIMIT_KEYS) {
      const c = limits[k]
      const v: Limit | null = c.mode === "unlimited" ? "unlimited" : c.mode === "number" && c.value !== "" ? Number(c.value) : null
      out[k] = formatLimit(v ?? access.limits[k].plan)
    }
    return out
  }, [limits, access])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const limitBody: Record<string, number | "unlimited" | "default"> = {}
      for (const k of LIMIT_KEYS) {
        const c = limits[k]
        if (c.mode === "number") {
          const n = Number(c.value)
          if (c.value === "" || !Number.isInteger(n) || n < 0) throw new Error(`${LIMIT_LABELS[k]}: enter a whole number, 0 or more`)
          limitBody[k] = n
        } else limitBody[k] = c.mode
      }
      const freeValue = free.trim() === "" ? null : Number(free)
      if (freeValue !== null && (!Number.isInteger(freeValue) || freeValue < 0)) throw new Error("Free generations: enter a whole number, or leave empty for the plan default")
      await adminSend(`/api/admin/engage/users/${userId}/controls`, "PATCH", {
        features,
        limits: limitBody,
        freeGenerations: freeValue,
        reason: reason.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit access & limits" wide>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <section className="space-y-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Features</h4>
          {ENGAGE_FEATURES.map((f) => (
            <div key={f} className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-[#D0D0D0]">{FEATURE_LABELS[f]}</span>
              <AdminSelect
                aria-label={FEATURE_LABELS[f]}
                value={features[f]}
                onChange={(e) => setFeatures((s) => ({ ...s, [f]: e.target.value as FeatureChoice }))}
              >
                <option value="default">Plan default (on)</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </AdminSelect>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Limits</h4>
          <p className="text-[11.5px] text-[#8A8A8A]">Per day and per month are calendar days and months in UTC.</p>
          {LIMIT_KEYS.map((k) => (
            <div key={k} className="grid grid-cols-[1fr_auto_88px_96px] items-center gap-2">
              <span className="text-[12.5px] text-[#D0D0D0]">{LIMIT_LABELS[k]}</span>
              <AdminSelect
                aria-label={`${LIMIT_LABELS[k]}: mode`}
                value={limits[k].mode}
                onChange={(e) => setLimits((s) => ({ ...s, [k]: { ...s[k], mode: e.target.value as LimitChoice["mode"] } }))}
              >
                <option value="default">Plan ({formatLimit(access.limits[k].plan)})</option>
                <option value="number">Custom</option>
                <option value="unlimited">Unlimited</option>
              </AdminSelect>
              <AdminInput
                aria-label={`${LIMIT_LABELS[k]}: number`}
                inputMode="numeric"
                disabled={limits[k].mode !== "number"}
                value={limits[k].value}
                onChange={(e) => setLimits((s) => ({ ...s, [k]: { ...s[k], value: e.target.value.replace(/\D/g, "") } }))}
              />
              <span className="text-right text-[11.5px] tabular-nums text-[#8A8A8A]" title="Effective after saving">
                = {effective[k]}
              </span>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Free generations</h4>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-[#D0D0D0]">For life, before the $15 plan is needed</span>
            <AdminInput
              aria-label="Free generations"
              inputMode="numeric"
              className="w-[120px]"
              placeholder={`Plan (${PLAN_FREE_GENERATIONS})`}
              value={free}
              onChange={(e) => setFree(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </section>

        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-[#B0B0B0]">Reason (optional, kept in the audit log)</span>
          <AdminInput className="w-full" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </label>

        {error && (
          <p role="alert" className="text-[12.5px] text-red-400">
            {error}
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-[#2A2A2A] pt-4">
        <AdminButton variant="secondary" onClick={onClose}>
          Cancel
        </AdminButton>
        <AdminButton loading={saving} onClick={save}>
          Save changes
        </AdminButton>
      </div>
    </Modal>
  )
}
