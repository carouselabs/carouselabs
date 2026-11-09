"use client"

// What sends an email and who it's from (lib/sendingRules.ts): the service
// (automatic, Resend or Brevo), the sender, picked from the list
// (support@carouselabs.com and every carouselabs.com sender added in Brevo,
// /api/admin/senders), and where replies go. Used when making a campaign (AI
// writer, composer, Use again), on a campaign's page, and for a personal email.
// Another account's leads (lib/leadAccounts.ts: Anant Goyal's) always go
// through its own Brevo, from its own senders: the picker shows only those.
import { useEffect, useState } from "react"
import { AdminSelect } from "@/components/admin/ui"
import { VIA_LABELS, defaultChoiceFor, usesBrevo, type SendingChoice, type Via } from "@/lib/sendingRules"
import type { SenderChoice } from "@/lib/senders"
import { ACCOUNTS, DEFAULT_ACCOUNT, type LeadAccount } from "@/lib/leadAccounts"
import { withAccount } from "./leadAccountContext"

type Senders = { senders: SenderChoice[]; brevoKnown: boolean }

/** One account's senders to pick from; null while loading. */
export function useSenders(account: LeadAccount = DEFAULT_ACCOUNT): Senders | null {
  const [senders, setSenders] = useState<Senders | null>(null)
  useEffect(() => {
    let live = true
    fetch(withAccount("/api/admin/senders", account))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Senders | null) => {
        if (live) setSenders(data ?? { senders: [], brevoKnown: false })
      })
      .catch(() => live && setSenders({ senders: [], brevoKnown: false }))
    return () => {
      live = false
    }
  }, [account])
  return senders
}

// A personal email goes to a user: "automatic" is Resend for them.
const PERSONAL_VIAS: { via: Via; label: string }[] = [
  { via: "auto", label: "Resend" },
  { via: "brevo", label: "Brevo" },
]

const label = "text-caption font-semibold text-muted-foreground"

export function SendingPicker({
  value,
  onChange,
  idPrefix,
  personal = false,
  forLeads = false,
  account = DEFAULT_ACCOUNT,
}: {
  value: SendingChoice
  onChange: (next: SendingChoice) => void
  idPrefix: string
  // One user (a personal email): Resend or Brevo, no "automatic".
  personal?: boolean
  // The audience is leads (lib/leadRules.ts).
  forLeads?: boolean
  // Whose leads (lib/leadAccounts.ts): another account's go through its own Brevo, from its own senders.
  account?: LeadAccount
}) {
  const info = ACCOUNTS[account]
  const other = account !== DEFAULT_ACCOUNT
  const list = useSenders(account)
  // Switching to another account's leads (or back): start from that account's own sender.
  const onDomain = value.fromEmail.endsWith(`@${info.domain}`)
  useEffect(() => {
    if (!onDomain || (other && value.via !== "brevo")) onChange(defaultChoiceFor(account))
  }, [account, onDomain, other, value.via, onChange])
  // The picked one stays listed even if it's no longer a sender (the server then says so).
  const listed = list?.senders ?? []
  const senders = listed.some((s) => s.email === value.fromEmail) ? listed : [...listed, { name: info.sender.name, email: value.fromEmail, inBrevo: false }]
  const sender = senders.find((s) => s.email === value.fromEmail)
  const byBrevo = other || usesBrevo(value.via, forLeads)
  const missingInBrevo = byBrevo && !!list?.brevoKnown && !!sender && !sender.inBrevo
  const vias = other
    ? [{ via: "brevo" as Via, label: `Brevo (${info.domain}), for everyone` }]
    : personal
      ? PERSONAL_VIAS
      : (Object.keys(VIA_LABELS) as Via[]).map((via) => ({ via, label: VIA_LABELS[via] }))

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-via`} className={label}>
            Sent through
          </label>
          <AdminSelect
            id={`${idPrefix}-via`}
            value={other ? "brevo" : value.via}
            disabled={other}
            onChange={(e) => onChange({ ...value, via: e.target.value as Via })}
            className="w-full"
          >
            {vias.map((v) => (
              <option key={v.via} value={v.via}>
                {v.label}
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-from`} className={label}>
            From
          </label>
          <AdminSelect id={`${idPrefix}-from`} value={value.fromEmail} onChange={(e) => onChange({ ...value, fromEmail: e.target.value })} className="w-full">
            {senders.map((s) => (
              <option key={s.email} value={s.email}>
                {s.name} &lt;{s.email}&gt;
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-reply`} className={label}>
            Replies go to
          </label>
          <AdminSelect
            id={`${idPrefix}-reply`}
            value={value.replyTo ?? ""}
            onChange={(e) => onChange({ ...value, replyTo: e.target.value || null })}
            className="w-full"
          >
            <option value="">The sender</option>
            {senders
              .filter((s) => s.email !== value.fromEmail)
              .map((s) => (
                <option key={s.email} value={s.email}>
                  {s.email}
                </option>
              ))}
          </AdminSelect>
        </div>
      </div>
      {missingInBrevo && (
        <p className="text-caption text-danger">
          Brevo sends this, and {value.fromEmail} isn&apos;t a sender in Brevo yet. Add it in Brevo → Senders, or pick another.
        </p>
      )}
      {!other && forLeads && value.via === "resend" && (
        <p className="text-caption text-warning">
          Resend&apos;s rules don&apos;t allow emailing people who didn&apos;t sign up: sending leads through Resend can get the account closed.
        </p>
      )}
      <p className="text-caption text-muted-foreground/80">
        To send from another address, add it as a sender in {other ? `the ${info.domain} Brevo account` : "Brevo"} (on {info.domain}) and it shows up here.
      </p>
    </div>
  )
}
