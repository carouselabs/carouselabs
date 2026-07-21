"use client"

// Admin actions panel on the user profile page: grant/set/reset credits,
// change plan, admin note, suspend toggle. Calls the /api/admin/users/[id]/*
// routes then router.refresh() so the server-rendered page re-reads the DB.
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminButton, AdminCard, AdminInput, AdminSelect, ConfirmModal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

export function UserAdminActions({
  userId,
  email,
  plan,
  suspended,
  adminNote,
}: {
  userId: string
  email: string
  plan: "FREE" | "PRO" | "GROWTH"
  suspended: boolean
  adminNote: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [grantAmount, setGrantAmount] = useState("100")
  const [setTotal, setSetTotal] = useState("1000")
  const [planSel, setPlanSel] = useState<"FREE" | "PRO" | "GROWTH">(plan)
  const [note, setNote] = useState(adminNote ?? "")
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<"reset" | "suspend" | "plan" | null>(null)

  const call = async (
    key: string,
    path: string,
    body: unknown,
    successMsg: string,
    method = "POST",
  ) => {
    setBusy(key)
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(successMsg, "success")
      setConfirm(null)
      router.refresh()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Action failed", "error")
    } finally {
      setBusy(null)
    }
  }

  const base = `/api/admin/users/${userId}`

  return (
    <AdminCard title="Admin Actions">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Grant credits */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
            Grant extra credits
          </label>
          <div className="flex gap-2">
            <AdminInput
              type="number"
              min={1}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              className="w-28"
            />
            <AdminButton
              loading={busy === "grant"}
              onClick={() =>
                call(
                  "grant",
                  `${base}/credits`,
                  { action: "grant", amount: Number(grantAmount) },
                  `Granted ${grantAmount} credits`,
                )
              }
            >
              Grant
            </AdminButton>
          </div>
        </div>

        {/* Set credits total */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
            Set monthly allowance
          </label>
          <div className="flex gap-2">
            <AdminInput
              type="number"
              min={1}
              value={setTotal}
              onChange={(e) => setSetTotal(e.target.value)}
              className="w-28"
            />
            <AdminButton
              variant="secondary"
              loading={busy === "set"}
              onClick={() =>
                call(
                  "set",
                  `${base}/credits`,
                  { action: "set", amount: Number(setTotal) },
                  `Allowance set to ${setTotal}`,
                )
              }
            >
              Set Total
            </AdminButton>
          </div>
        </div>

        {/* Change plan */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
            Plan
          </label>
          <div className="flex gap-2">
            <AdminSelect
              value={planSel}
              onChange={(e) => setPlanSel(e.target.value as "FREE" | "PRO" | "GROWTH")}
            >
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="GROWTH">GROWTH</option>
            </AdminSelect>
            <AdminButton
              variant="secondary"
              disabled={planSel === plan}
              loading={busy === "plan"}
              onClick={() => setConfirm("plan")}
            >
              Change Plan
            </AdminButton>
          </div>
        </div>

        {/* Reset monthly */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
            Monthly reset
          </label>
          <div>
            <AdminButton variant="secondary" loading={busy === "reset"} onClick={() => setConfirm("reset")}>
              Reset to plan default
            </AdminButton>
          </div>
        </div>

        {/* Suspend */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
            Account status
          </label>
          <div>
            <AdminButton
              variant={suspended ? "secondary" : "danger"}
              loading={busy === "suspend"}
              onClick={() => setConfirm("suspend")}
            >
              {suspended ? "Unsuspend Account" : "Suspend Account"}
            </AdminButton>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2 md:col-span-2 xl:col-span-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
            Admin note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Internal note about this user…"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />
          <AdminButton
            variant="secondary"
            loading={busy === "note"}
            onClick={() => call("note", base, { adminNote: note }, "Note saved", "PATCH")}
          >
            Save Note
          </AdminButton>
        </div>
      </div>

      <ConfirmModal
        open={confirm === "plan"}
        onClose={() => setConfirm(null)}
        loading={busy === "plan"}
        title={`Change plan to ${planSel}?`}
        body={
          planSel === "PRO"
            ? `${email} gets PRO with a fresh 1000-credit allowance.`
            : planSel === "GROWTH"
              ? `${email} gets GROWTH with a fresh 2000-credit allowance.`
              : `${email} is downgraded to the free plan.`
        }
        confirmLabel="Change Plan"
        onConfirm={() => call("plan", `${base}/plan`, { plan: planSel }, "Plan updated")}
      />
      <ConfirmModal
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        loading={busy === "reset"}
        title="Reset monthly credits?"
        body={`${email} goes back to 0 used against their plan's monthly allowance.`}
        confirmLabel="Reset"
        onConfirm={() => call("reset", `${base}/credits`, { action: "reset" }, "Credits reset")}
      />
      <ConfirmModal
        open={confirm === "suspend"}
        onClose={() => setConfirm(null)}
        loading={busy === "suspend"}
        title={suspended ? "Unsuspend account?" : "Suspend account?"}
        body={suspended ? `${email} will regain access.` : `${email} will be flagged as suspended.`}
        confirmLabel={suspended ? "Unsuspend" : "Suspend"}
        onConfirm={() => call("suspend", `${base}/suspend`, { suspend: !suspended }, "Updated")}
      />
    </AdminCard>
  )
}
