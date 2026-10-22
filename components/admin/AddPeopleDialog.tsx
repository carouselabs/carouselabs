"use client"

// "Add people" on a campaign (lib/campaigns.ts addCampaignRecipients): an
// audience or pasted addresses join its list. Anyone already on it is
// skipped, so nobody gets it twice; nothing is sent until they're ticked.
import { useState } from "react"
import { UserPlus } from "lucide-react"
import { AdminButton, Modal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { AudiencePicker, EMPTY_AUDIENCE, audienceRequest, type Audience } from "./AudiencePicker"

type Answer = { added: number; already: number }

export function AddPeopleDialog({ campaignId, onClose, onAdded }: { campaignId: string; onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast()
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE)
  const [check, setCheck] = useState<Answer | null>(null)
  const [busy, setBusy] = useState(false)
  const request = audienceRequest(audience)

  async function post(dryRun: boolean): Promise<Answer | null> {
    if (!request) return null
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, dryRun }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't add them")
      return data as Answer
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't add them", "error")
      return null
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Add people to this campaign" wide>
      <div className="flex flex-col gap-3">
        <AudiencePicker
          id="add-people-audience"
          value={audience}
          onChange={(next) => {
            setAudience(next)
            setCheck(null)
          }}
        />
        <p className="text-caption text-muted-foreground">
          Anyone already on this campaign is skipped, so nobody gets it twice. They&apos;re added as not sent yet.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {check && (
            <span className="mr-auto text-caption text-foreground">
              {check.added === 0
                ? "Everyone there is already on this campaign."
                : `${check.added.toLocaleString("en-US")} new ${check.added === 1 ? "person" : "people"}`}
              {check.added > 0 && check.already > 0 && <span className="text-muted-foreground"> ({check.already} already on it)</span>}
            </span>
          )}
          {!check || check.added === 0 ? (
            <AdminButton onClick={async () => setCheck(await post(true))} loading={busy} disabled={!request}>
              Check who&apos;s new
            </AdminButton>
          ) : (
            <AdminButton
              loading={busy}
              onClick={async () => {
                const done = await post(false)
                if (!done) return
                toast(`Added ${done.added.toLocaleString("en-US")} ${done.added === 1 ? "person" : "people"}`, "success")
                onAdded()
                onClose()
              }}
            >
              <UserPlus aria-hidden />
              Add {check.added.toLocaleString("en-US")}
            </AdminButton>
          )}
        </div>
      </div>
    </Modal>
  )
}
