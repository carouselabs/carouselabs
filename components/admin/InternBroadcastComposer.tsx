"use client"

// /admin/interns/broadcast — compose + send an announcement email to
// active interns or a hand-picked selection. Recipient list is fetched
// once from the existing intern roster endpoint.
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Send, Mail, CalendarClock } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, Spinner } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type RecipientType = "all" | "specific"
type SendMode = "now" | "schedule"

type InternRow = { id: string; name: string; email: string; active: boolean }

// datetime-local's `min` — a few minutes out, so a schedule submitted right
// at page-load doesn't immediately fail the "must be in the future" check.
function minScheduleValue(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function InternBroadcastComposer() {
  const { toast } = useToast()
  const [interns, setInterns] = useState<InternRow[] | null>(null)
  const [recipientType, setRecipientType] = useState<RecipientType>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sendMode, setSendMode] = useState<SendMode>("now")
  const [scheduledFor, setScheduledFor] = useState("")
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resolvingRecipients, setResolvingRecipients] = useState(false)

  useEffect(() => {
    fetch("/api/admin/interns")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { interns: InternRow[] }) => setInterns(data.interns))
      .catch(() => setInterns([]))
  }, [])

  const activeCount = useMemo(() => (interns ?? []).filter((i) => i.active).length, [interns])
  const recipientCount = recipientType === "all" ? activeCount : selectedIds.size

  // contentValid gates actions that don't care about the schedule time
  // (Preview, Send Test); valid additionally requires a future time picked
  // when in schedule mode, and gates the actual Send/Schedule button.
  const contentValid =
    subject.trim().length > 0 && body.trim().length > 0 && (recipientType === "all" || selectedIds.size > 0)
  // The picker's `min` (see minScheduleValue) already steers away from past
  // times in the UI; the API route is the authoritative future-time check.
  const valid = contentValid && (sendMode === "now" || scheduledFor.trim().length > 0)

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

  const scheduleRequest = (extra: Record<string, unknown>) =>
    fetch("/api/admin/scheduled-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "intern_broadcast",
        subject,
        body,
        recipientType,
        recipientIds: recipientType === "specific" ? Array.from(selectedIds) : undefined,
        scheduledFor: new Date(scheduledFor).toISOString(),
        ...extra,
      }),
    })

  const sendTest = async () => {
    if (!contentValid) {
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

  const openConfirm = async () => {
    if (!valid) {
      toast(
        sendMode === "schedule" ? "Fill in subject, message, and a future time first" : "Fill in subject and message first",
        "error",
      )
      return
    }
    if (sendMode === "now") {
      if (recipientCount === 0) {
        toast("No recipients match that selection", "error")
        return
      }
      setConfirmOpen(true)
      return
    }

    // Schedule mode — resolve + validate via dryRun before confirming, same
    // pattern as the immediate-send path's recipientCount check.
    setResolvingRecipients(true)
    try {
      const res = await scheduleRequest({ dryRun: true })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      if (data.count === 0) {
        toast("No recipients match that selection", "error")
        return
      }
      setConfirmOpen(true)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't validate this schedule", "error")
    } finally {
      setResolvingRecipients(false)
    }
  }

  const sendBroadcast = async () => {
    setSending(true)
    try {
      const res = await (sendMode === "now" ? sendRequest({}) : scheduleRequest({}))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(
        sendMode === "now"
          ? `Sent to ${data.sent} intern${data.sent === 1 ? "" : "s"}${data.failed ? ` — ${data.failed} failed${data.error ? ` (${data.error})` : ""}` : ""}`
          : `Scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        sendMode === "now" && data.failed ? "error" : "success",
      )
      setConfirmOpen(false)
      setSubject("")
      setBody("")
      setSelectedIds(new Set())
      setScheduledFor("")
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Broadcast failed", "error")
    } finally {
      setSending(false)
    }
  }

  if (interns === null) return <Spinner label="Loading interns…" />

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-end">
        <Link
          href="/admin/scheduled-emails"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          View Scheduled Emails
        </Link>
      </div>

      <AdminCard title="Compose Announcement">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-muted-foreground">When</label>
            <div className="flex w-fit rounded-control-sm border border-border bg-background p-1">
              {(
                [
                  { key: "now", label: "Send Now" },
                  { key: "schedule", label: "Schedule for Later" },
                ] as const
              ).map((opt) => (
                <button
                  aria-pressed={sendMode === opt.key}
                  key={opt.key}
                  onClick={() => setSendMode(opt.key)}
                  className={`rounded-md px-3 py-1.5 text-caption font-semibold transition-colors ${
                    sendMode === opt.key ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {sendMode === "schedule" && (
              <AdminInput
                type="datetime-local"
                value={scheduledFor}
                min={minScheduleValue()}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="mt-1 w-fit"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-muted-foreground">To</label>
            <div className="flex w-fit rounded-control-sm border border-border bg-background p-1">
              {(
                [
                  { key: "all", label: "All Active Interns" },
                  { key: "specific", label: "Specific Interns" },
                ] as const
              ).map((opt) => (
                <button
                  aria-pressed={recipientType === opt.key}
                  key={opt.key}
                  onClick={() => setRecipientType(opt.key)}
                  className={`rounded-md px-3 py-1.5 text-caption font-semibold transition-colors ${
                    recipientType === opt.key ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {recipientType === "specific" && (
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-muted-foreground">
                Select interns ({selectedIds.size} selected)
              </label>
              <div className="max-h-56 overflow-y-auto rounded-control-sm border border-border bg-background">
                {interns.length === 0 ? (
                  <p className="p-3 text-caption text-muted-foreground/80">No interns found.</p>
                ) : (
                  interns.map((i) => (
                    <label
                      key={i.id}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 last:border-0 hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(i.id)}
                        onChange={() => toggleSelected(i.id)}
                        className="h-4 w-4 accent-brand"
                      />
                      <span className="text-label text-foreground">{i.name}</span>
                      <span className="text-caption text-muted-foreground/80">{i.email}</span>
                      {!i.active && (
                        <span className="ml-auto text-[11px] font-semibold text-muted-foreground/80">
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
            <label className="text-caption font-semibold text-muted-foreground">Subject</label>
            <AdminInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
              placeholder="An update for the team"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-muted-foreground">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your announcement…"
              className="w-full rounded-control-sm border border-border bg-background p-3 text-label text-foreground placeholder:text-muted-foreground/80 outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton variant="secondary" onClick={sendTest} loading={testing} disabled={!contentValid}>
              <Mail className="h-3.5 w-3.5" />
              Send Test to Myself
            </AdminButton>
            <AdminButton
              onClick={() => void openConfirm()}
              disabled={!valid}
              loading={resolvingRecipients}
              className="ml-auto"
            >
              {sendMode === "now" ? <Send className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
              {sendMode === "now" ? "Send Broadcast" : "Schedule Broadcast"}
            </AdminButton>
          </div>
          <p className="text-caption text-muted-foreground/80">Limited to 5 announcements per hour. Test sends don&apos;t count.</p>
        </div>
      </AdminCard>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        loading={sending}
        title={sendMode === "now" ? "Send this announcement?" : "Schedule this announcement?"}
        body={
          sendMode === "now"
            ? `This will send to ${recipientCount} intern${recipientCount === 1 ? "" : "s"}. Continue?`
            : `This will send to ${recipientCount} intern${recipientCount === 1 ? "" : "s"} on ${
                scheduledFor ? new Date(scheduledFor).toLocaleString() : ""
              }. Continue?`
        }
        confirmLabel={sendMode === "now" ? `Send to ${recipientCount}` : "Schedule"}
        onConfirm={sendBroadcast}
      />
    </div>
  )
}
