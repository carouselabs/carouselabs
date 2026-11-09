// lib/senders.ts — who a campaign or personal email can come from: the
// default (support@carouselabs.com) and every carouselabs.com address added
// as a sender in Brevo (Brevo → Senders). The domain is verified on Resend
// too, so the same list works whichever sends. Picking anything else is
// refused, and so is a sender Brevo doesn't have when Brevo will send.
// The choices themselves are in lib/sendingRules.ts.
import { brevoSenders } from "@/lib/brevo"
import { ACCOUNTS, DEFAULT_ACCOUNT, type LeadAccount } from "@/lib/leadAccounts"
import { DEFAULT_SENDING, fromHeader, isDefaultChoice, type Sending, type SendingChoice } from "@/lib/sendingRules"

export type SenderChoice = { name: string; email: string; inBrevo: boolean }

/**
 * The senders to pick from: the account's own (lib/leadAccounts.ts) and every
 * address on its domain added as a sender in its Brevo. brevoKnown is false
 * when Brevo couldn't be asked (no key, or it didn't answer): whether Brevo
 * has a sender is unknown then.
 */
export async function senderChoices(fetchFn?: typeof fetch, account: LeadAccount = DEFAULT_ACCOUNT): Promise<{ senders: SenderChoice[]; brevoKnown: boolean }> {
  const { domain, sender: own } = ACCOUNTS[account]
  const brevo = await brevoSenders(fetchFn, account)
  const ours = (brevo ?? []).filter((s) => s.active && s.email.endsWith(`@${domain}`))
  const senders: SenderChoice[] = [{ ...own, inBrevo: ours.some((s) => s.email === own.email) }]
  for (const s of ours) {
    if (!senders.some((x) => x.email === s.email)) senders.push({ name: s.name || own.name, email: s.email, inBrevo: true })
  }
  return { senders, brevoKnown: brevo !== null }
}

/**
 * Checks what was picked and turns it into what's sent with. byBrevo: Brevo
 * will send at least some of it (lib/sendingRules.ts usesBrevo). Another
 * account's emails (lib/leadAccounts.ts) always go through its own Brevo,
 * from one of its senders.
 */
export async function resolveSending(
  choice: SendingChoice,
  byBrevo: boolean,
  fetchFn?: typeof fetch,
  account: LeadAccount = DEFAULT_ACCOUNT,
): Promise<{ sending: Sending } | { problem: string }> {
  const other = account !== DEFAULT_ACCOUNT
  // The default needs no checking: it's what every email has always used.
  if (!other && isDefaultChoice(choice)) return { sending: DEFAULT_SENDING }
  if (other) byBrevo = true
  const { senders, brevoKnown } = await senderChoices(fetchFn, account)
  const sender = senders.find((s) => s.email === choice.fromEmail.trim().toLowerCase())
  if (!sender) {
    return {
      problem: other
        ? `${ACCOUNTS[account].label}'s emails come from ${ACCOUNTS[account].domain}: ${choice.fromEmail} isn't one of its senders.`
        : `${choice.fromEmail} isn't one of your senders. Add it as a sender in Brevo first, then pick it.`,
    }
  }
  const replyTo = choice.replyTo?.trim().toLowerCase() || null
  if (replyTo && !senders.some((s) => s.email === replyTo)) return { problem: `${replyTo} isn't one of your senders, so replies can't go there.` }
  if (byBrevo && brevoKnown && !sender.inBrevo) {
    return { problem: `Brevo sends this, and ${sender.email} isn't a sender in Brevo yet. Add it in Brevo → Senders, or pick another.` }
  }
  return { sending: { via: other ? "brevo" : choice.via, from: fromHeader(sender), replyTo: replyTo === sender.email ? null : replyTo } }
}
