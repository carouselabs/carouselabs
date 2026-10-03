"use client"

// One action on the users selected in the users table
// (/api/admin/engage/users/bulk): free access, pause, resume or a tag. Each
// user is handled exactly as on their own page and audited; any the action
// didn't apply to are listed with the reason.
import { useState } from "react"
import { AdminButton, AdminInput, AdminSelect, Modal } from "@/components/admin/ui"
import { GRANT_DURATIONS, GRANT_DURATION_LABELS, type GrantDuration } from "@/lib/engage/grants"
import { adminSend } from "./shared"

export type BulkAction = "grant" | "suspend" | "resume" | "tag"

const TITLES: Record<BulkAction, string> = {
  grant: "Give free access",
  suspend: "Pause Engage access",
  resume: "Resume Engage access",
  tag: "Add a tag",
}

// Bulk grants take a fixed length (a custom date is one person at a time).
const DURATIONS = GRANT_DURATIONS.filter((d) => d !== "custom")

export function BulkActionModal({
  action,
  users,
  onClose,
  onDone,
}: {
  action: BulkAction | null
  users: { id: string; email: string }[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState<GrantDuration>("30d")
  const [tag, setTag] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // What came back when some users were skipped. The table clears its
  // selection once the action is done, so the counts are kept here.
  const [result, setResult] = useState<{ done: number; of: number; skipped: { email: string; why: string }[] } | null>(null)

  function close() {
    if (busy) return
    setReason("")
    setTag("")
    setError(null)
    setResult(null)
    onClose()
  }

  async function submit() {
    if (!action) return
    setBusy(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { action, userIds: users.map((u) => u.id) }
      if (action === "tag") body.tag = tag.trim()
      else body.reason = reason.trim()
      if (action === "grant") body.duration = duration
      const res = await adminSend<{ done: number; skipped: { userId: string; why: string }[] }>(
        "/api/admin/engage/users/bulk",
        "POST",
        body,
      )
      const emailOf = new Map(users.map((u) => [u.id, u.email]))
      const message = `${TITLES[action]}: done for ${res.done} of ${users.length}`
      if (res.skipped.length > 0) {
        setResult({
          done: res.done,
          of: users.length,
          skipped: res.skipped.map((s) => ({ email: emailOf.get(s.userId) ?? s.userId, why: s.why })),
        })
        onDone(message)
      } else {
        onDone(message)
        close()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't do that")
    } finally {
      setBusy(false)
    }
  }

  const needsReason = action !== null && action !== "tag"
  const valid = action === "tag" ? tag.trim().length > 0 : reason.trim().length >= 3
  const count = result?.of ?? users.length

  return (
    <Modal open={action !== null} onClose={close} title={action ? `${TITLES[action]} · ${count} user${count === 1 ? "" : "s"}` : ""}>
      {result ? (
        <div className="space-y-3">
          <p className="text-[12.5px] text-[#B0B0B0]">
            Done for {result.done} of {result.of}. Skipped:
          </p>
          <ul className="max-h-60 space-y-1 overflow-auto text-[12.5px]" aria-label="Skipped users">
            {result.skipped.map((s) => (
              <li key={s.email} className="flex justify-between gap-3 text-[#D0D0D0]">
                <span className="truncate">{s.email}</span>
                <span className="shrink-0 text-[#8A8A8A]">{s.why}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <AdminButton onClick={close}>Close</AdminButton>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) void submit()
          }}
        >
          {action === "grant" && (
            <label className="block space-y-1">
              <span className="block text-[12px] text-[#B0B0B0]">For how long</span>
              <AdminSelect aria-label="For how long" value={duration} onChange={(e) => setDuration(e.target.value as GrantDuration)}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {GRANT_DURATION_LABELS[d]}
                  </option>
                ))}
              </AdminSelect>
            </label>
          )}
          {action === "suspend" && (
            <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">They can&apos;t write with either extension until resumed. Their account and billing are untouched.</p>
          )}
          {action === "tag" && (
            <label className="block space-y-1">
              <span className="block text-[12px] text-[#B0B0B0]">Tag</span>
              <AdminInput className="w-full" maxLength={32} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Beta tester" />
            </label>
          )}
          {needsReason && (
            <label className="block space-y-1">
              <span className="block text-[12px] text-[#B0B0B0]">Reason (for the audit log)</span>
              <AdminInput className="w-full" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Launch partners" />
            </label>
          )}
          {error && (
            <p role="alert" className="text-[12.5px] text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton type="button" variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant={action === "suspend" ? "danger" : "primary"} loading={busy} disabled={!valid}>
              {action ? TITLES[action] : ""}
            </AdminButton>
          </div>
        </form>
      )}
    </Modal>
  )
}
