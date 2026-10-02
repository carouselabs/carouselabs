"use client"

// The form behind "Grant free access" (a user's page) and "Add user" (by
// email): how long, why, and whether to email them. One form so both say
// and do exactly the same thing.
import { useState } from "react"
import { AdminButton, AdminInput, AdminSelect, Modal } from "@/components/admin/ui"
import { GRANT_DURATIONS, GRANT_DURATION_LABELS, type GrantDuration } from "@/lib/engage/grants"
import { adminSend } from "./shared"

export function GrantAccessModal({
  open,
  onClose,
  onDone,
  userId,
  email: fixedEmail,
}: {
  open: boolean
  onClose: () => void
  onDone: (message: string) => void
  // A user's page passes userId; "Add user" asks for an email instead.
  userId?: string
  email?: string
}) {
  const [email, setEmail] = useState("")
  const [duration, setDuration] = useState<GrantDuration>("30d")
  const [endsAt, setEndsAt] = useState("")
  const [reason, setReason] = useState("")
  const [sendInvite, setSendInvite] = useState(!userId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        duration,
        endsAt: duration === "custom" && endsAt ? new Date(`${endsAt}T23:59:59.000Z`).toISOString() : undefined,
        reason,
        sendInvite,
        ...(userId ? {} : { email }),
      }
      const res = await adminSend<{ pending: boolean; inviteSent: boolean | null }>(
        userId ? `/api/admin/engage/users/${userId}/grants` : "/api/admin/engage/grants",
        "POST",
        body,
      )
      const who = fixedEmail ?? email
      onDone(
        res.pending
          ? `Access saved for ${who}. It starts when they sign up${res.inviteSent ? "; invitation sent" : ""}.`
          : `${who} has free access now${res.inviteSent === false ? " (the email didn't send)" : res.inviteSent ? "; email sent" : ""}.`,
      )
      setReason("")
      setEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't grant access")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={userId ? "Grant free access" : "Add user"}>
      <form onSubmit={submit} className="space-y-4">
        {userId ? (
          <p className="text-[12.5px] text-[#B0B0B0]">
            Unlimited Engage for <span className="font-medium text-white">{fixedEmail}</span>, without a subscription.
          </p>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-[#B0B0B0]">Email</span>
            <AdminInput
              type="email"
              required
              autoFocus
              className="w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <span className="block text-[11.5px] text-[#8A8A8A]">
              Not signed up yet? The access waits and starts when they sign up with this email.
            </span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-[#B0B0B0]">For how long</span>
            <AdminSelect className="w-full" value={duration} onChange={(e) => setDuration(e.target.value as GrantDuration)}>
              {GRANT_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {GRANT_DURATION_LABELS[d]}
                </option>
              ))}
            </AdminSelect>
          </label>
          {duration === "custom" && (
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#B0B0B0]">Until (end of day, UTC)</span>
              <AdminInput type="date" required className="w-full" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-[#B0B0B0]">Reason (kept in the audit log)</span>
          <AdminInput
            required
            minLength={3}
            maxLength={500}
            className="w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Partnership testing until Oct 30"
          />
        </label>

        <label className="flex items-center gap-2 text-[12.5px] text-[#D0D0D0]">
          <input type="checkbox" className="h-4 w-4 accent-[#7C3AED]" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
          Email them that they have access
        </label>

        {error && (
          <p role="alert" className="text-[12.5px] text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" loading={saving}>
            {userId ? "Grant access" : "Add user"}
          </AdminButton>
        </div>
      </form>
    </Modal>
  )
}
