"use client"

// /admin/broadcasts/campaigns/[id] — one campaign: the email, everyone on its
// list with whether they've had it, and sending in batches you pick. Tick
// people (or "Select next 10 not sent"), Send, and they're marked sent; come
// back later for the next batch. The server never sends anyone the email
// twice and stops at the day's limit (lib/campaigns.ts).
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Archive, ArchiveRestore, ArrowLeft, Check, Eye, ListChecks, Mail, Repeat, Search, Send, UserPlus, X } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  ConfirmModal,
  Modal,
  Spinner,
  fmtDate,
  fmtDateTime,
  tableCls,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { CAMPAIGN_DAILY_LIMIT, DAY_RESETS_AT, NEXT_BATCH_SIZE, campaignEngagement, canSend, nextUnsent, percentOf, type CampaignProgress } from "@/lib/campaignRules"
import { SeenStatus } from "./SeenStatus"
import { UseAgainDialog } from "./UseAgainDialog"
import { AddPeopleDialog } from "./AddPeopleDialog"
import { ProgressBar } from "./CampaignsList"
import { RECIPIENT_STATUS, audienceLabel } from "./campaignLabels"

type Recipient = {
  id: string
  email: string
  name: string | null
  userId: string | null
  status: string
  sentAt: string | null
  error: string | null
  // Seen and clicked (lib/emailTracking.ts).
  openedAt: string | null
  openCount: number
  clickedAt: string | null
  clickCount: number
}

type Campaign = {
  id: string
  subject: string
  body: string
  audience: string
  audienceValue: string | null
  status: string
  design: unknown
  createdBy: string
  createdAt: string
  recipients: Recipient[]
  progress: CampaignProgress
  allowance: { limit: number; sentToday: number; left: number }
}

type Filter = "all" | "pending" | "sent" | "failed" | "seen" | "unseen"
const PAGE_SIZE = 100

export function CampaignView({ id }: { id: string }) {
  const { toast } = useToast()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [testing, setTesting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  // Use again (a new campaign, the writer, one person) or Add people to this one.
  const [reuse, setReuse] = useState<null | "again" | "add">(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't load this campaign")
      setCampaign(data.campaign)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load this campaign")
    }
  }, [id])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch, not synchronously
  useEffect(() => void load(), [load])

  const recipients = useMemo(() => campaign?.recipients ?? [], [campaign])
  const engagement = useMemo(() => campaignEngagement(recipients), [recipients])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipients.filter(
      (r) =>
        (filter === "all" ||
          r.status === filter ||
          (filter === "pending" && r.status === "sending") ||
          (filter === "seen" && r.status === "sent" && !!r.openedAt) ||
          (filter === "unseen" && r.status === "sent" && !r.openedAt)) &&
        (!q || r.email.includes(q) || (r.name ?? "").toLowerCase().includes(q)),
    )
  }, [recipients, filter, query])
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (loadError) {
    return (
      <AdminCard>
        <p className="text-label text-danger">{loadError}</p>
      </AdminCard>
    )
  }
  if (!campaign) return <Spinner label="Loading campaign…" />

  const { progress, allowance } = campaign
  const archived = campaign.status === "archived"
  const count = selected.size
  const overLimit = count > allowance.left

  const toggle = (rid: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rid)) next.delete(rid)
      else next.add(rid)
      return next
    })

  const selectNext = () => {
    const room = Math.min(NEXT_BATCH_SIZE, Math.max(0, allowance.left - selected.size))
    if (room === 0) {
      toast(allowance.left === 0 ? `Today's limit is used up. It resets at ${DAY_RESETS_AT}.` : `${allowance.left} can go today, and that many are already ticked.`, "error")
      return
    }
    const picked = nextUnsent(recipients, selected, room)
    if (picked.length === 0) {
      toast("Everyone has been sent it already (failed ones are under Failed).", "success")
      return
    }
    setSelected((prev) => new Set([...prev, ...picked]))
  }

  const sendableOnPage = shown.filter((r) => canSend(r.status))
  const allOnPageTicked = sendableOnPage.length > 0 && sendableOnPage.every((r) => selected.has(r.id))
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const r of sendableOnPage) {
        if (allOnPageTicked) next.delete(r.id)
        else next.add(r.id)
      }
      return next
    })

  async function send() {
    setSending(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds: [...selected] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't send")
      const parts = [`${data.sent} sent`]
      if (data.failed) parts.push(`${data.failed} failed${data.error ? ` (${data.error})` : ""}`)
      if (data.skipped) parts.push(`${data.skipped} skipped (already sent)`)
      toast(parts.join(" · "), data.failed ? "error" : "success")
      setSelected(new Set())
      setConfirming(false)
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send", "error")
      setConfirming(false)
    } finally {
      setSending(false)
    }
  }

  async function openPreview() {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/preview`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't load the preview")
      setPreviewHtml(data.html)
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't load the preview", "error")
    } finally {
      setLoadingPreview(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    try {
      // Only to the signed-in admin, personalized for them; nobody on the list is marked.
      const res = await fetch(`/api/admin/campaigns/${id}/test`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Test send failed")
      toast(`Test sent to ${data.sentTo}`, "success")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Test send failed", "error")
    } finally {
      setTesting(false)
    }
  }

  async function setArchived(next: boolean) {
    setArchiving(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "archived" : "active" }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't update")
      setSelected(new Set())
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update", "error")
    } finally {
      setArchiving(false)
    }
  }

  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "All", n: progress.total },
    { key: "pending", label: "Not sent", n: progress.pending + progress.sending },
    { key: "sent", label: "Sent", n: progress.sent },
    { key: "failed", label: "Failed", n: progress.failed },
    { key: "seen", label: "Seen", n: engagement.seen },
    { key: "unseen", label: "Not seen", n: engagement.sent - engagement.seen },
  ]

  return (
    <div className="space-y-6">
      <Link
        href="/admin/broadcasts/campaigns"
        className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All campaigns
      </Link>

      {reuse === "again" && <UseAgainDialog source={`campaign:${campaign.id}`} subject={campaign.subject} onClose={() => setReuse(null)} />}
      {reuse === "add" && <AddPeopleDialog campaignId={campaign.id} onClose={() => setReuse(null)} onAdded={() => void load()} />}

      {/* The email and how far it's got */}
      <AdminCard>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lead font-bold text-foreground">{campaign.subject}</h2>
              <p className="mt-1 text-caption text-muted-foreground">
                {audienceLabel(campaign.audience, campaign.audienceValue)} · {progress.total} people · created{" "}
                {fmtDate(campaign.createdAt)} by {campaign.createdBy}
                {campaign.design != null && <span className="font-medium text-brand"> · Written with AI</span>}
                {archived && <span className="font-medium text-warning"> · Archived</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="secondary" onClick={() => void openPreview()} loading={loadingPreview}>
                <Eye aria-hidden />
                Preview
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => void sendTest()} loading={testing}>
                <Mail aria-hidden />
                Send test to me
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setReuse("add")} disabled={archived}>
                <UserPlus aria-hidden />
                Add people
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setReuse("again")}>
                <Repeat aria-hidden />
                Use again
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => void setArchived(!archived)} loading={archiving}>
                {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {archived ? "Restore" : "Archive"}
              </AdminButton>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-label tabular-nums">
              {progress.complete ? (
                <span className="font-semibold text-success">Everyone has it: all {progress.total} sent</span>
              ) : (
                <span className="text-foreground">
                  <span className="font-semibold">{progress.sent}</span> of {progress.total} sent
                  {progress.failed > 0 && <span className="text-danger"> · {progress.failed} failed</span>}
                  <span className="text-muted-foreground"> · {progress.pending + progress.sending} not sent yet</span>
                </span>
              )}
              <span className="text-caption text-muted-foreground">
                Today: <span className="font-medium text-foreground">{allowance.left}</span> of {allowance.limit} campaign emails left
              </span>
            </div>
            <ProgressBar progress={progress} className="h-2" />
            {engagement.sent > 0 && (
              <p className="text-label tabular-nums text-foreground" aria-label="Seen and clicked">
                Seen by <span className="font-semibold">{engagement.seen}</span> of {engagement.sent} sent ({percentOf(engagement.seen, engagement.sent)})
                <span className="text-muted-foreground"> · </span>
                Clicked by <span className="font-semibold">{engagement.clicked}</span> ({percentOf(engagement.clicked, engagement.sent)})
                <span className="block text-caption text-muted-foreground/80">
                  Seen is a good guess: some email apps load the email by themselves, others block it. A click is certain.
                </span>
              </p>
            )}
            <p className="text-caption text-muted-foreground/80">
              Resend&apos;s free plan sends 100 emails a day for the whole account, so campaigns stop at {CAMPAIGN_DAILY_LIMIT} a day
              and leave the rest for automatic emails (welcome, credits, posts). The day resets at {DAY_RESETS_AT}.
            </p>
          </div>
        </div>
      </AdminCard>

      {/* Picking and sending a batch */}
      {!archived && !progress.complete && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface/95 px-4 py-3 shadow-card backdrop-blur-sm">
          <AdminButton variant="secondary" onClick={selectNext} disabled={progress.pending === 0}>
            <ListChecks aria-hidden />
            Select next {NEXT_BATCH_SIZE} not sent
          </AdminButton>
          {count > 0 && (
            <AdminButton variant="ghost" onClick={() => setSelected(new Set())}>
              <X aria-hidden />
              Clear
            </AdminButton>
          )}
          <span className={`text-label tabular-nums ${overLimit ? "text-danger" : "text-muted-foreground"}`}>
            {count === 0
              ? "Tick people below, or select the next 10."
              : overLimit
                ? `${count} ticked: only ${allowance.left} can go today`
                : `${count} ticked`}
          </span>
          <AdminButton onClick={() => setConfirming(true)} disabled={count === 0 || overLimit} className="ml-auto">
            <Send aria-hidden />
            Send to {count}
          </AdminButton>
        </div>
      )}

      {/* Everyone on the list */}
      <AdminCard>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-fit rounded-control-sm border border-border bg-background p-1" role="group" aria-label="Show">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={filter === t.key}
                  onClick={() => {
                    setFilter(t.key)
                    setPage(0)
                  }}
                  className={`rounded-md px-3 py-1.5 text-caption font-semibold tabular-nums transition-colors ${
                    filter === t.key ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} {t.n}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <AdminInput
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder="Search name or email"
                aria-label="Search people"
                className="w-full pl-8"
              />
            </div>
          </div>

          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={`${tableCls.th} w-10`}>
                    <input
                      type="checkbox"
                      aria-label="Tick everyone not yet sent on this page"
                      checked={allOnPageTicked}
                      disabled={archived || sendableOnPage.length === 0}
                      onChange={togglePage}
                      className="h-4 w-4 accent-brand"
                    />
                  </th>
                  <th className={tableCls.th}>Name</th>
                  <th className={tableCls.th}>Email</th>
                  <th className={tableCls.th}>Status</th>
                  <th className={tableCls.th}>When / why</th>
                  <th className={tableCls.th}>Seen</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={6}>
                      Nobody here.
                    </td>
                  </tr>
                )}
                {shown.map((r) => {
                  const status = RECIPIENT_STATUS[r.status] ?? RECIPIENT_STATUS.pending
                  const sendable = canSend(r.status) && !archived
                  return (
                    <tr key={r.id} className={tableCls.row}>
                      <td className={tableCls.td}>
                        {r.status === "sent" ? (
                          <Check className="h-4 w-4 text-success" aria-label="Sent" />
                        ) : (
                          <input
                            type="checkbox"
                            aria-label={`Tick ${r.email}`}
                            checked={selected.has(r.id)}
                            disabled={!sendable}
                            onChange={() => toggle(r.id)}
                            className="h-4 w-4 accent-brand"
                          />
                        )}
                      </td>
                      <td className={`${tableCls.td} max-w-[200px] truncate`}>{r.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className={`${tableCls.td} max-w-[260px] truncate`}>{r.email}</td>
                      <td className={tableCls.td}>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className={`${tableCls.td} max-w-[320px] truncate text-muted-foreground`} title={r.error ?? undefined}>
                        {r.status === "sent" && r.sentAt ? fmtDateTime(r.sentAt) : r.status === "failed" ? r.error : ""}
                      </td>
                      <td className={`${tableCls.td} text-caption`}>{r.status === "sent" && <SeenStatus {...r} />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <span className="tabular-nums">
                {page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {visible.length}
              </span>
              <div className="flex gap-2">
                <AdminButton variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  Previous
                </AdminButton>
                <AdminButton variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1}>
                  Next
                </AdminButton>
              </div>
            </div>
          )}
        </div>
      </AdminCard>

      <Modal open={previewHtml !== null} onClose={() => setPreviewHtml(null)} title="Email preview" wide>
        <iframe
          title="Email preview"
          srcDoc={previewHtml ?? ""}
          className="h-[65vh] w-full rounded-control-sm border-0 bg-white"
          sandbox=""
        />
      </Modal>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        loading={sending}
        title={`Send to ${count} ${count === 1 ? "person" : "people"}?`}
        body={`They'll get "${campaign.subject}" now. This can't be undone. Anyone who already has it is skipped.`}
        confirmLabel={`Send to ${count}`}
        onConfirm={() => void send()}
      />
    </div>
  )
}
