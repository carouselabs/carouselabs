"use client"

// A campaign's "Sending" line: what sends it and who it's from
// (lib/sendingRules.ts), with Change to pick again for the rest of it
// (PATCH /api/admin/campaigns/[id] { sending }).
import { useState } from "react"
import { Pencil } from "lucide-react"
import { AdminButton } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { SendingPicker } from "./SendingPicker"
import { fromEmailOf, type Sending, type SendingChoice } from "@/lib/sendingRules"

const VIA_SHORT: Record<Sending["via"], string> = {
  auto: "Brevo for leads, Resend for everyone else",
  resend: "Resend",
  brevo: "Brevo",
}

export function CampaignSending({
  campaignId,
  sending,
  forLeads,
  disabled,
  onSaved,
}: {
  campaignId: string
  sending: Sending
  forLeads: boolean
  disabled?: boolean
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [editing, setEditing] = useState<SendingChoice | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sending: editing }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't change it")
      toast("Saved: the rest of this campaign goes out this way", "success")
      setEditing(null)
      onSaved()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't change it", "error")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-control-sm border border-border p-3">
        <SendingPicker idPrefix="campaign-sending" value={editing} onChange={setEditing} forLeads={forLeads} />
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={() => setEditing(null)}>
            Cancel
          </AdminButton>
          <AdminButton onClick={() => void save()} loading={saving}>
            Save
          </AdminButton>
        </div>
      </div>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-muted-foreground" aria-label="Sending">
      <span>
        Sent through <span className="font-medium text-foreground">{VIA_SHORT[sending.via]}</span>
      </span>
      <span aria-hidden>·</span>
      <span>
        From <span className="font-medium text-foreground">{sending.from}</span>
      </span>
      <span aria-hidden>·</span>
      <span>
        Replies go to <span className="font-medium text-foreground">{sending.replyTo ?? "the sender"}</span>
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={() => setEditing({ via: sending.via, fromEmail: fromEmailOf(sending.from), replyTo: sending.replyTo })}
          className="ml-1 inline-flex items-center gap-1 font-medium text-brand hover:underline"
        >
          <Pencil className="size-3" aria-hidden />
          Change
        </button>
      )}
    </p>
  )
}
