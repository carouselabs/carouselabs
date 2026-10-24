"use client"

// The Leads page's "Sending through Brevo" card: leads' emails go through
// Brevo (lib/brevo.ts), so this shows whether it's ready (API key, sender,
// domain, the webhook that brings back unsubscribes and bounces) and how
// many lead emails can still go today. /api/admin/brevo.
import { useCallback, useEffect, useState } from "react"
import { CircleAlert, CircleCheck } from "lucide-react"
import { AdminButton, AdminCard } from "@/components/admin/ui"
import type { BrevoStatus } from "@/lib/brevo"

type Answer = { status: BrevoStatus; from: string; today: { limit: number; sentToday: number; left: number } }

function Check({ ok, label, hint, action }: { ok: boolean; label: string; hint?: string; action?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      {ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label="Done" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-label="To do" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-label text-foreground">{label}</span>
        {!ok && hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      </span>
      {action}
    </li>
  )
}

export function BrevoSetup() {
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const load = useCallback(async (init?: RequestInit) => {
    try {
      const res = await fetch("/api/admin/brevo", { cache: "no-store", ...init })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't check Brevo")
      setAnswer(body)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check Brevo")
    }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  async function connect() {
    setConnecting(true)
    await load({ method: "POST" })
    setConnecting(false)
  }

  const status = answer?.status
  const domain = answer?.from.split("@")[1] ?? "your domain"
  return (
    <AdminCard
      title="Sending through Brevo"
      actions={answer && <span className="text-caption text-muted-foreground">Today: {answer.today.left} of {answer.today.limit} lead emails left</span>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-caption text-muted-foreground">
          Leads&apos; emails go out through Brevo; your users&apos; emails stay on Resend.
        </p>
        {!answer && !error && <p className="text-caption text-muted-foreground">Checking Brevo…</p>}
        {status && (
          <ul className="flex flex-col divide-y divide-border">
            <Check ok={status.key} label="API key added" hint="Add BREVO_API_KEY in Vercel → Settings → Environment Variables, then redeploy." />
            {status.key && status.error && (
              <Check
                ok={false}
                label="Brevo didn't accept the key"
                hint={
                  // Brevo's "authorised IPs": Vercel's servers have no fixed address, so it must be off.
                  /\bIP address/i.test(status.error)
                    ? "Brevo only takes calls from IP addresses you approved, and this website's servers change address. In Brevo → Security → Authorised IPs, turn off IP blocking."
                    : status.error
                }
              />
            )}
            {status.key && !status.error && (
              <>
                <Check
                  ok={!!status.sender?.active}
                  label={`Sender ${answer!.from}`}
                  hint={status.sender ? "Brevo hasn't verified it yet: open the email Brevo sent to it." : "Add it in Brevo → Senders, Domains & Dedicated IPs → Senders."}
                />
                <Check
                  ok={!!status.domain?.authenticated}
                  label={`Domain ${domain} authenticated`}
                  hint="In Brevo → Senders, Domains & Dedicated IPs → Domains, add the DNS records it shows. Without them, most emails land in spam."
                />
                <Check
                  ok={status.webhook}
                  label="Unsubscribes, bounces and spam reports come back here"
                  hint="So anyone who unsubscribes with Brevo's button, bounces or marks it spam is never emailed again."
                  action={
                    !status.webhook && (
                      <AdminButton variant="secondary" loading={connecting} onClick={() => void connect()}>
                        Turn on
                      </AdminButton>
                    )
                  }
                />
              </>
            )}
          </ul>
        )}
        {error && <p className="text-caption text-danger">{error}</p>}
      </div>
    </AdminCard>
  )
}
