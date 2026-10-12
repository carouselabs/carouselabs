"use client"

// /admin/credits — low-balance alerts, bulk grants, usage chart, top
// spenders, grant-by-email, and the reset-all-Pro danger action.
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Coins } from "lucide-react"
import type { AdminUserRow } from "@/components/admin/UsersTable"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  ConfirmModal,
  PlanBadge,
  Spinner,
  tableCls,
} from "@/components/admin/ui"
import { AdminBarChart } from "@/components/admin/charts"
import { useToast } from "@/components/admin/Toast"

type Daily = { date: string; posts: number; credits: number; newUsers: number }

const LOW_THRESHOLD = 100

export function CreditsManager() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [daily, setDaily] = useState<Daily[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAmount, setBulkAmount] = useState("100")
  const [grantEmail, setGrantEmail] = useState("")
  const [grantAmount, setGrantAmount] = useState("100")
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const load = useCallback(async () => {
    try {
      const [uRes, aRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/analytics"),
      ])
      if (!uRes.ok || !aRes.ok) throw new Error()
      setUsers((await uRes.json()).users)
      setDaily((await aRes.json()).daily)
    } catch {
      toast("Failed to load credit data", "error")
      setUsers([])
      setDaily([])
    }
  }, [toast])
  // `load` is also called after grant/reset actions to refresh, so it can't
  // be inlined as a .then() chain without duplicating fetch logic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load])

  // FREE rows use creditsUsed as a 0/1 lifetime-post counter, so credit
  // alerts only make sense for paid (PRO/GROWTH) users.
  const paid = useMemo(() => (users ?? []).filter((u) => u.plan !== "FREE"), [users])
  const low = paid.filter((u) => u.creditsRemaining > 0 && u.creditsRemaining < LOW_THRESHOLD)
  const zero = paid.filter((u) => u.creditsRemaining === 0)
  const topSpenders = [...paid].sort((a, b) => b.creditsUsed - a.creditsUsed).slice(0, 10)

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const bulkGrant = async () => {
    const amount = Number(bulkAmount)
    if (selected.size === 0 || !Number.isFinite(amount) || amount <= 0) {
      toast("Select users and enter a positive amount", "error")
      return
    }
    setBusy("bulk")
    try {
      const res = await fetch("/api/admin/credits/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selected], amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(`Granted ${amount} credits to ${data.updated} users`, "success")
      setSelected(new Set())
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Bulk grant failed", "error")
    } finally {
      setBusy(null)
    }
  }

  const grantByEmail = async () => {
    const amount = Number(grantAmount)
    const email = grantEmail.trim()
    if (!email || !Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid email and amount", "error")
      return
    }
    setBusy("email")
    try {
      const lookup = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`)
      const found = (await lookup.json()).users?.[0]
      if (!found) {
        toast("No user found with that email", "error")
        return
      }
      const res = await fetch(`/api/admin/users/${found.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", amount }),
      })
      if (!res.ok) throw new Error()
      toast(`Granted ${amount} credits to ${email}`, "success")
      setGrantEmail("")
      await load()
    } catch {
      toast("Grant failed", "error")
    } finally {
      setBusy(null)
    }
  }

  const resetAllPro = async () => {
    setBusy("reset")
    try {
      const res = await fetch("/api/admin/credits/reset-pro", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(`Reset ${data.updated} Pro/Growth users' credits`, "success")
      setConfirmReset(false)
      await load()
    } catch {
      toast("Reset failed", "error")
    } finally {
      setBusy(null)
    }
  }

  if (users === null || daily === null) return <Spinner label="Loading credit data…" />

  const alertList = (list: AdminUserRow[], empty: string) => (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-[12.5px] text-[#6A6A6A]">{empty}</p>}
      {list.map((u) => (
        <label
          key={u.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3.5 py-2.5 hover:border-[#3A3A3A] transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.has(u.id)}
            onChange={() => toggle(u.id)}
            className="h-4 w-4 accent-[#7C3AED]"
          />
          <Link
            href={`/admin/users/${u.id}`}
            className="text-[12.5px] text-[#A78BFA] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {u.email}
          </Link>
          <span className="ml-auto text-[12px] tabular-nums text-[#8A8A8A]">
            {u.creditsRemaining} left · {u.creditsUsed} used
          </span>
        </label>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Alert lists + bulk grant */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard
          title={`Low credits (< ${LOW_THRESHOLD}) — ${low.length}`}
          actions={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        >
          {alertList(low, "No Pro/Growth users are running low.")}
        </AdminCard>
        <AdminCard
          title={`Out of credits — ${zero.length}`}
          actions={<AlertTriangle className="h-4 w-4 text-red-400" />}
        >
          {alertList(zero, "No Pro/Growth users are at zero.")}
        </AdminCard>
      </div>

      {/* Bulk grant bar */}
      <AdminCard title={`Bulk grant (${selected.size} selected)`}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminInput
            type="number"
            min={1}
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            className="w-28"
          />
          <AdminButton loading={busy === "bulk"} disabled={selected.size === 0} onClick={bulkGrant}>
            <Coins className="h-3.5 w-3.5" />
            Grant to {selected.size} selected
          </AdminButton>
          <span className="text-[11px] text-[#6A6A6A]">
            Tick users in the alert lists above, then grant extra credits to all of them at once.
          </span>
        </div>
      </AdminCard>

      {/* Usage chart + top spenders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard title="Credits used per day (last 30 days, est. from posts)">
          <AdminBarChart data={daily} xKey="date" yKey="credits" label="Credits" />
        </AdminCard>
        <AdminCard title="Most credit-hungry users (top 10)">
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>User</th>
                  <th className={tableCls.th}>Plan</th>
                  <th className={tableCls.th}>Used</th>
                  <th className={tableCls.th}>Left</th>
                </tr>
              </thead>
              <tbody>
                {topSpenders.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={4}>
                      No Pro/Growth users yet
                    </td>
                  </tr>
                )}
                {topSpenders.map((u) => (
                  <tr key={u.id} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <Link href={`/admin/users/${u.id}`} className="text-[#A78BFA] hover:underline">
                        {u.email}
                      </Link>
                    </td>
                    <td className={tableCls.td}>
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className={`${tableCls.td} tabular-nums`}>{u.creditsUsed}</td>
                    <td className={`${tableCls.td} tabular-nums`}>{u.creditsRemaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      {/* Quick actions */}
      <AdminCard title="Quick actions">
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Grant credits to email
            </label>
            <div className="flex gap-2">
              <AdminInput
                placeholder="user@email.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                className="w-64"
              />
              <AdminInput
                type="number"
                min={1}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-24"
              />
              <AdminButton loading={busy === "email"} onClick={grantByEmail}>
                Grant
              </AdminButton>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Danger zone
            </label>
            <div>
              <AdminButton variant="danger" loading={busy === "reset"} onClick={() => setConfirmReset(true)}>
                Reset ALL Pro/Growth users&apos; credits
              </AdminButton>
            </div>
          </div>
        </div>
      </AdminCard>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        loading={busy === "reset"}
        title="Reset every Pro/Growth user's credits?"
        body={`This resets creditsUsed to 0 and creditsTotal to each plan's default (1000 for Pro, 2000 for Growth) for all ${paid.length} paid subscriptions. It cannot be undone.`}
        confirmLabel="Yes, reset all"
        onConfirm={resetAllPro}
      />
    </div>
  )
}
