"use client"

// Engage → one user. The strip at the top answers "what can this person do,
// and why?" at a glance; tabs hold the detail; every action asks for a reason
// and confirms anything that takes access away.
import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Gift, LogOut, PauseCircle, PlayCircle, RotateCcw, SlidersHorizontal, X } from "lucide-react"
import { AdminLineChart } from "@/components/admin/charts"
import { AdminButton, AdminInput, AdminSelect, Modal, fmtDate, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { ENGAGE_FEATURES, LINKEDIN_FEATURES, X_FEATURES, FEATURE_LABELS, USAGE_KINDS, USAGE_KIND_LABELS, formatLimit } from "@/lib/engage/features"

// What a history row was, in the admin's words.
const GENERATION_LABELS: Record<string, string> = {
  comment: "Comment",
  reply: "Reply",
  connection_note: "Connection note",
  message: "Message",
  x_reply: "X reply",
  x_message: "X message",
}
import { GRANT_DURATIONS, GRANT_DURATION_LABELS, type GrantDuration } from "@/lib/engage/grants"
import type { EngageUserDetail as Detail } from "@/lib/engage/userDetail"
import { AccessEditor } from "./AccessEditor"
import { GrantAccessModal } from "./GrantAccessForm"
import {
  EmptyState,
  ErrorState,
  FEATURE_COLORS,
  Pill,
  SkeletonBlock,
  Tabs,
  adminSend,
  fmtNumber,
  fmtRelative,
  useAdminApi,
} from "./shared"

// The API sends dates as ISO strings.
type Jsonify<T> = T extends Date ? string : T extends Array<infer U> ? Jsonify<U>[] : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T
type UserDetail = Jsonify<Detail>

type Tab = "access" | "usage" | "activity" | "browsers" | "notes"

// A dialog that asks why before doing something: pause, reset, sign out,
// revoke, extend. `danger` actions say what they take away.
function ReasonDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  children,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  danger?: boolean
  children?: ReactNode
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await onConfirm(reason)
            setReason("")
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="text-[12.5px] leading-relaxed text-[#B0B0B0]">{body}</div>
        {children}
        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-[#B0B0B0]">Reason (kept in the audit log)</span>
          <AdminInput required minLength={3} maxLength={500} autoFocus className="w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-[12.5px] text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant={danger ? "danger" : "primary"} loading={busy}>
            {confirmLabel}
          </AdminButton>
        </div>
      </form>
    </Modal>
  )
}

function SummaryCell({ label, children, tone }: { label: string; children: ReactNode; tone?: "warn" | "bad" }) {
  return (
    <div className="min-w-[120px] flex-1 px-4 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A8A8A]">{label}</div>
      <div className={`mt-1 text-[13.5px] font-semibold ${tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-white"}`}>{children}</div>
    </div>
  )
}

export function EngageUserDetail({ userId }: { userId: string }) {
  const { toast } = useToast()
  const { data, error, loading, reload } = useAdminApi<UserDetail>(`/api/admin/engage/users/${userId}`)
  const [tab, setTab] = useState<Tab>("access")
  const [dialog, setDialog] = useState<null | "grant" | "edit" | "pause" | "resume" | "reset" | "signout">(null)
  const [grantAction, setGrantAction] = useState<null | { id: string; kind: "revoke" | "extend" }>(null)
  const [extendBy, setExtendBy] = useState<GrantDuration>("30d")
  const [resetScope, setResetScope] = useState<"today" | "month" | "free">("today")
  const [signOutToken, setSignOutToken] = useState<string | null>(null)

  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data || !data.access) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-4" aria-busy="true" aria-label="Loading user">
        <SkeletonBlock className="h-8 w-72" />
        <SkeletonBlock className="h-[76px]" />
        <SkeletonBlock className="h-[360px]" />
      </div>
    )
  }

  const { user, access } = data
  const done = (message: string) => {
    setDialog(null)
    setGrantAction(null)
    setSignOutToken(null)
    toast(message, "success")
    reload()
  }

  const accessLabel =
    access.source === "subscription" ? "Paid ($15/month)" : access.source === "grant" ? "Free access (granted)" : access.source === "testing" ? "Testing (paywall off)" : "Free plan"
  const expires =
    access.source === "grant"
      ? access.activeGrant?.endsAt
        ? fmtDate(access.activeGrant.endsAt)
        : "Never (lifetime)"
      : access.source === "subscription"
        ? data.subscription?.status === "cancelled"
          ? `Ends ${fmtDate(data.subscription.endsAt)}`
          : data.subscription?.renewsAt
            ? `Renews ${fmtDate(data.subscription.renewsAt)}`
            : "—"
        : "—"
  const monthUse = (f: (typeof ENGAGE_FEATURES)[number]) => data.usage.historyMonth[f] ?? 0
  const activeSessions = data.sessions.filter((s) => !s.revokedAt)

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link href="/admin/engage/users" className="inline-flex items-center gap-1 text-[12px] text-[#8A8A8A] hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Engage users
          </Link>
          <h1 className="truncate text-[18px] font-semibold tracking-tight text-white">{user.name ?? user.email}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8A8A8A]">
            {user.name && <span>{user.email}</span>}
            <button
              className="inline-flex items-center gap-1 font-mono text-[11.5px] hover:text-white"
              onClick={() => navigator.clipboard.writeText(user.id).then(() => toast("User ID copied", "success"))}
              title="Copy user ID"
            >
              {user.id}
              <Copy className="h-3 w-3" aria-hidden />
            </button>
            <span>Joined {fmtDate(user.createdAt)}</span>
            <Link href={`/admin/users/${user.id}`} className="text-[#A78BFA] hover:underline">
              Website account
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminButton onClick={() => setDialog("grant")}>
            <Gift className="h-3.5 w-3.5" aria-hidden />
            Grant free access
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => setDialog("edit")}>
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Access & limits
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => setDialog("reset")}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset usage
          </AdminButton>
          {access.status === "suspended" ? (
            <AdminButton variant="secondary" onClick={() => setDialog("resume")}>
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
              Resume Engage
            </AdminButton>
          ) : (
            <AdminButton variant="danger" onClick={() => setDialog("pause")} disabled={access.status === "account_suspended"}>
              <PauseCircle className="h-3.5 w-3.5" aria-hidden />
              Pause Engage
            </AdminButton>
          )}
        </div>
      </div>

      {/* The answer in seconds: status, access, expiry, and each feature's use against its limit. */}
      <section aria-label="Access summary" className="flex flex-wrap divide-x divide-[#2A2A2A] rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
        <SummaryCell label="Status" tone={access.status === "active" ? undefined : "bad"}>
          {access.status === "active" ? "Active" : access.status === "suspended" ? "Engage paused" : "Account suspended"}
        </SummaryCell>
        <SummaryCell label="Access">{accessLabel}</SummaryCell>
        <SummaryCell label="Expires">{expires}</SummaryCell>
        {access.access === "free" && (
          <SummaryCell label="Free generations" tone={access.freeRemaining === 0 ? "warn" : undefined}>
            {access.freeUsed} / {access.freeGenerations.effective}
          </SummaryCell>
        )}
        {ENGAGE_FEATURES.map((f) => (
          <SummaryCell key={f} label={`${FEATURE_LABELS[f]} · month`} tone={access.features[f].enabled ? undefined : "bad"}>
            {access.features[f].enabled ? (
              <span className="tabular-nums">
                {fmtNumber(monthUse(f))} / {formatLimit(access.limits[`${f}.month`].effective)}
              </span>
            ) : access.features[f].paused ? (
              "Paused for everyone"
            ) : (
              "Off"
            )}
          </SummaryCell>
        ))}
        <SummaryCell label="Daily cap">{formatLimit(access.limits.dailyCap.effective)}</SummaryCell>
      </section>

      {access.status === "suspended" && data.control?.suspendReason && (
        <p className="rounded-lg border border-[#5A2030] bg-[#2A1218] px-4 py-2.5 text-[12.5px] text-red-200">
          Paused by {data.control.suspendedBy} on {fmtDate(data.control.suspendedAt)}: {data.control.suspendReason}
        </p>
      )}

      <Tabs<Tab>
        label="User sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "access", label: "Access" },
          { value: "usage", label: "Usage" },
          { value: "activity", label: "Activity" },
          { value: "browsers", label: "Browsers", count: activeSessions.length },
          { value: "notes", label: "Notes & tags", count: data.notes.length },
        ]}
      />

      {tab === "access" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <header className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-white">Features and limits</h2>
              <AdminButton variant="ghost" onClick={() => setDialog("edit")}>
                Edit
              </AdminButton>
            </header>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                  <th className="px-4 py-2 font-semibold">Setting</th>
                  <th className="px-2 py-2 font-semibold">Plan</th>
                  <th className="px-2 py-2 font-semibold">Override</th>
                  <th className="px-4 py-2 text-right font-semibold">Effective</th>
                </tr>
              </thead>
              <tbody className="text-[#D0D0D0]">
                {ENGAGE_FEATURES.map((f) => (
                  <tr key={f} className="border-t border-[#232323]">
                    <td className="px-4 py-2">{FEATURE_LABELS[f]}</td>
                    <td className="px-2 py-2 text-[#8A8A8A]">On</td>
                    <td className="px-2 py-2">{access.features[f].override ? <Pill tone="amber">{access.features[f].override === "on" ? "On" : "Off"}</Pill> : <span className="text-[#8A8A8A]">—</span>}</td>
                    <td className="px-4 py-2 text-right font-medium">{access.features[f].enabled ? "On" : <span className="text-red-300">{access.features[f].paused ? "Paused for everyone" : "Off"}</span>}</td>
                  </tr>
                ))}
                {(Object.keys(access.limits) as Array<keyof typeof access.limits>).map((k) => (
                  <tr key={k} className="border-t border-[#232323]">
                    <td className="px-4 py-2">{k === "dailyCap" ? "Daily cap (rolling 24 h)" : `${FEATURE_LABELS[k.split(".")[0] as (typeof ENGAGE_FEATURES)[number]]} / ${k.split(".")[1]}`}</td>
                    <td className="px-2 py-2 tabular-nums text-[#8A8A8A]">{formatLimit(access.limits[k].plan)}</td>
                    <td className="px-2 py-2 tabular-nums">{access.limits[k].override === null ? <span className="text-[#8A8A8A]">—</span> : <Pill tone="amber">{formatLimit(access.limits[k].override)}</Pill>}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatLimit(access.limits[k].effective)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[#232323]">
                  <td className="px-4 py-2">Free generations</td>
                  <td className="px-2 py-2 tabular-nums text-[#8A8A8A]">{access.freeGenerations.plan}</td>
                  <td className="px-2 py-2 tabular-nums">{access.freeGenerations.override === null ? <span className="text-[#8A8A8A]">—</span> : <Pill tone="amber">{access.freeGenerations.override}</Pill>}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{access.freeGenerations.effective}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="space-y-4">
            <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
              <header className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-white">Free access grants</h2>
                <AdminButton variant="ghost" onClick={() => setDialog("grant")}>
                  Grant
                </AdminButton>
              </header>
              {data.grants.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12.5px] text-[#8A8A8A]">No grants. Free access you give appears here.</p>
              ) : (
                <ul className="divide-y divide-[#232323]">
                  {data.grants.map((g) => (
                    <li key={g.id} className="space-y-1 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Pill tone={g.state === "active" ? "violet" : g.state === "revoked" ? "red" : "gray"}>
                            {g.state === "active" ? "Active" : g.state === "revoked" ? "Revoked" : g.state === "expired" ? "Expired" : "Scheduled"}
                          </Pill>
                          <span className="text-[12.5px] text-white">{g.endsAt ? `Until ${fmtDate(g.endsAt)}` : "Lifetime"}</span>
                        </div>
                        {g.state === "active" && (
                          <div className="flex gap-1">
                            {g.endsAt && (
                              <AdminButton variant="ghost" onClick={() => setGrantAction({ id: g.id, kind: "extend" })}>
                                Extend
                              </AdminButton>
                            )}
                            <AdminButton variant="ghost" onClick={() => setGrantAction({ id: g.id, kind: "revoke" })}>
                              Revoke
                            </AdminButton>
                          </div>
                        )}
                      </div>
                      <p className="text-[12px] text-[#B0B0B0]">“{g.reason}”</p>
                      <p className="text-[11.5px] text-[#8A8A8A]">
                        Granted by {g.grantedBy} on {fmtDate(g.createdAt)}
                        {g.revokedAt && ` · revoked by ${g.revokedBy} on ${fmtDate(g.revokedAt)}${g.revokeReason ? `: ${g.revokeReason}` : ""}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
              <h2 className="mb-2 text-[13px] font-semibold text-white">Subscription (Lemon Squeezy)</h2>
              {data.subscription ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                  <dt className="text-[#8A8A8A]">Status</dt>
                  <dd className="text-white">{data.subscription.status}</dd>
                  <dt className="text-[#8A8A8A]">Started</dt>
                  <dd className="text-white">{fmtDate(data.subscription.createdAt)}</dd>
                  <dt className="text-[#8A8A8A]">{data.subscription.status === "cancelled" ? "Ends" : "Renews"}</dt>
                  <dd className="text-white">{fmtDate(data.subscription.status === "cancelled" ? data.subscription.endsAt : data.subscription.renewsAt)}</dd>
                </dl>
              ) : (
                <p className="text-[12.5px] text-[#8A8A8A]">Never subscribed. Billing is separate from free access you grant.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === "usage" && (
        <div className="space-y-4">
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h2 className="mb-3 text-[13px] font-semibold text-white">Generations per day, last 30 days</h2>
            <AdminLineChart
              data={data.usage.series as Record<string, unknown>[]}
              xKey="date"
              height={220}
              // X's lines only for someone who used the X extension in these 30 days.
              series={[
                ...LINKEDIN_FEATURES,
                ...X_FEATURES.filter((f) => data.usage.series.some((p) => Number((p as Record<string, unknown>)[f] ?? 0) > 0)),
              ].map((f) => ({ key: f, label: FEATURE_LABELS[f], color: FEATURE_COLORS[f] }))}
            />
          </section>
          <section className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                  <th className="px-4 py-2.5 font-semibold">Kind</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Today</th>
                  <th className="px-3 py-2.5 text-right font-semibold">This month</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Month limit</th>
                </tr>
              </thead>
              <tbody className="text-[#D0D0D0]">
                {USAGE_KINDS.map((k) => {
                  const isFeature = (ENGAGE_FEATURES as readonly string[]).includes(k)
                  const today = data.usage.counters.day[k] ?? (isFeature ? data.usage.historyToday[k as (typeof ENGAGE_FEATURES)[number]] : undefined)
                  const month = data.usage.counters.month[k] ?? (isFeature ? data.usage.historyMonth[k as (typeof ENGAGE_FEATURES)[number]] : undefined)
                  return (
                    <tr key={k} className="border-t border-[#232323]">
                      <td className="px-4 py-2">{USAGE_KIND_LABELS[k]}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(today ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(month ?? 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-[#8A8A8A]">
                        {isFeature ? formatLimit(access.limits[`${k as (typeof ENGAGE_FEATURES)[number]}.month`].effective) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="border-t border-[#232323] px-4 py-2 text-[11.5px] text-[#8A8A8A]">
              Counts every generation allowed since this admin went live; before that, generations kept in history. Days are UTC.
            </p>
          </section>
        </div>
      )}

      {tab === "activity" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <h2 className="border-b border-[#2A2A2A] px-4 py-3 text-[13px] font-semibold text-white">Recent generations</h2>
            {data.activity.generations.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-[#8A8A8A]">Nothing generated yet.</p>
            ) : (
              <ul className="divide-y divide-[#232323]">
                {data.activity.generations.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[12.5px]">
                    <span className="text-[#D0D0D0]">
                      {GENERATION_LABELS[h.kind] ?? "Comment"}
                      {h.profileName && <span className="text-[#8A8A8A]"> · {h.profileName}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[#8A8A8A]">
                      {h.action !== "NONE" && <Pill tone="green">{h.action === "COPIED" ? "Copied" : "Inserted"}</Pill>}
                      {fmtDateTime(h.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-[#232323] px-4 py-2 text-[11.5px] text-[#8A8A8A]">What was written isn&apos;t shown here, only that it happened.</p>
          </section>
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <h2 className="border-b border-[#2A2A2A] px-4 py-3 text-[13px] font-semibold text-white">Admin changes</h2>
            {data.activity.admin.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-[#8A8A8A]">No admin has changed this user.</p>
            ) : (
              <ul className="divide-y divide-[#232323]">
                {data.activity.admin.map((a) => (
                  <li key={a.id} className="space-y-0.5 px-4 py-2.5 text-[12.5px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-white">{a.details}</span>
                      <span className="shrink-0 text-[#8A8A8A]">{fmtDateTime(a.createdAt)}</span>
                    </div>
                    <div className="text-[11.5px] text-[#8A8A8A]">
                      {a.adminEmail}
                      {a.reason && ` · “${a.reason}”`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {data.errors.length > 0 && (
            <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] lg:col-span-2">
              <h2 className="border-b border-[#2A2A2A] px-4 py-3 text-[13px] font-semibold text-white">Errors the extension reported</h2>
              <ul className="divide-y divide-[#232323]">
                {data.errors.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 px-4 py-2 text-[12.5px]">
                    <span className="text-[#D0D0D0]">
                      <span className="font-mono text-[11.5px] text-amber-300">{e.code}</span> {e.message}
                    </span>
                    <span className="shrink-0 text-[#8A8A8A]">
                      {e.extensionVersion ?? "?"} · {fmtDateTime(e.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === "browsers" && (
        <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
          <header className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-white">Signed-in browsers</h2>
            {activeSessions.length > 0 && (
              <AdminButton variant="ghost" onClick={() => setDialog("signout")}>
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign out everywhere
              </AdminButton>
            )}
          </header>
          {data.sessions.length === 0 ? (
            <EmptyState title="Never signed in to the extension" />
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                  <th className="px-4 py-2 font-semibold">Browser</th>
                  <th className="px-3 py-2 font-semibold">Version</th>
                  <th className="px-3 py-2 font-semibold">Signed in</th>
                  <th className="px-3 py-2 font-semibold">Last used</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="text-[#D0D0D0]">
                {data.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-[#232323]">
                    <td className="px-4 py-2">{s.device ?? "Browser"}</td>
                    <td className="px-3 py-2 tabular-nums">{s.extensionVersion ?? <span className="text-[#8A8A8A]">Before 1.3.0</span>}</td>
                    <td className="px-3 py-2">{fmtDate(s.createdAt)}</td>
                    <td className="px-3 py-2">{s.revokedAt ? <span className="text-[#8A8A8A]">Signed out {fmtDate(s.revokedAt)}</span> : fmtRelative(s.lastUsedAt)}</td>
                    <td className="px-4 py-2 text-right">
                      {!s.revokedAt && (
                        <AdminButton variant="ghost" onClick={() => setSignOutToken(s.id)}>
                          Sign out
                        </AdminButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "notes" && <NotesAndTags userId={user.id} notes={data.notes} tags={data.tags} onChange={reload} />}

      {/* ── Dialogs ── */}
      <GrantAccessModal open={dialog === "grant"} onClose={() => setDialog(null)} onDone={done} userId={user.id} email={user.email} />
      {dialog === "edit" && <AccessEditor open onClose={() => setDialog(null)} onSaved={() => done("Access and limits saved")} userId={user.id} access={access} />}
      <ReasonDialog
        open={dialog === "pause"}
        title="Pause Engage for this user?"
        danger
        confirmLabel="Pause Engage"
        body={<>They can&apos;t generate anything with the extension until you resume it. Their website account, billing and history are untouched.</>}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await adminSend(`/api/admin/engage/users/${user.id}/suspend`, "POST", { suspend: true, reason })
          done("Engage paused")
        }}
      />
      <ReasonDialog
        open={dialog === "resume"}
        title="Resume Engage?"
        confirmLabel="Resume"
        body="Their access goes back to what their plan, grants and limits allow."
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await adminSend(`/api/admin/engage/users/${user.id}/suspend`, "POST", { suspend: false, reason })
          done("Engage resumed")
        }}
      />
      <ReasonDialog
        open={dialog === "reset"}
        title="Reset usage"
        confirmLabel="Reset"
        body="Starts the chosen count over. Nothing they've generated is deleted."
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await adminSend(`/api/admin/engage/users/${user.id}/reset-usage`, "POST", { scope: resetScope, reason })
          done("Usage reset")
        }}
      >
        <AdminSelect aria-label="What to reset" className="w-full" value={resetScope} onChange={(e) => setResetScope(e.target.value as typeof resetScope)}>
          <option value="today">Today&apos;s counts and the 24-hour cap</option>
          <option value="month">This month&apos;s counts</option>
          <option value="free">Free generations used ({access.freeUsed} → 0)</option>
        </AdminSelect>
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "signout" || signOutToken !== null}
        title={signOutToken ? "Sign out this browser?" : "Sign out of every browser?"}
        danger
        confirmLabel="Sign out"
        body="The extension signs out there at once. They can sign in again; pause Engage to stop that."
        onClose={() => {
          setDialog(null)
          setSignOutToken(null)
        }}
        onConfirm={async (reason) => {
          await adminSend(`/api/admin/engage/users/${user.id}/sessions`, "POST", { tokenId: signOutToken ?? undefined, reason })
          done("Signed out")
        }}
      />
      <ReasonDialog
        open={grantAction?.kind === "revoke"}
        title="Revoke free access?"
        danger
        confirmLabel="Revoke now"
        body="Free access ends immediately. If they don't pay, they go back to the free plan."
        onClose={() => setGrantAction(null)}
        onConfirm={async (reason) => {
          await adminSend(`/api/admin/engage/grants/${grantAction!.id}`, "PATCH", { action: "revoke", reason })
          done("Free access revoked")
        }}
      />
      <ReasonDialog
        open={grantAction?.kind === "extend"}
        title="Extend free access"
        confirmLabel="Extend"
        body="Adds time from the current end date."
        onClose={() => setGrantAction(null)}
        onConfirm={async (reason) => {
          await adminSend(`/api/admin/engage/grants/${grantAction!.id}`, "PATCH", { action: "extend", duration: extendBy, reason })
          done("Free access extended")
        }}
      >
        <AdminSelect aria-label="Extend by" className="w-full" value={extendBy} onChange={(e) => setExtendBy(e.target.value as GrantDuration)}>
          {GRANT_DURATIONS.filter((d) => d !== "custom").map((d) => (
            <option key={d} value={d}>
              {d === "lifetime" ? "Make it lifetime" : `+ ${GRANT_DURATION_LABELS[d]}`}
            </option>
          ))}
        </AdminSelect>
      </ReasonDialog>
      {loading && <span className="sr-only" role="status">Refreshing</span>}
    </div>
  )
}

function NotesAndTags({
  userId,
  notes,
  tags,
  onChange,
}: {
  userId: string
  notes: UserDetail["notes"]
  tags: string[]
  onChange: () => void
}) {
  const { toast } = useToast()
  const [note, setNote] = useState("")
  const [tag, setTag] = useState("")
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    try {
      await fn()
      toast(ok, "success")
      onChange()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
        <h2 className="border-b border-[#2A2A2A] px-4 py-3 text-[13px] font-semibold text-white">Internal notes</h2>
        <form
          className="space-y-2 border-b border-[#232323] p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!note.trim()) return
            void run(() => adminSend(`/api/admin/engage/users/${userId}/notes`, "POST", { body: note }).then(() => setNote("")), "Note added")
          }}
        >
          <textarea
            aria-label="New note"
            className="min-h-[72px] w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#5A5A5A] focus:border-[#7C3AED]"
            placeholder="e.g. Granted Pro access until Oct 30 for partnership testing."
            value={note}
            maxLength={5000}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-[#8A8A8A]">Only admins see notes.</span>
            <AdminButton type="submit" loading={busy} disabled={!note.trim()}>
              Add note
            </AdminButton>
          </div>
        </form>
        {notes.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-[#8A8A8A]">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-[#232323]">
            {notes.map((n) => (
              <li key={n.id} className="space-y-1 px-4 py-3">
                <p className="whitespace-pre-wrap text-[12.5px] text-[#D0D0D0]">{n.body}</p>
                <div className="flex items-center justify-between text-[11.5px] text-[#8A8A8A]">
                  <span>
                    {n.authorEmail} · {fmtDateTime(n.createdAt)}
                  </span>
                  <button
                    className="hover:text-red-300"
                    onClick={() => void run(() => adminSend(`/api/admin/engage/users/${userId}/notes?noteId=${n.id}`, "DELETE"), "Note deleted")}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <h2 className="text-[13px] font-semibold text-white">Tags</h2>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && <span className="text-[12px] text-[#8A8A8A]">No tags.</span>}
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#262626] py-0.5 pl-2 pr-1 text-[11.5px] text-[#D0D0D0]">
              {t}
              <button
                aria-label={`Remove tag ${t}`}
                className="rounded-full p-0.5 hover:bg-[#3A3A3A]"
                onClick={() => void run(() => adminSend(`/api/admin/engage/users/${userId}/tags?tag=${encodeURIComponent(t)}`, "DELETE"), "Tag removed")}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!tag.trim()) return
            void run(() => adminSend(`/api/admin/engage/users/${userId}/tags`, "POST", { tag: tag.trim() }).then(() => setTag("")), "Tag added")
          }}
        >
          <AdminInput aria-label="New tag" className="min-w-0 flex-1" placeholder="VIP, Beta tester…" maxLength={32} value={tag} onChange={(e) => setTag(e.target.value)} />
          <AdminButton type="submit" variant="secondary" disabled={!tag.trim() || busy}>
            Add
          </AdminButton>
        </form>
      </section>
    </div>
  )
}
