"use client"

// /admin/broadcasts — compose + send an email broadcast, plus a history
// table sourced from audit logs (action=SEND_BROADCAST).
import { useCallback, useEffect, useState } from "react"
import { Send, Eye, Mail } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  ConfirmModal,
  Modal,
  Spinner,
  fmtDateTime,
  tableCls,
} from "@/components/admin/ui"
import { renderBroadcastEmailHtml } from "@/lib/broadcastRender"
import { useToast } from "@/components/admin/Toast"

type Audience = "all" | "pro" | "growth" | "free" | "custom"

type AuditLogRow = {
  id: string
  adminEmail: string
  details: string
  createdAt: string
}

function parseCustomList(raw: string): string[] {
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
}

export function BroadcastComposer() {
  const { toast } = useToast()
  const [audience, setAudience] = useState<Audience>("all")
  const [customList, setCustomList] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmCount, setConfirmCount] = useState<number | null>(null)

  const [history, setHistory] = useState<AuditLogRow[] | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audit-logs?action=SEND_BROADCAST&limit=20")
      if (!res.ok) throw new Error()
      setHistory((await res.json()).logs)
    } catch {
      setHistory([])
    }
  }, [])
  // `loadHistory` is also called after a successful send to refresh, so it
  // can't be inlined as a .then() chain without duplicating fetch logic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadHistory(), [loadHistory])

  const recipients = audience === "custom" ? parseCustomList(customList) : audience

  const valid = subject.trim().length > 0 && body.trim().length > 0 && (audience !== "custom" || recipients.length > 0)

  const sendRequest = (extra: Record<string, unknown>) =>
    fetch("/api/admin/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, recipients, ...extra }),
    })

  const sendTest = async () => {
    if (!valid) {
      toast("Fill in subject, body, and recipients first", "error")
      return
    }
    setTesting(true)
    try {
      const res = await sendRequest({ test: true })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(`Test email sent to ${data.sentTo}`, "success")
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Test send failed", "error")
    } finally {
      setTesting(false)
    }
  }

  const openConfirm = async () => {
    if (!valid) {
      toast("Fill in subject, body, and recipients first", "error")
      return
    }
    try {
      const res = await sendRequest({ dryRun: true })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      if (data.count === 0) {
        toast("No recipients match that selection", "error")
        return
      }
      setConfirmCount(data.count)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't resolve recipients", "error")
    }
  }

  const sendBroadcast = async () => {
    setSending(true)
    try {
      const res = await sendRequest({})
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(`Broadcast sent — ${data.sent} delivered, ${data.failed} failed`, "success")
      setConfirmCount(null)
      setSubject("")
      setBody("")
      setCustomList("")
      await loadHistory()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Broadcast failed", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <AdminCard title="Compose Broadcast">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">To</label>
            <AdminSelect value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className="w-full">
              <option value="all">All Users</option>
              <option value="pro">Pro Users</option>
              <option value="growth">Growth Users</option>
              <option value="free">Free Users</option>
              <option value="custom">Custom List</option>
            </AdminSelect>
          </div>

          {audience === "custom" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                Emails (comma-separated)
              </label>
              <textarea
                value={customList}
                onChange={(e) => setCustomList(e.target.value)}
                rows={2}
                placeholder="user1@email.com, user2@email.com"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
              />
              <p className="text-[11px] text-[#6A6A6A]">{parseCustomList(customList).length} email(s) parsed</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Subject</label>
            <AdminInput value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full" placeholder="What's new at CarouseLabs" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Body <span className="font-normal normal-case text-[#6A6A6A]">— **bold**, *italic*, [link](https://…)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your announcement…"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton variant="secondary" onClick={() => setShowPreview(true)} disabled={!valid}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </AdminButton>
            <AdminButton variant="secondary" onClick={sendTest} loading={testing} disabled={!valid}>
              <Mail className="h-3.5 w-3.5" />
              Send Test to Admin
            </AdminButton>
            <AdminButton onClick={openConfirm} disabled={!valid} className="ml-auto">
              <Send className="h-3.5 w-3.5" />
              Send Broadcast
            </AdminButton>
          </div>
          <p className="text-[11px] text-[#6A6A6A]">Limited to one real broadcast per hour. Test sends don&apos;t count.</p>
        </div>
      </AdminCard>

      <AdminCard title="Sent Broadcasts">
        {history === null ? (
          <Spinner label="Loading history…" />
        ) : (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Sent</th>
                  <th className={tableCls.th}>By</th>
                  <th className={tableCls.th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={3}>
                      No broadcasts sent yet
                    </td>
                  </tr>
                )}
                {history.map((h) => (
                  <tr key={h.id} className={tableCls.row}>
                    <td className={tableCls.td}>{fmtDateTime(h.createdAt)}</td>
                    <td className={tableCls.td}>{h.adminEmail}</td>
                    <td className={`${tableCls.td} max-w-[420px] truncate text-[#8A8A8A]`} title={h.details}>
                      {h.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Email Preview">
        <div
          className="max-h-[60vh] overflow-y-auto rounded-lg bg-white"
          dangerouslySetInnerHTML={{ __html: renderBroadcastEmailHtml(subject, body) }}
        />
      </Modal>

      <ConfirmModal
        open={confirmCount !== null}
        onClose={() => setConfirmCount(null)}
        loading={sending}
        title="Send this broadcast?"
        body={`This will email ${confirmCount ?? 0} recipient${confirmCount === 1 ? "" : "s"}. This can't be undone.`}
        confirmLabel={`Send to ${confirmCount ?? 0}`}
        onConfirm={sendBroadcast}
      />
    </div>
  )
}
