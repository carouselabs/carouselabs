// lib/placement/mailbox.ts — whose servers hold a person's inbox: Gmail,
// Google Workspace, Outlook, Microsoft 365, Yahoo, iCloud, Zoho or another.
// Gmail and Workspace sort mail the same way (tabs, spam), and so do
// Outlook and Microsoft 365, which is why a test copy at one tells us about
// the people at the other (lib/placement/landing.ts). Free-mail domains are
// known; any other domain is looked up by its MX records (who receives its
// mail) on the server: lib/placement/mailboxLookup.ts. This file has no
// server-only parts, so the campaign page can use its names too.

export type Mailbox = "gmail" | "google-workspace" | "outlook" | "microsoft-365" | "yahoo" | "icloud" | "zoho" | "other"

/** The family whose filtering a test inbox stands for: Gmail's or Microsoft's. */
export type MailboxFamily = "google" | "microsoft" | "yahoo" | "icloud" | "zoho" | "other"

export const MAILBOX_LABEL: Record<Mailbox, string> = {
  gmail: "Gmail",
  "google-workspace": "Google Workspace",
  outlook: "Outlook",
  "microsoft-365": "Microsoft 365",
  yahoo: "Yahoo",
  icloud: "iCloud",
  zoho: "Zoho",
  other: "Other provider",
}

export function familyOf(mailbox: Mailbox): MailboxFamily {
  if (mailbox === "gmail" || mailbox === "google-workspace") return "google"
  if (mailbox === "outlook" || mailbox === "microsoft-365") return "microsoft"
  return mailbox
}

export const FREE_MAIL: Record<string, Mailbox> = {
  "gmail.com": "gmail",
  "googlemail.com": "gmail",
  "outlook.com": "outlook",
  "hotmail.com": "outlook",
  "hotmail.co.uk": "outlook",
  "hotmail.fr": "outlook",
  "live.com": "outlook",
  "live.in": "outlook",
  "live.co.uk": "outlook",
  "msn.com": "outlook",
  "outlook.in": "outlook",
  "yahoo.com": "yahoo",
  "yahoo.co.in": "yahoo",
  "yahoo.co.uk": "yahoo",
  "yahoo.in": "yahoo",
  "ymail.com": "yahoo",
  "rocketmail.com": "yahoo",
  "aol.com": "yahoo",
  "icloud.com": "icloud",
  "me.com": "icloud",
  "mac.com": "icloud",
  "zoho.com": "zoho",
  "zohomail.com": "zoho",
}

/** The provider from a domain's MX hosts (lowercase, no trailing dot), or "other". */
export function mailboxFromMx(hosts: string[]): Mailbox {
  const all = hosts.map((h) => h.toLowerCase().replace(/\.$/, ""))
  const any = (re: RegExp) => all.some((h) => re.test(h))
  if (any(/(^|\.)(google|googlemail)\.com$/)) return "google-workspace"
  if (any(/\.mail\.protection\.outlook\.com$|\.olc\.protection\.outlook\.com$/)) return "microsoft-365"
  if (any(/(^|\.)yahoodns\.net$/)) return "yahoo"
  if (any(/(^|\.)icloud\.com$/)) return "icloud"
  if (any(/(^|\.)zoho\.(com|eu|in)$/)) return "zoho"
  return "other"
}
