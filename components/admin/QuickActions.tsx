"use client"

// Overview quick actions: search a user by email, grant credits, make Pro.
// Email → userId resolution goes through GET /api/admin/users?email=…
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Coins, Crown } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, Modal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

async function lookupUserId(email: string): Promise<string | null> {
  const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.users?.[0]?.id ?? null
}

export function QuickActions() {
  const router = useRouter()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<"credits" | "pro" | "growth" | null>(null)
  const [email, setEmail] = useState("")
  const [amount, setAmount] = useState("100")
  const [busy, setBusy] = useState(false)

  const onSearch = async () => {
    const q = search.trim()
    if (!q) return
    setBusy(true)
    const id = await lookupUserId(q)
    setBusy(false)
    if (id) router.push(`/admin/users/${id}`)
    else router.push(`/admin/users?q=${encodeURIComponent(q)}`)
  }

  const closeModal = () => {
    setModal(null)
    setEmail("")
    setAmount("100")
  }

  const onGrantCredits = async () => {
    const n = Number(amount)
    if (!email.trim() || !Number.isFinite(n) || n <= 0) {
      toast("Enter a valid email and a positive amount", "error")
      return
    }
    setBusy(true)
    try {
      const id = await lookupUserId(email.trim())
      if (!id) {
        toast("No user found with that email", "error")
        return
      }
      const res = await fetch(`/api/admin/users/${id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", amount: n }),
      })
      if (!res.ok) throw new Error()
      toast(`Granted ${n} credits to ${email.trim()}`, "success")
      closeModal()
      router.refresh()
    } catch {
      toast("Failed to grant credits", "error")
    } finally {
      setBusy(false)
    }
  }

  const onMakePlan = async (targetPlan: "PRO" | "GROWTH") => {
    if (!email.trim()) {
      toast("Enter an email", "error")
      return
    }
    setBusy(true)
    try {
      const id = await lookupUserId(email.trim())
      if (!id) {
        toast("No user found with that email", "error")
        return
      }
      const res = await fetch(`/api/admin/users/${id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      })
      if (!res.ok) throw new Error()
      toast(`${email.trim()} is now ${targetPlan}`, "success")
      closeModal()
      router.refresh()
    } catch {
      toast("Failed to change plan", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard title="Quick Actions">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <AdminInput
            placeholder="Search user by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="w-64"
          />
          <AdminButton variant="secondary" onClick={onSearch} loading={busy && !modal}>
            <Search className="h-3.5 w-3.5" />
            Search
          </AdminButton>
        </div>
        <div className="h-6 w-px bg-[#2A2A2A]" />
        <AdminButton onClick={() => setModal("credits")}>
          <Coins className="h-3.5 w-3.5" />
          Grant Credits
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => setModal("pro")}>
          <Crown className="h-3.5 w-3.5" />
          Make User Pro
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => setModal("growth")}>
          <Crown className="h-3.5 w-3.5" />
          Make User Growth
        </AdminButton>
      </div>

      <Modal open={modal === "credits"} onClose={closeModal} title="Grant Credits">
        <div className="space-y-3">
          <AdminInput
            placeholder="user@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <AdminInput
            type="number"
            min={1}
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full"
          />
          <p className="text-[11px] text-[#6A6A6A]">
            Added as extra credits on top of the monthly allowance (never expire).
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton variant="secondary" onClick={closeModal}>
              Cancel
            </AdminButton>
            <AdminButton onClick={onGrantCredits} loading={busy}>
              Grant
            </AdminButton>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "pro"} onClose={closeModal} title="Make User Pro">
        <div className="space-y-3">
          <AdminInput
            placeholder="user@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <p className="text-[11px] text-[#6A6A6A]">
            Sets plan to PRO with a fresh 1000-credit monthly allowance.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton variant="secondary" onClick={closeModal}>
              Cancel
            </AdminButton>
            <AdminButton onClick={() => onMakePlan("PRO")} loading={busy}>
              Make Pro
            </AdminButton>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "growth"} onClose={closeModal} title="Make User Growth">
        <div className="space-y-3">
          <AdminInput
            placeholder="user@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <p className="text-[11px] text-[#6A6A6A]">
            Sets plan to GROWTH with a fresh 2000-credit monthly allowance.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton variant="secondary" onClick={closeModal}>
              Cancel
            </AdminButton>
            <AdminButton onClick={() => onMakePlan("GROWTH")} loading={busy}>
              Make Growth
            </AdminButton>
          </div>
        </div>
      </Modal>
    </AdminCard>
  )
}
