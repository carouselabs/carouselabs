"use client"

// /admin/broadcasts — compose + send an email broadcast, plus a history
// table sourced from audit logs (action=SEND_BROADCAST).
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Send, Eye, Mail, CalendarClock, Braces, UserSearch, ListChecks, Repeat, Sparkles, Contact } from "lucide-react"
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
import { renderBroadcastEmailHtml, applyVariables, AVAILABLE_VARIABLES, type VariableValues } from "@/lib/broadcastRender"
import { useToast } from "@/components/admin/Toast"
import { TemplatePicker } from "@/components/admin/TemplatePicker"
import { SEGMENT_TYPES } from "@/lib/segments"
import { CAMPAIGN_DAILY_LIMIT } from "@/lib/campaignRules"
import { isLeadAudience, type LeadAudience } from "@/lib/leadRules"
import { LeadAudienceOptions, useLeadLists } from "@/components/admin/AudiencePicker"
import { SendingPicker } from "@/components/admin/SendingPicker"
import { DEFAULT_SENDING_CHOICE, type SendingChoice } from "@/lib/sendingRules"

// Leads (lib/leads.ts) are offered for campaigns only, so they always go out
// in batches under the daily limit, with their Unsubscribe link.
type Audience = (typeof SEGMENT_TYPES)[number]["value"] | "custom" | LeadAudience
// "campaign": made into a campaign and sent from its own page in batches you pick.
type SendMode = "now" | "schedule" | "campaign"

// datetime-local's `min` — a few minutes out, so a schedule submitted right
// at page-load doesn't immediately fail the "must be in the future" check.
function minScheduleValue(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
  const router = useRouter()
  const [audience, setAudience] = useState<Audience>("all")
  const [segmentValue, setSegmentValue] = useState("")
  const [customList, setCustomList] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [sendMode, setSendMode] = useState<SendMode>("now")
  const [scheduledFor, setScheduledFor] = useState("")
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [resolvingRecipients, setResolvingRecipients] = useState(false)
  const [confirmCount, setConfirmCount] = useState<number | null>(null)
  const leads = useLeadLists()
  // A campaign's service and sender (lib/sendingRules.ts).
  const [sendingChoice, setSendingChoice] = useState<SendingChoice>(DEFAULT_SENDING_CHOICE)

  const [history, setHistory] = useState<AuditLogRow[] | null>(null)

  // Dynamic variables — "Insert Variable" writes {{key}} into whichever
  // field (subject/body) was last focused, at the caret position, via a
  // stored input/textarea ref rather than tracking selection in state
  // (selection offsets go stale the instant the user types elsewhere).
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body")
  const [showVariableMenu, setShowVariableMenu] = useState(false)

  // "Preview As [user]" — resolves real {{variable}} values for one actual
  // user by email, so Preview shows exactly what that person would receive.
  const [previewEmail, setPreviewEmail] = useState("")
  const [previewVariables, setPreviewVariables] = useState<VariableValues | null>(null)
  const [loadingPreviewVars, setLoadingPreviewVars] = useState(false)

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
  const selectedSegment = SEGMENT_TYPES.find((s) => s.value === audience)

  // contentValid gates actions that don't care about the schedule time
  // (Preview, Send Test); valid additionally requires a future time picked
  // when in schedule mode, and gates the actual Send/Schedule button.
  const contentValid =
    subject.trim().length > 0 && body.trim().length > 0 && (audience !== "custom" || recipients.length > 0)
  // The picker's `min` (see minScheduleValue) already steers away from past
  // times in the UI; the API route is the authoritative future-time check.
  const valid = contentValid && (sendMode !== "schedule" || scheduledFor.trim().length > 0)

  const sendRequest = (extra: Record<string, unknown>) =>
    fetch("/api/admin/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        recipients,
        recipientValue: selectedSegment?.needsValue ? segmentValue.trim() || undefined : undefined,
        ...extra,
      }),
    })

  const scheduleRequest = (extra: Record<string, unknown>) =>
    fetch("/api/admin/scheduled-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "user_broadcast",
        subject,
        body,
        recipientType: audience,
        recipientIds: audience === "custom" ? recipients : undefined,
        recipientValue: selectedSegment?.needsValue ? segmentValue.trim() || undefined : undefined,
        scheduledFor: new Date(scheduledFor).toISOString(),
        ...extra,
      }),
    })

  const campaignRequest = (extra: Record<string, unknown>) =>
    fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        recipients,
        recipientValue: selectedSegment?.needsValue ? segmentValue.trim() || undefined : undefined,
        sending: sendingChoice,
        ...extra,
      }),
    })

  const requestFor = (extra: Record<string, unknown>) =>
    sendMode === "now" ? sendRequest(extra) : sendMode === "schedule" ? scheduleRequest(extra) : campaignRequest(extra)

  function insertVariable(key: string) {
    const token = `{{${key}}}`
    const ref = lastFocused === "subject" ? subjectRef.current : bodyRef.current
    const setValue = lastFocused === "subject" ? setSubject : setBody
    if (!ref) {
      // No known caret position (menu opened without focusing a field first)
      // — append rather than silently do nothing.
      setValue((prev) => prev + token)
      setShowVariableMenu(false)
      return
    }
    const start = ref.selectionStart ?? ref.value.length
    const end = ref.selectionEnd ?? ref.value.length
    const next = ref.value.slice(0, start) + token + ref.value.slice(end)
    setValue(next)
    setShowVariableMenu(false)
    // Restore focus + caret after the inserted token on the next tick (the
    // ref's value hasn't re-rendered with `next` yet on this tick).
    requestAnimationFrame(() => {
      ref.focus()
      const caret = start + token.length
      ref.setSelectionRange(caret, caret)
    })
  }

  async function loadPreviewVariables() {
    if (!previewEmail.trim()) {
      toast("Enter an email to preview as", "error")
      return
    }
    setLoadingPreviewVars(true)
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewFor: previewEmail.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to load that user")
      setPreviewVariables(data.variables as VariableValues)
      setShowPreview(true)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to load that user", "error")
    } finally {
      setLoadingPreviewVars(false)
    }
  }

  const sendTest = async () => {
    if (!contentValid) {
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
      toast(
        sendMode === "schedule"
          ? "Fill in subject, body, recipients, and a future time first"
          : "Fill in subject, body, and recipients first",
        "error",
      )
      return
    }
    setResolvingRecipients(true)
    try {
      const res = await requestFor({ dryRun: true })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      if (data.count === 0) {
        toast("No recipients match that selection", "error")
        return
      }
      setConfirmCount(data.count)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't resolve recipients", "error")
    } finally {
      setResolvingRecipients(false)
    }
  }

  const sendBroadcast = async () => {
    setSending(true)
    try {
      const res = await requestFor({})
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      if (sendMode === "campaign") {
        // Nothing is sent yet: the campaign page is where batches go out.
        toast(`Campaign created for ${data.total} people. Pick who to send to first.`, "success")
        router.push(`/admin/broadcasts/campaigns/${data.id}`)
        return
      }
      // Some not sent: say why (Resend's reason, e.g. its daily quota).
      toast(
        sendMode === "now"
          ? `Broadcast sent — ${data.sent} delivered, ${data.failed} failed${data.failed && data.error ? ` (${data.error})` : ""}`
          : `Scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        sendMode === "now" && data.failed ? "error" : "success",
      )
      setConfirmCount(null)
      setSubject("")
      setBody("")
      setCustomList("")
      setScheduledFor("")
      await loadHistory()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Broadcast failed", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    // Compose on the left; what was sent beside it on wide screens.
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem] xl:items-start">
      <div className="flex flex-wrap items-center justify-end gap-4 xl:col-span-2">
        <Link
          href="/admin/broadcasts/writer"
          className="mr-auto inline-flex items-center gap-1.5 rounded-control-sm bg-brand/15 px-3 py-1.5 text-caption font-semibold text-foreground transition-colors hover:bg-brand/25"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Write with AI
        </Link>
        <Link
          href="/admin/broadcasts/campaigns"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ListChecks className="h-3.5 w-3.5" />
          Campaigns
        </Link>
        <Link
          href="/admin/broadcasts/sent"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Repeat className="h-3.5 w-3.5" />
          Sent emails
        </Link>
        <Link
          href="/admin/broadcasts/leads"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Contact className="h-3.5 w-3.5" />
          Leads
        </Link>
        <Link
          href="/admin/scheduled-emails"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          View Scheduled Emails
        </Link>
      </div>

      <AdminCard title="Compose Broadcast" className="min-w-0">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-muted-foreground">When</label>
            <div className="flex w-fit flex-wrap rounded-control-sm border border-border bg-background p-1">
              {(
                [
                  { key: "now", label: "Send Now" },
                  { key: "schedule", label: "Schedule for Later" },
                  { key: "campaign", label: "Campaign: send in batches" },
                ] as const
              ).map((opt) => (
                <button
                  aria-pressed={sendMode === opt.key}
                  key={opt.key}
                  onClick={() => {
                    setSendMode(opt.key)
                    if (opt.key !== "campaign" && isLeadAudience(audience)) setAudience("all")
                  }}
                  className={`rounded-md px-3 py-1.5 text-caption font-semibold transition-colors ${
                    sendMode === opt.key ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {sendMode === "campaign" && (
              <p className="text-caption text-muted-foreground/80">
                Nothing is sent yet. You get a list of everyone it&apos;s for, tick who to send to (or the next 10), and come back
                for the rest. Nobody gets it twice.
              </p>
            )}
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
            <div className="flex flex-wrap items-center gap-2">
              <AdminSelect
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="flex-1 min-w-[160px]"
              >
                {SEGMENT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
                <option value="custom">Custom List</option>
                {sendMode === "campaign" && <LeadAudienceOptions leads={leads} />}
              </AdminSelect>
              {selectedSegment?.needsValue && (
                <AdminInput
                  type="number"
                  min={1}
                  value={segmentValue}
                  onChange={(e) => setSegmentValue(e.target.value)}
                  placeholder={selectedSegment.valuePlaceholder}
                  className="w-32"
                />
              )}
            </div>
            {selectedSegment?.needsValue && (
              <p className="text-caption text-muted-foreground/80">Defaults to {selectedSegment.valuePlaceholder} if left blank.</p>
            )}
          </div>

          {sendMode === "campaign" && (
            <SendingPicker idPrefix="composer-sending" value={sendingChoice} onChange={setSendingChoice} forLeads={isLeadAudience(audience)} />
          )}

          {audience === "custom" && (
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-muted-foreground">
                Emails (comma-separated)
              </label>
              <textarea
                value={customList}
                onChange={(e) => setCustomList(e.target.value)}
                rows={2}
                placeholder="user1@email.com, user2@email.com"
                className="w-full rounded-control-sm border border-border bg-background p-3 text-label text-foreground placeholder:text-muted-foreground/80 outline-none focus:border-brand"
              />
              <p className="text-caption text-muted-foreground/80">{parseCustomList(customList).length} email(s) parsed</p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-caption font-semibold text-muted-foreground">Subject</label>
              <div className="flex items-center gap-3">
                <TemplatePicker
                  currentSubject={subject}
                  currentBody={body}
                  onLoad={(s, b) => {
                    setSubject(s)
                    setBody(b)
                  }}
                />
                <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVariableMenu((v) => !v)}
                  className="inline-flex items-center gap-1 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Braces className="h-3 w-3" />
                  Insert Variable
                </button>
                {showVariableMenu && (
                  <div className="absolute right-0 z-10 mt-1 w-64 rounded-card border border-border bg-surface shadow-dialog py-1">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-muted transition-colors"
                      >
                        <span className="text-caption font-medium text-foreground">{`{{${v.key}}}`}</span>
                        <span className="text-caption text-muted-foreground/80">{v.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
            <AdminInput
              ref={subjectRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setLastFocused("subject")}
              className="w-full"
              placeholder="What's new at CarouseLabs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-muted-foreground">
              Body <span className="font-normal normal-case text-muted-foreground/80">— **bold**, *italic*, [link](https://…)</span>
            </label>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setLastFocused("body")}
              rows={8}
              placeholder="Write your announcement…"
              className="w-full rounded-control-sm border border-border bg-background p-3 text-label text-foreground placeholder:text-muted-foreground/80 outline-none focus:border-brand"
            />
            <p className="text-caption text-muted-foreground/80">
              Use <code className="text-muted-foreground">{"{{firstName}}"}</code> etc. — see Insert
              Variable above for every available field. Unresolved variables (e.g. a custom-list
              email with no account) are sent as literal text.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <label className="text-caption font-semibold text-muted-foreground">
                Preview As (real user email)
              </label>
              <div className="flex items-center gap-2">
                <AdminInput
                  value={previewEmail}
                  onChange={(e) => setPreviewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="flex-1"
                />
                <AdminButton
                  variant="secondary"
                  onClick={() => void loadPreviewVariables()}
                  loading={loadingPreviewVars}
                  disabled={!contentValid}
                >
                  <UserSearch className="h-3.5 w-3.5" />
                  Preview As
                </AdminButton>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton
              variant="secondary"
              onClick={() => {
                setPreviewVariables(null)
                setShowPreview(true)
              }}
              disabled={!contentValid}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </AdminButton>
            <AdminButton variant="secondary" onClick={sendTest} loading={testing} disabled={!contentValid}>
              <Mail className="h-3.5 w-3.5" />
              Send Test to Admin
            </AdminButton>
            <AdminButton
              onClick={() => void openConfirm()}
              disabled={!valid}
              loading={resolvingRecipients}
              className="ml-auto"
            >
              {sendMode === "now" ? (
                <Send className="h-3.5 w-3.5" />
              ) : sendMode === "schedule" ? (
                <CalendarClock className="h-3.5 w-3.5" />
              ) : (
                <ListChecks className="h-3.5 w-3.5" />
              )}
              {sendMode === "now" ? "Send Broadcast" : sendMode === "schedule" ? "Schedule Broadcast" : "Create Campaign"}
            </AdminButton>
          </div>
          <p className="text-caption text-muted-foreground/80">
            {sendMode === "campaign"
              ? `Campaigns aren't limited per hour: up to ${CAMPAIGN_DAILY_LIMIT} emails a day go out, in batches you pick.`
              : "Limited to one real broadcast per hour. Test sends don't count."}
          </p>
        </div>
      </AdminCard>

      <AdminCard title="Sent Broadcasts" className="min-w-0 xl:sticky xl:top-0">
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
                    <td className={`${tableCls.td} max-w-[420px] truncate text-muted-foreground`} title={h.details}>
                      {h.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewVariables ? `Email Preview — as ${previewEmail.trim()}` : "Email Preview"}
      >
        <div
          className="max-h-[60vh] overflow-y-auto rounded-control-sm bg-white"
          dangerouslySetInnerHTML={{
            __html: previewVariables
              ? renderBroadcastEmailHtml(
                  applyVariables(subject, previewVariables),
                  applyVariables(body, previewVariables),
                )
              : renderBroadcastEmailHtml(subject, body),
          }}
        />
      </Modal>

      <ConfirmModal
        open={confirmCount !== null}
        onClose={() => setConfirmCount(null)}
        loading={sending}
        title={
          sendMode === "now" ? "Send this broadcast?" : sendMode === "schedule" ? "Schedule this broadcast?" : "Create this campaign?"
        }
        body={
          sendMode === "now"
            ? `This will email ${confirmCount ?? 0} recipient${confirmCount === 1 ? "" : "s"}. This can't be undone.`
            : sendMode === "schedule"
              ? `This will email ${confirmCount ?? 0} recipient${confirmCount === 1 ? "" : "s"} on ${
                  scheduledFor ? new Date(scheduledFor).toLocaleString() : ""
                }.`
              : `A campaign for ${confirmCount ?? 0} ${confirmCount === 1 ? "person" : "people"}. Nothing is sent yet: you'll pick who gets it, a batch at a time.`
        }
        confirmLabel={sendMode === "now" ? `Send to ${confirmCount ?? 0}` : sendMode === "schedule" ? "Schedule" : "Create campaign"}
        onConfirm={sendBroadcast}
      />
    </div>
  )
}
