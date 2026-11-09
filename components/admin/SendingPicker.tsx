"use client"

// What sends an email and who it's from (lib/sendingRules.ts): the service
// (automatic, Resend or Brevo), the sender, picked from the list, and where
// replies go. Used when making a campaign (AI writer, composer, Use again),
// on a campaign's page, and for a personal email.
// A campaign can go to anyone's leads from any account's sender
// (lib/leadAccounts.ts): CarouseLabs' (support@carouselabs.com and every
// carouselabs.com sender in its Brevo) and Anant Goyal's (hello@anantgoyal.in
// and anantgoyal.in senders in his). The sender decides which Brevo sends:
// one of his always goes through his. Picking another account's leads starts
// from that account's own sender; any other can still be picked. A personal
// email (to a user) stays on CarouseLabs' senders.
import { useEffect, useRef, useState } from "react"
import { AdminSelect } from "@/components/admin/ui"
import { VIA_LABELS, defaultChoiceFor, usesBrevo, type SendingChoice, type Via } from "@/lib/sendingRules"
import type { SenderChoice } from "@/lib/senders"
import { ACCOUNTS, DEFAULT_ACCOUNT, LEAD_ACCOUNTS, accountOfEmail, type LeadAccount } from "@/lib/leadAccounts"

type Senders = { senders: SenderChoice[]; brevoKnown: boolean }

/** The senders to pick from (every account's, or only CarouseLabs'); null while loading. */
export function useSenders(all = true): Senders | null {
  const [senders, setSenders] = useState<Senders | null>(null)
  useEffect(() => {
    let live = true
    fetch(all ? "/api/admin/senders?account=all" : "/api/admin/senders")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Senders | null) => {
        if (live) setSenders(data ?? { senders: [], brevoKnown: false })
      })
      .catch(() => live && setSenders({ senders: [], brevoKnown: false }))
    return () => {
      live = false
    }
  }, [all])
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
  // One user (a personal email): Resend or Brevo, no "automatic", CarouseLabs' senders.
  personal?: boolean
  // The audience is leads (lib/leadRules.ts).
  forLeads?: boolean
  // Whose leads were picked (lib/leadAccounts.ts): picking another account's starts from its own sender.
  account?: LeadAccount
}) {
  const list = useSenders(!personal)

  // Another account's leads picked (or back again): start from that account's own sender.
  const lastAccount = useRef(account)
  useEffect(() => {
    if (lastAccount.current === account) return
    lastAccount.current = account
    onChange(defaultChoiceFor(account))
  }, [account, onChange])

  // Whose Brevo sends it: the picked sender's account.
  const senderAccount = accountOfEmail(value.fromEmail)
  const other = senderAccount !== DEFAULT_ACCOUNT
  const info = ACCOUNTS[senderAccount]
  // From another account's sender, it always goes through that account's Brevo.
  useEffect(() => {
    if (other && value.via !== "brevo") onChange({ ...value, via: "brevo" })
  }, [other, value, onChange])

  // The picked one stays listed even if it's no longer a sender (the server then says so).
  const listed = (list?.senders ?? []).map((s) => ({ ...s, account: s.account ?? accountOfEmail(s.email) }))
  const senders = listed.some((s) => s.email === value.fromEmail)
    ? listed
    : [...listed, { name: info.sender.name, email: value.fromEmail, inBrevo: false, account: senderAccount }]
  const sender = senders.find((s) => s.email === value.fromEmail)
  const byBrevo = other || usesBrevo(value.via, forLeads)
  const missingInBrevo = byBrevo && !!list?.brevoKnown && !!sender && !sender.inBrevo
  const vias = other
    ? [{ via: "brevo" as Via, label: `Brevo (${info.domain}), for everyone` }]
    : personal
      ? PERSONAL_VIAS
      : (Object.keys(VIA_LABELS) as Via[]).map((via) => ({ via, label: VIA_LABELS[via] }))
  const groups = LEAD_ACCOUNTS.map((a) => ({ account: a, senders: senders.filter((s) => s.account === a) })).filter((g) => g.senders.length > 0)
  const grouped = groups.length > 1

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
          <AdminSelect
            id={`${idPrefix}-from`}
            value={value.fromEmail}
            onChange={(e) => {
              const fromEmail = e.target.value
              const next = accountOfEmail(fromEmail)
              // Changing account: replies go to the new sender unless picked again.
              onChange(next === senderAccount ? { ...value, fromEmail } : { via: next === DEFAULT_ACCOUNT ? "auto" : "brevo", fromEmail, replyTo: null })
            }}
            className="w-full"
          >
            {grouped
              ? groups.map((g) => (
                  <optgroup key={g.account} label={`${ACCOUNTS[g.account].label} (${ACCOUNTS[g.account].domain})`}>
                    {g.senders.map((s) => (
                      <option key={s.email} value={s.email}>
                        {s.name} &lt;{s.email}&gt;
                      </option>
                    ))}
                  </optgroup>
                ))
              : senders.map((s) => (
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
              .filter((s) => s.email !== value.fromEmail && s.account === senderAccount)
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
      {other && (
        <p className="text-caption text-muted-foreground/80">
          From {info.domain}: it goes through the {info.domain} Brevo account, with its own daily limit, to whichever leads you picked.
        </p>
      )}
      <p className="text-caption text-muted-foreground/80">
        To send from another address, add it as a sender in {other ? `the ${info.domain} Brevo account` : "Brevo"} (on {info.domain}) and it shows up here.
      </p>
    </div>
  )
}
