"use client"

// /admin/interns/broadcast — compose + send an announcement email to
// active interns or a hand-picked selection. Recipient list is fetched
// once from the existing intern roster endpoint.
import { useEffect, useMemo, useState } from "react"
import { Send, Mail } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, Spinner } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type RecipientType = "all" | "specific"

type InternRow = { id: string; name: string; email: string; active: boolean }

export function InternBroadcastComposer() {
  const { toast } = useToast()
  const [interns, setInterns] = useState<InternRow[] | null>(null)
  const [recipientType, setRecipientType] = useState<RecipientType>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch("/api/admin/interns")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { interns: InternRow[] }) => setInterns(data.interns))
      .catch(() => setInterns([]))
  }, [])

  const activeCount = useMemo(() => (interns ?? []).filter((i) => i.active).length, [interns])
  const recipientCount = recipientType === "all" ? activeCount : selectedIds.size

  const valid =
    subject.trim().length > 0 && body.trim().length > 0 && (recipientType === "all" || selectedIds.size > 0)

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendRequest = (extra: Record<string, unknown>) =>
    fetch("/api/admin/interns/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        recipientType,
        specificInternIds: recipientType === "specific" ? Array.from(selectedIds) : undefined,
        ...extra,
      }),
    })

  const sendTest = async () => {
    if (!valid) {
      toast("Fill in subject and message first", "error")
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

  const openConfirm = () => {
    if (!valid) {
      toast("Fill in subject and message first", "error")
      return
    }
    if (recipientCount === 0) {
      toast("No recipients match that selection", "error")
      return
    }
    setConfirmOpen(true)
  }

  const sendBroadcast = async () => {
    setSending(true)
    try {
      const res = await sendRequest({})
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(
        `Sent to ${data.sent} intern${data.sent === 1 ? "" : "s"}${data.failed ? ` — ${data.failed} failed` : ""}`,
        "success",
      )
      setConfirmOpen(false)
      setSubject("")
      setBody("")
      setSelectedIds(new Set())
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Broadcast failed", "error")
    } finally {
      setSending(false)
    }
  }

  if (interns === null) return <Spinner label="Loading interns…" />

  return (
    <div className="max-w-3xl space-y-6">
      <AdminCard title="Compose Announcement">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">To</label>
            <div className="flex w-fit rounded-lg border border-[#2A2A2A] bg-[#141414] p-1">
              {(
                [
                  { key: "all", label: "All Active Interns" },
                  { key: "specific", label: "Specific Interns" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRecipientType(opt.key)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    recipientType === opt.key ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {recipientType === "specific" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                Select interns ({selectedIds.size} selected)
              </label>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#141414]">
                {interns.length === 0 ? (
                  <p className="p-3 text-[12.5px] text-[#6A6A6A]">No interns found.</p>
                ) : (
                  interns.map((i) => (
                    <label
                      key={i.id}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-[#232323] px-3 py-2 last:border-0 hover:bg-[#1A1A1A]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(i.id)}
                        onChange={() => toggleSelected(i.id)}
                        className="h-4 w-4 accent-[#7C3AED]"
                      />
                      <span className="text-[13px] text-white">{i.name}</span>
                      <span className="text-[12px] text-[#6A6A6A]">{i.email}</span>
                      {!i.active && (
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[#6A6A6A]">
                          Inactive
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Subject</label>
            <AdminInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
              placeholder="An update for the team"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your announcement…"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton variant="secondary" onClick={sendTest} loading={testing} disabled={!valid}>
              <Mail className="h-3.5 w-3.5" />
              Send Test to Myself
            </AdminButton>
            <AdminButton onClick={openConfirm} disabled={!valid} className="ml-auto">
              <Send className="h-3.5 w-3.5" />
              Send Broadcast
            </AdminButton>
          </div>
          <p className="text-[11px] text-[#6A6A6A]">Limited to 5 announcements per hour. Test sends don&apos;t count.</p>
        </div>
      </AdminCard>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        loading={sending}
        title="Send this announcement?"
        body={`This will send to ${recipientCount} intern${recipientCount === 1 ? "" : "s"}. Continue?`}
        confirmLabel={`Send to ${recipientCount}`}
        onConfirm={sendBroadcast}
      />
    </div>
  )
}
