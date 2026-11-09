// lib/leadAccounts.ts — whose leads: CarouseLabs' or Anant Goyal's. Each
// account has its own leads and lists (Lead.account, LeadList.account,
// scripts/lead-accounts.sql), its own Brevo account to send through (and its
// own daily limit there), its own senders and its own unsubscribes; nothing
// crosses over. CarouseLabs' is the original one: every lead from before is
// its, and its audiences keep their old names ("leads:all"). Anant Goyal's
// are named with the account ("leads:anant:all"). No server-only imports:
// the admin screens use this too.

export const LEAD_ACCOUNTS = ["carouselabs", "anant"] as const
export type LeadAccount = (typeof LEAD_ACCOUNTS)[number]
export const DEFAULT_ACCOUNT: LeadAccount = "carouselabs"

export type AccountInfo = {
  // Shown in the admin: "CarouseLabs", "Anant Goyal".
  label: string
  // Its senders are addresses on this domain (verified in its Brevo).
  domain: string
  // Who its emails come from unless another of its senders is picked.
  sender: { name: string; email: string }
  // Its Brevo account's API key (Brevo → SMTP & API → API keys).
  keyEnv: string
  // Where its leads come from, for the Leads page.
  about: string
}

export const ACCOUNTS: Record<LeadAccount, AccountInfo> = {
  carouselabs: {
    label: "CarouseLabs",
    domain: "carouselabs.com",
    sender: { name: "CarouseLabs", email: "support@carouselabs.com" },
    keyEnv: "BREVO_API_KEY",
    about: "People who don't use CarouseLabs yet, uploaded or added here.",
  },
  anant: {
    label: "Anant Goyal",
    domain: "anantgoyal.in",
    sender: { name: "Anant Goyal", email: "hello@anantgoyal.in" },
    keyEnv: "BREVO_API_KEY_ANANTGOYAL",
    about: "Anant Goyal's contacts for email design and outreach, synced from the anantgoyal.in Brevo account or added here.",
  },
}

export const isLeadAccount = (value: unknown): value is LeadAccount => typeof value === "string" && (LEAD_ACCOUNTS as readonly string[]).includes(value)

/** The account a request or stored value names; CarouseLabs' when it names none (or one that isn't there). */
export const leadAccountOf = (value: unknown): LeadAccount => (isLeadAccount(value) ? value : DEFAULT_ACCOUNT)

/**
 * What EmailCampaignRecipient.provider says for an email sent through this
 * account's Brevo: "brevo" for CarouseLabs' (as always), "brevo:anant" for
 * Anant Goyal's. Each counts against its own Brevo daily limit.
 */
export const brevoProvider = (account: LeadAccount) => (account === DEFAULT_ACCOUNT ? "brevo" : `brevo:${account}`)

/** The account a provider value belongs to, or null for Resend (no provider). */
export function accountOfProvider(provider: string | null | undefined): LeadAccount | null {
  if (!provider) return null
  if (provider === "brevo") return DEFAULT_ACCOUNT
  const account = provider.startsWith("brevo:") ? provider.slice("brevo:".length) : null
  return isLeadAccount(account) ? account : null
}
