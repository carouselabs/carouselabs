// lib/senders.ts — who a campaign or personal email can come from: the
// default (support@carouselabs.com) and every carouselabs.com address added
// as a sender in Brevo (Brevo → Senders). The domain is verified on Resend
// too, so the same list works whichever sends. Picking anything else is
// refused, and so is a sender Brevo doesn't have when Brevo will send.
// The choices themselves are in lib/sendingRules.ts.
import { brevoSenders } from "@/lib/brevo"
import {
  DEFAULT_SENDER,
  DEFAULT_SENDING,
  SENDING_DOMAIN,
  fromHeader,
  isDefaultChoice,
  type Sending,
  type SendingChoice,
} from "@/lib/sendingRules"

export type SenderChoice = { name: string; email: string; inBrevo: boolean }

/**
 * The senders to pick from. brevoKnown is false when Brevo couldn't be asked
 * (no key, or it didn't answer): whether Brevo has a sender is unknown then.
 */
export async function senderChoices(fetchFn?: typeof fetch): Promise<{ senders: SenderChoice[]; brevoKnown: boolean }> {
  const brevo = await brevoSenders(fetchFn)
  const ours = (brevo ?? []).filter((s) => s.active && s.email.endsWith(`@${SENDING_DOMAIN}`))
  const senders: SenderChoice[] = [{ ...DEFAULT_SENDER, inBrevo: ours.some((s) => s.email === DEFAULT_SENDER.email) }]
  for (const s of ours) {
    if (!senders.some((x) => x.email === s.email)) senders.push({ name: s.name || DEFAULT_SENDER.name, email: s.email, inBrevo: true })
  }
  return { senders, brevoKnown: brevo !== null }
}

/**
 * Checks what was picked and turns it into what's sent with. byBrevo: Brevo
 * will send at least some of it (lib/sendingRules.ts usesBrevo).
 */
export async function resolveSending(
  choice: SendingChoice,
  byBrevo: boolean,
  fetchFn?: typeof fetch,
): Promise<{ sending: Sending } | { problem: string }> {
  // The default needs no checking: it's what every email has always used.
  if (isDefaultChoice(choice)) return { sending: DEFAULT_SENDING }
  const { senders, brevoKnown } = await senderChoices(fetchFn)
  const sender = senders.find((s) => s.email === choice.fromEmail.trim().toLowerCase())
  if (!sender) return { problem: `${choice.fromEmail} isn't one of your senders. Add it as a sender in Brevo first, then pick it.` }
  const replyTo = choice.replyTo?.trim().toLowerCase() || null
  if (replyTo && !senders.some((s) => s.email === replyTo)) return { problem: `${replyTo} isn't one of your senders, so replies can't go there.` }
  if (byBrevo && brevoKnown && !sender.inBrevo) {
    return { problem: `Brevo sends this, and ${sender.email} isn't a sender in Brevo yet. Add it in Brevo → Senders, or pick another.` }
  }
  return { sending: { via: choice.via, from: fromHeader(sender), replyTo: replyTo === sender.email ? null : replyTo } }
}
