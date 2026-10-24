// lib/sendingRules.ts — what a campaign or a personal email goes through
// (Resend or Brevo) and who it comes from. The choices themselves; the list
// of senders and the checks are in lib/senders.ts. No server-only imports:
// the admin screens use these too.
import { z } from "zod"

// "auto": leads through Brevo, everyone else through Resend (lib/campaigns.ts).
export const VIA_CHOICES = ["auto", "resend", "brevo"] as const
export type Via = (typeof VIA_CHOICES)[number]

export const VIA_LABELS: Record<Via, string> = {
  auto: "Automatic: leads by Brevo, everyone else by Resend",
  resend: "Resend, for everyone",
  brevo: "Brevo, for everyone",
}

// Every email's sender unless another is picked.
export const DEFAULT_SENDER = { name: "CarouseLabs", email: "support@carouselabs.com" }
// Senders are addresses on this domain: it's verified on both Resend and Brevo.
export const SENDING_DOMAIN = "carouselabs.com"

export const fromHeader = (sender: { name: string; email: string }) => `${sender.name} <${sender.email}>`
export const DEFAULT_FROM = fromHeader(DEFAULT_SENDER)

/** What an admin picks: replyTo "" or null means replies go to the sender. */
export type SendingChoice = { via: Via; fromEmail: string; replyTo?: string | null }
export const DEFAULT_SENDING_CHOICE: SendingChoice = { via: "auto", fromEmail: DEFAULT_SENDER.email, replyTo: null }

/** What's kept and sent with: the full From ("Name <email>"). */
export type Sending = { via: Via; from: string; replyTo: string | null }
export const DEFAULT_SENDING: Sending = { via: "auto", from: DEFAULT_FROM, replyTo: null }

// What the routes take; who's allowed is checked against the list (lib/senders.ts).
export const sendingChoiceSchema = z.object({
  via: z.enum(VIA_CHOICES),
  fromEmail: z.string().trim().max(320),
  replyTo: z.string().trim().max(320).nullish(),
})

export function isDefaultChoice(choice: SendingChoice): boolean {
  return choice.via === "auto" && choice.fromEmail.toLowerCase() === DEFAULT_SENDER.email && !choice.replyTo
}

/** Whether Brevo sends these emails: always with "brevo", and for leads with "auto". */
export const usesBrevo = (via: Via, forLeads: boolean) => via === "brevo" || (via === "auto" && forLeads)

/** "support@carouselabs.com" out of "CarouseLabs <support@carouselabs.com>". */
export function fromEmailOf(from: string): string {
  return (/<([^>]+)>\s*$/.exec(from)?.[1] ?? from).trim().toLowerCase()
}
