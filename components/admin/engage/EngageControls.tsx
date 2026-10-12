"use client"

// Engage → Controls: settings that apply to everyone using the extensions
// (/api/admin/engage/controls): pause a feature for all users with the
// message they see, switch Insert off per extension, and set the oldest
// extension version still allowed to write, next to the versions in use.
// Every change asks for a reason and lands in the Engage audit log.
import { useState } from "react"
import { AdminButton, AdminInput, Modal, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import {
  FEATURE_LABELS,
  PLATFORM_FEATURES,
  PLATFORM_LABELS,
  type EngageFeature,
  type EngagePlatform,
} from "@/lib/engage/features"
import {
  PAUSE_MESSAGE_MAX,
  VERSION_PATTERN,
  compareVersions,
  isOutdated,
  type EngageGlobalSettings,
} from "@/lib/engage/settingsRules"
import type { VersionRow } from "@/lib/engage/versions"
import { EmptyState, ErrorState, Pill, SkeletonBlock, adminSend, fmtNumber, fmtRelative, useAdminApi } from "./shared"

interface ControlsState {
  ready: boolean
  settings: EngageGlobalSettings
  saved: Record<string, { updatedAt: string; updatedBy: string | null }>
  versions: VersionRow[]
}

const PLATFORMS: EngagePlatform[] = ["linkedin", "x"]
const API = "/api/admin/engage/controls"

type Dialog =
  | { kind: "pause"; feature: EngageFeature }
  | { kind: "resume"; feature: EngageFeature }
  | { kind: "insert"; platform: EngagePlatform; enabled: boolean }
  | { kind: "minVersion"; platform: EngagePlatform }
  | { kind: "clearMinVersion"; platform: EngagePlatform }

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" aria-label={title}>
      <header className="border-b border-[#2A2A2A] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-[12px] text-[#8A8A8A]">{description}</p>
      </header>
      {children}
    </section>
  )
}

function Row({ label, status, action }: { label: string; status: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[#232323] px-4 py-2.5 first:border-t-0">
      <span className="min-w-[160px] flex-1 text-[12.5px] text-[#D0D0D0]">{label}</span>
      <span className="flex-1">{status}</span>
      {action}
    </div>
  )
}

const versionLabel = (v: string | null) => v ?? "Before 1.3.0 (no version sent)"

export function EngageControls() {
  const { toast } = useToast()
  const { data, error, loading, reload } = useAdminApi<ControlsState>(API)
  const [state, setState] = useState<ControlsState | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [message, setMessage] = useState("")
  const [version, setVersion] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const current = state ?? data

  function open(next: Dialog) {
    setDialog(next)
    setReason("")
    setDialogError(null)
    setMessage("")
    if (next.kind === "minVersion" && current) {
      const newest = current.versions.find((v) => v.platform === next.platform && v.version)?.version ?? ""
      setVersion(current.settings.minVersion[next.platform] ?? newest)
    }
  }

  async function submit(body: Record<string, unknown>, done: string) {
    setBusy(true)
    setDialogError(null)
    try {
      setState(await adminSend<ControlsState>(API, "PATCH", { ...body, reason: reason.trim() || undefined }))
      setDialog(null)
      toast(done)
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Couldn't save that")
    } finally {
      setBusy(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!current || loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-4" aria-busy="true" aria-label="Loading controls">
        <SkeletonBlock className="h-[60px]" />
        <SkeletonBlock className="h-[260px]" />
        <SkeletonBlock className="h-[160px]" />
      </div>
    )
  }

  const { settings, versions } = current
  const savedNote = (key: string) => {
    const s = current.saved[key]
    return s ? `Last changed ${fmtRelative(s.updatedAt)}${s.updatedBy ? ` by ${s.updatedBy}` : ""}` : null
  }
  const versionsFor = (p: EngagePlatform) => versions.filter((v) => v.platform === p)
  const wouldStop = (p: EngagePlatform, min: string) =>
    versionsFor(p).filter((v) => isOutdated(v.version, min)).reduce((n, v) => n + v.browsers, 0)
  const candidate = dialog?.kind === "minVersion" ? version.trim() : ""
  const candidateValid = VERSION_PATTERN.test(candidate)

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight text-white">Controls</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">
          Switches for everyone using the extensions. A change reaches everyone within 10 seconds and is kept in the
          Engage audit log.
        </p>
      </div>

      {!current.ready && (
        <EmptyState
          title="Run the phase B SQL first"
          body="Run scripts/engage-admin-phase-b.sql in Supabase. Until then everything stays on, as it is today, and nothing here can be saved."
        />
      )}

      <Section
        title="Features for everyone"
        description="Pause a feature for every user at once, for example while something is broken. People see your message instead of writing."
      >
        {PLATFORMS.map((platform) => (
          <div key={platform}>
            <p className="border-t border-[#232323] bg-[#161616] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A] first:border-t-0">
              {PLATFORM_LABELS[platform]} extension
            </p>
            {PLATFORM_FEATURES[platform].map((f) => {
              const s = settings.features[f]
              return (
                <Row
                  key={f}
                  label={FEATURE_LABELS[f]}
                  status={
                    s.enabled ? (
                      <Pill tone="green">On</Pill>
                    ) : (
                      <span className="flex flex-col items-start gap-1">
                        <Pill tone="red">Paused for everyone</Pill>
                        {s.message && <span className="text-[11.5px] text-[#8A8A8A]">“{s.message}”</span>}
                      </span>
                    )
                  }
                  action={
                    s.enabled ? (
                      <AdminButton variant="secondary" disabled={!current.ready} onClick={() => open({ kind: "pause", feature: f })}>
                        Pause
                      </AdminButton>
                    ) : (
                      <AdminButton disabled={!current.ready} onClick={() => open({ kind: "resume", feature: f })}>
                        Turn back on
                      </AdminButton>
                    )
                  }
                />
              )
            })}
          </div>
        ))}
        {savedNote("features") && <p className="border-t border-[#232323] px-4 py-2 text-[11.5px] text-[#8A8A8A]">{savedNote("features")}</p>}
      </Section>

      <Section
        title="Insert button"
        description="Off hides Insert in that extension for everyone (Copy always stays), and the extension refuses to insert."
      >
        {PLATFORMS.map((platform) => (
          <Row
            key={platform}
            label={`${PLATFORM_LABELS[platform]} extension`}
            status={settings.insert[platform] ? <Pill tone="green">On</Pill> : <Pill tone="red">Off for everyone</Pill>}
            action={
              <AdminButton
                variant={settings.insert[platform] ? "secondary" : "primary"}
                disabled={!current.ready}
                onClick={() => open({ kind: "insert", platform, enabled: !settings.insert[platform] })}
              >
                {settings.insert[platform] ? "Turn off" : "Turn on"}
              </AdminButton>
            }
          />
        ))}
      </Section>

      <Section
        title="Extension versions"
        description="Browsers signed in and used in the last 30 days. A minimum version asks anyone older to update before they can write; it's off until you set one."
      >
        <div className="grid gap-px bg-[#232323] lg:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const rows = versionsFor(platform)
            const min = settings.minVersion[platform]
            return (
              <div key={platform} className="bg-[#1A1A1A] p-4" aria-label={`${PLATFORM_LABELS[platform]} versions`} role="group">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[12.5px] font-semibold text-white">{PLATFORM_LABELS[platform]} extension</h3>
                  <span className="block text-[12px] text-[#B0B0B0]">
                    Minimum: {min ? <Pill tone="amber">{min}</Pill> : <span className="text-[#8A8A8A]">none</span>}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="py-3 text-[12px] text-[#8A8A8A]">No one used it in the last 30 days.</p>
                ) : (
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                        <th className="py-1.5 font-semibold">Version</th>
                        <th className="py-1.5 text-right font-semibold">Browsers</th>
                        <th className="py-1.5 text-right font-semibold">People</th>
                        <th className="py-1.5 text-right font-semibold">Last seen</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#D0D0D0]">
                      {rows.map((v) => (
                        <tr key={v.version ?? "none"} className="border-t border-[#232323]">
                          <td className="py-1.5">
                            {versionLabel(v.version)}
                            {min && isOutdated(v.version, min) && (
                              <span className="ml-2">
                                <Pill tone="red">Asked to update</Pill>
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{fmtNumber(v.browsers)}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmtNumber(v.people)}</td>
                          <td className="py-1.5 text-right text-[#8A8A8A]" title={fmtDateTime(v.lastSeenAt)}>
                            {fmtRelative(v.lastSeenAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminButton variant="secondary" disabled={!current.ready || rows.every((r) => !r.version)} onClick={() => open({ kind: "minVersion", platform })}>
                    {min ? "Change minimum" : "Set a minimum"}
                  </AdminButton>
                  {min && (
                    <AdminButton variant="ghost" disabled={!current.ready} onClick={() => open({ kind: "clearMinVersion", platform })}>
                      Remove minimum
                    </AdminButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {savedNote("minVersion") && <p className="border-t border-[#232323] px-4 py-2 text-[11.5px] text-[#8A8A8A]">{savedNote("minVersion")}</p>}
      </Section>

      <Modal
        open={dialog !== null}
        onClose={() => !busy && setDialog(null)}
        title={
          dialog?.kind === "pause"
            ? `Pause ${FEATURE_LABELS[dialog.feature]} for everyone?`
            : dialog?.kind === "resume"
              ? `Turn ${FEATURE_LABELS[dialog.feature]} back on?`
              : dialog?.kind === "insert"
                ? `Turn Insert ${dialog.enabled ? "on" : "off"} in the ${PLATFORM_LABELS[dialog.platform]} extension?`
                : dialog?.kind === "minVersion"
                  ? `Minimum ${PLATFORM_LABELS[dialog.platform]} extension version`
                  : dialog?.kind === "clearMinVersion"
                    ? `Remove the minimum ${PLATFORM_LABELS[dialog.platform]} version?`
                    : ""
        }
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!dialog) return
            if (dialog.kind === "pause") {
              void submit({ feature: { key: dialog.feature, enabled: false, message: message.trim() || null } }, `${FEATURE_LABELS[dialog.feature]} paused for everyone`)
            } else if (dialog.kind === "resume") {
              void submit({ feature: { key: dialog.feature, enabled: true } }, `${FEATURE_LABELS[dialog.feature]} is back on`)
            } else if (dialog.kind === "insert") {
              void submit({ insert: { platform: dialog.platform, enabled: dialog.enabled } }, `Insert ${dialog.enabled ? "on" : "off"}`)
            } else if (dialog.kind === "minVersion") {
              void submit({ minVersion: { platform: dialog.platform, version: candidate } }, `Minimum version set to ${candidate}`)
            } else {
              void submit({ minVersion: { platform: dialog.platform, version: null } }, "Minimum version removed")
            }
          }}
        >
          {dialog?.kind === "pause" && (
            <>
              <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">
                Nobody can use it until you turn it back on. Within 10 seconds, everyone who tries sees this message:
              </p>
              <label className="block space-y-1">
                <span className="block text-[12px] text-[#B0B0B0]">Message people see (optional)</span>
                <AdminInput
                  className="w-full"
                  maxLength={PAUSE_MESSAGE_MAX}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`${FEATURE_LABELS[dialog.feature]}: paused for a little while. Please try again later.`}
                />
              </label>
            </>
          )}
          {dialog?.kind === "resume" && (
            <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">Everyone can use it again within 10 seconds.</p>
          )}
          {dialog?.kind === "insert" && (
            <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">
              {dialog.enabled
                ? "Insert comes back for everyone who has it switched on in their own settings."
                : "The Insert button disappears for everyone in this extension. Copy keeps working."}
            </p>
          )}
          {dialog?.kind === "minVersion" && (
            <>
              <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">
                Anyone on an older version sees “Please update” instead of writing, until Chrome updates their extension.
              </p>
              <label className="block space-y-1">
                <span className="block text-[12px] text-[#B0B0B0]">Oldest version allowed</span>
                <AdminInput className="w-40" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.3.0" />
              </label>
              {candidateValid ? (
                <p role="status" className="text-[12.5px] text-amber-200">
                  {(() => {
                    const n = wouldStop(dialog.platform, candidate)
                    const newest = versionsFor(dialog.platform).find((v) => v.version)?.version
                    if (newest && compareVersions(newest, candidate) < 0) return `Nobody has ${candidate} yet, so this would stop everyone. It won't be saved.`
                    return n === 0 ? "Nobody would be asked to update right now." : `${fmtNumber(n)} browser${n === 1 ? "" : "s"} would be asked to update.`
                  })()}
                </p>
              ) : (
                <p className="text-[12px] text-[#8A8A8A]">Use a version like 1.3.0.</p>
              )}
            </>
          )}
          {dialog?.kind === "clearMinVersion" && (
            <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">Every version can write again.</p>
          )}

          <label className="block space-y-1">
            <span className="block text-[12px] text-[#B0B0B0]">Reason (for the audit log)</span>
            <AdminInput className="w-full" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. X changed its reply box" />
          </label>

          {dialogError && (
            <p role="alert" className="text-[12.5px] text-red-300">
              {dialogError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <AdminButton type="button" variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              variant={dialog?.kind === "pause" || (dialog?.kind === "insert" && !dialog.enabled) || dialog?.kind === "minVersion" ? "danger" : "primary"}
              loading={busy}
              disabled={dialog?.kind === "minVersion" && !candidateValid}
            >
              {dialog?.kind === "pause"
                ? "Pause for everyone"
                : dialog?.kind === "resume"
                  ? "Turn back on"
                  : dialog?.kind === "insert"
                    ? dialog.enabled
                      ? "Turn on"
                      : "Turn off"
                    : dialog?.kind === "minVersion"
                      ? "Set minimum"
                      : "Remove"}
            </AdminButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
