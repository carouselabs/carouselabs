"use client"

// Engage → one user. The strip at the top answers "what can this person do,
// and why?" at a glance; tabs hold the detail; every action asks for a reason
// and confirms anything that takes access away.
import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Gift, LogOut, PauseCircle, PlayCircle, RotateCcw, SlidersHorizontal, Sparkles, X } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
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
  fmtDollars,
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
        <div className="text-caption leading-relaxed text-muted-foreground">{body}</div>
        {children}
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-muted-foreground">Reason (kept in the audit log)</span>
          <AdminInput required minLength={3} maxLength={500} autoFocus className="w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-caption text-danger">
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
    <div className="flex min-w-0 flex-col gap-1 border-l border-border pl-4">
      <dt className="text-caption font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-label font-semibold ${tone === "bad" ? "text-danger" : tone === "warn" ? "text-warning" : "text-foreground"}`}>{children}</dd>
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

  // LinkedIn and X are sold separately: each has its own plan, expiry and
  // free generations.
  const plans = (["linkedin", "x"] as const).map((p) => {
    const paywall = access.platforms[p]
    const sub = p === "x" ? data.xSubscription : data.subscription
    const label =
      paywall.source === "subscription"
        ? "Paid ($15/month)"
        : paywall.source === "grant"
          ? "Free access (granted)"
          : paywall.source === "testing"
            ? "Testing (paywall off)"
            : "Free plan"
    const expires =
      paywall.source === "grant"
        ? paywall.activeGrant?.endsAt
          ? fmtDate(paywall.activeGrant.endsAt)
          : "Never (lifetime)"
        : paywall.source === "subscription"
          ? sub?.status === "cancelled"
            ? `Ends ${fmtDate(sub.endsAt)}`
            : sub?.renewsAt
              ? `Renews ${fmtDate(sub.renewsAt)}`
              : "—"
          : null
    return { platform: p, name: p === "x" ? "X" : "LinkedIn", paywall, sub, label, expires }
  })
  const monthUse = (f: (typeof ENGAGE_FEATURES)[number]) => data.usage.historyMonth[f] ?? 0
  const activeSessions = data.sessions.filter((s) => !s.revokedAt)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
      <Link
        href="/admin/engage/users"
        className="inline-flex w-fit items-center gap-1 rounded-detail text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Engage users
      </Link>

      {/* Who they are, what they can do, and their numbers — one band */}
      <section aria-label={user.name ?? user.email} className="rounded-showcase border border-border bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-display text-[2rem] leading-[1.05] tracking-[-0.01em] break-words text-foreground sm:text-[2.5rem]">{user.name ?? user.email}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            {user.name && <span>{user.email}</span>}
            <button
              className="inline-flex items-center gap-1 font-mono text-caption hover:text-foreground"
              onClick={() => navigator.clipboard.writeText(user.id).then(() => toast("User ID copied", "success"))}
              title="Copy user ID"
            >
              {user.id}
              <Copy className="h-3 w-3" aria-hidden />
            </button>
            <span>Joined {fmtDate(user.createdAt)}</span>
            <Link href={`/admin/users/${user.id}`} className="text-brand hover:underline">
              Website account
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* A personal email to just them, written with AI (/admin/users/[id]/email). */}
          <Link
            href={`/admin/users/${user.id}/email`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "border-border bg-surface-muted hover:bg-surface-raised" })}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Send email with AI
          </Link>
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
      <dl aria-label="Access summary" className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCell label="Status" tone={access.status === "active" ? undefined : "bad"}>
          {access.status === "active" ? "Active" : access.status === "suspended" ? "Engage paused" : "Account suspended"}
        </SummaryCell>
        {plans.map((p) => (
          <SummaryCell
            key={p.platform}
            label={`${p.name} plan`}
            tone={p.paywall.access === "free" && p.paywall.freeRemaining === 0 ? "warn" : undefined}
          >
            {p.label}
            <span className="block text-caption font-normal text-muted-foreground">
              {p.paywall.access === "free"
                ? `${p.paywall.freeUsed} / ${access.freeGenerations.effective} free used`
                : p.expires}
            </span>
          </SummaryCell>
        ))}
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
        {data.aiMonth && (
          <SummaryCell label="AI cost · month">
            <span className="tabular-nums">
              {fmtDollars(data.aiMonth.cost)}
              {data.aiMonth.unpriced ? " +" : ""}
            </span>
          </SummaryCell>
        )}
      </dl>
      </section>

      {access.status === "suspended" && data.control?.suspendReason && (
        <p className="rounded-control-sm border border-danger/35 bg-danger-soft px-4 py-2.5 text-caption text-danger">
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
          <section className="rounded-card border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-label font-semibold text-foreground">Features and limits</h2>
              <AdminButton variant="ghost" onClick={() => setDialog("edit")}>
                Edit
              </AdminButton>
            </header>
            <table className="w-full text-caption">
              <thead>
                <tr className="text-left text-caption text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Setting</th>
                  <th className="px-2 py-2 font-semibold">Plan</th>
                  <th className="px-2 py-2 font-semibold">Override</th>
                  <th className="px-4 py-2 text-right font-semibold">Effective</th>
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                {ENGAGE_FEATURES.map((f) => (
                  <tr key={f} className="border-t border-border">
                    <td className="px-4 py-2">{FEATURE_LABELS[f]}</td>
                    <td className="px-2 py-2 text-muted-foreground">On</td>
                    <td className="px-2 py-2">{access.features[f].override ? <Pill tone="amber">{access.features[f].override === "on" ? "On" : "Off"}</Pill> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2 text-right font-medium">{access.features[f].enabled ? "On" : <span className="text-danger">{access.features[f].paused ? "Paused for everyone" : "Off"}</span>}</td>
                  </tr>
                ))}
                {(Object.keys(access.limits) as Array<keyof typeof access.limits>).map((k) => (
                  <tr key={k} className="border-t border-border">
                    <td className="px-4 py-2">{k === "dailyCap" ? "Daily cap (rolling 24 h)" : `${FEATURE_LABELS[k.split(".")[0] as (typeof ENGAGE_FEATURES)[number]]} / ${k.split(".")[1]}`}</td>
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">{formatLimit(access.limits[k].plan)}</td>
                    <td className="px-2 py-2 tabular-nums">{access.limits[k].override === null ? <span className="text-muted-foreground">—</span> : <Pill tone="amber">{formatLimit(access.limits[k].override)}</Pill>}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatLimit(access.limits[k].effective)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-4 py-2">Free generations</td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">{access.freeGenerations.plan}</td>
                  <td className="px-2 py-2 tabular-nums">{access.freeGenerations.override === null ? <span className="text-muted-foreground">—</span> : <Pill tone="amber">{access.freeGenerations.override}</Pill>}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{access.freeGenerations.effective}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="space-y-4">
            <section className="rounded-card border border-border bg-surface">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-label font-semibold text-foreground">Free access grants</h2>
                <AdminButton variant="ghost" onClick={() => setDialog("grant")}>
                  Grant
                </AdminButton>
              </header>
              {data.grants.length === 0 ? (
                <p className="px-4 py-6 text-center text-caption text-muted-foreground">No grants. Free access you give appears here.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.grants.map((g) => (
                    <li key={g.id} className="space-y-1 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Pill tone={g.state === "active" ? "violet" : g.state === "revoked" ? "red" : "gray"}>
                            {g.state === "active" ? "Active" : g.state === "revoked" ? "Revoked" : g.state === "expired" ? "Expired" : "Scheduled"}
                          </Pill>
                          <span className="text-caption text-foreground">{g.endsAt ? `Until ${fmtDate(g.endsAt)}` : "Lifetime"}</span>
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
                      <p className="text-caption text-muted-foreground">“{g.reason}”</p>
                      <p className="text-caption text-muted-foreground">
                        Granted by {g.grantedBy} on {fmtDate(g.createdAt)}
                        {g.revokedAt && ` · revoked by ${g.revokedBy} on ${fmtDate(g.revokedAt)}${g.revokeReason ? `: ${g.revokeReason}` : ""}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-card border border-border bg-surface px-4 py-3">
              <h2 className="mb-2 text-label font-semibold text-foreground">Subscriptions (Lemon Squeezy)</h2>
              <div className="space-y-3">
                {plans.map((p) => (
                  <div key={p.platform} aria-label={`${p.name} subscription`}>
                    <h3 className="mb-1 text-caption font-semibold text-foreground/90">{p.name}</h3>
                    {p.sub ? (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="text-foreground">{p.sub.status}</dd>
                        <dt className="text-muted-foreground">Started</dt>
                        <dd className="text-foreground">{fmtDate(p.sub.createdAt)}</dd>
                        <dt className="text-muted-foreground">{p.sub.status === "cancelled" ? "Ends" : "Renews"}</dt>
                        <dd className="text-foreground">{fmtDate(p.sub.status === "cancelled" ? p.sub.endsAt : p.sub.renewsAt)}</dd>
                      </dl>
                    ) : (
                      <p className="text-caption text-muted-foreground">Never subscribed.</p>
                    )}
                  </div>
                ))}
                <p className="text-caption text-muted-foreground">Billing is separate from free access you grant.</p>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "usage" && (
        <div className="space-y-4">
          <section className="rounded-card border border-border bg-surface p-4">
            <h2 className="mb-3 text-label font-semibold text-foreground">Generations per day, last 30 days</h2>
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
          <section className="relative overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-caption">
              <thead>
                <tr className="text-left text-caption text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Kind</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Today</th>
                  <th className="px-3 py-2.5 text-right font-semibold">This month</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Month limit</th>
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                {USAGE_KINDS.map((k) => {
                  const isFeature = (ENGAGE_FEATURES as readonly string[]).includes(k)
                  const today = data.usage.counters.day[k] ?? (isFeature ? data.usage.historyToday[k as (typeof ENGAGE_FEATURES)[number]] : undefined)
                  const month = data.usage.counters.month[k] ?? (isFeature ? data.usage.historyMonth[k as (typeof ENGAGE_FEATURES)[number]] : undefined)
                  return (
                    <tr key={k} className="border-t border-border">
                      <td className="px-4 py-2">{USAGE_KIND_LABELS[k]}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(today ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(month ?? 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {isFeature ? formatLimit(access.limits[`${k as (typeof ENGAGE_FEATURES)[number]}.month`].effective) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-2 text-caption text-muted-foreground">
              Counts every generation allowed since this admin went live; before that, generations kept in history. Days are UTC.
            </p>
          </section>
        </div>
      )}

      {tab === "activity" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-card border border-border bg-surface">
            <h2 className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">Recent generations</h2>
            {data.activity.generations.length === 0 ? (
              <p className="px-4 py-6 text-center text-caption text-muted-foreground">Nothing generated yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.activity.generations.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2 text-caption">
                    <span className="text-foreground/90">
                      {GENERATION_LABELS[h.kind] ?? "Comment"}
                      {h.profileName && <span className="text-muted-foreground"> · {h.profileName}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                      {h.action !== "NONE" && <Pill tone="green">{h.action === "COPIED" ? "Copied" : "Inserted"}</Pill>}
                      {fmtDateTime(h.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-border px-4 py-2 text-caption text-muted-foreground">What was written isn&apos;t shown here, only that it happened.</p>
          </section>
          <section className="rounded-card border border-border bg-surface">
            <h2 className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">Admin changes</h2>
            {data.activity.admin.length === 0 ? (
              <p className="px-4 py-6 text-center text-caption text-muted-foreground">No admin has changed this user.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.activity.admin.map((a) => (
                  <li key={a.id} className="space-y-0.5 px-4 py-2.5 text-caption">
                    <div className="flex justify-between gap-3">
                      <span className="text-foreground">{a.details}</span>
                      <span className="shrink-0 text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
                    </div>
                    <div className="text-caption text-muted-foreground">
                      {a.adminEmail}
                      {a.reason && ` · “${a.reason}”`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {data.errors.length > 0 && (
            <section className="rounded-card border border-border bg-surface lg:col-span-2">
              <h2 className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">Errors the extension reported</h2>
              <ul className="divide-y divide-border">
                {data.errors.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 px-4 py-2 text-caption">
                    <span className="text-foreground/90">
                      <span className="font-mono text-caption text-warning">{e.code}</span> {e.message}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
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
        <section className="rounded-card border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-label font-semibold text-foreground">Signed-in browsers</h2>
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
            <table className="w-full text-caption">
              <thead>
                <tr className="text-left text-caption text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Browser</th>
                  <th className="px-3 py-2 font-semibold">Version</th>
                  <th className="px-3 py-2 font-semibold">Signed in</th>
                  <th className="px-3 py-2 font-semibold">Last used</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                {data.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2">{s.device ?? "Browser"}</td>
                    <td className="px-3 py-2 tabular-nums">{s.extensionVersion ?? <span className="text-muted-foreground">Before 1.3.0</span>}</td>
                    <td className="px-3 py-2">{fmtDate(s.createdAt)}</td>
                    <td className="px-3 py-2">{s.revokedAt ? <span className="text-muted-foreground">Signed out {fmtDate(s.revokedAt)}</span> : fmtRelative(s.lastUsedAt)}</td>
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
          <option value="free">
            Free generations used (LinkedIn {access.platforms.linkedin.freeUsed}, X {access.platforms.x.freeUsed} → 0)
          </option>
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
      <section className="rounded-card border border-border bg-surface">
        <h2 className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">Internal notes</h2>
        <form
          className="space-y-2 border-b border-border p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!note.trim()) return
            void run(() => adminSend(`/api/admin/engage/users/${userId}/notes`, "POST", { body: note }).then(() => setNote("")), "Note added")
          }}
        >
          <textarea
            aria-label="New note"
            className="min-h-[72px] w-full rounded-control-sm border border-border bg-background px-3 py-2 text-label text-foreground outline-none placeholder:text-muted-foreground/80 focus:border-brand"
            placeholder="e.g. Granted Pro access until Oct 30 for partnership testing."
            value={note}
            maxLength={5000}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-caption text-muted-foreground">Only admins see notes.</span>
            <AdminButton type="submit" loading={busy} disabled={!note.trim()}>
              Add note
            </AdminButton>
          </div>
        </form>
        {notes.length === 0 ? (
          <p className="px-4 py-6 text-center text-caption text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="space-y-1 px-4 py-3">
                <p className="whitespace-pre-wrap text-caption text-foreground/90">{n.body}</p>
                <div className="flex items-center justify-between text-caption text-muted-foreground">
                  <span>
                    {n.authorEmail} · {fmtDateTime(n.createdAt)}
                  </span>
                  <button
                    className="hover:text-danger"
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
      <section className="space-y-3 rounded-card border border-border bg-surface p-4">
        <h2 className="text-label font-semibold text-foreground">Tags</h2>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && <span className="text-caption text-muted-foreground">No tags.</span>}
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-0.5 pl-2 pr-1 text-caption text-foreground/90">
              {t}
              <button
                aria-label={`Remove tag ${t}`}
                className="rounded-full p-0.5 hover:bg-surface-raised"
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
