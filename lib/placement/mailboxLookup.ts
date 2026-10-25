// lib/placement/mailboxLookup.ts — each address's provider (lib/placement/
// mailbox.ts), on the server: free-mail domains are known, any other domain
// is looked up by its MX records (who receives its mail), once per domain per
// server for a day. When DNS can't be asked right now (a timeout, a server
// that refuses), it asks Cloudflare's DNS over HTTPS instead, and if that
// fails too the answer is "not known yet" (null), never a guess: callers
// keep only real answers and ask again later.
import { Resolver } from "node:dns/promises"
import { FREE_MAIL, mailboxFromMx, type Mailbox } from "./mailbox"

const domainOf = (email: string) => email.trim().toLowerCase().split("@")[1] ?? ""

// Answers kept per server: a domain's provider rarely changes.
const KEEP_MS = 24 * 60 * 60 * 1000
const known = new Map<string, { at: number; mailbox: Promise<Mailbox | null> }>()
const resolver = new Resolver({ timeout: 2500, tries: 2 })

// The domain has no mail servers, or doesn't exist: a real answer.
const NO_MAIL = new Set(["ENODATA", "ENOTFOUND"])

/** MX hosts over HTTPS (RFC 8484 JSON), or null when it couldn't answer. */
export async function mxOverHttps(domain: string, fetchFn: typeof fetch = fetch): Promise<string[] | null> {
  try {
    const res = await fetchFn(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const answer = (await res.json()) as { Status?: number; Answer?: { type?: number; data?: string }[] }
    // 0 = answered, 3 = no such domain.
    if (answer.Status === 3) return []
    if (answer.Status !== 0) return null
    return (answer.Answer ?? []).flatMap((a) => (a.type === 15 && a.data ? [a.data.split(/\s+/).at(-1)!] : []))
  } catch {
    return null
  }
}

/** A domain's provider from its MX records, or null when it can't be known right now. */
export async function providerOf(domain: string, ask: { mx?: (d: string) => Promise<string[]>; https?: (d: string) => Promise<string[] | null> } = {}): Promise<Mailbox | null> {
  try {
    return mailboxFromMx(await (ask.mx ?? ((d) => resolver.resolveMx(d).then((rs) => rs.map((r) => r.exchange))))(domain))
  } catch (err) {
    if (NO_MAIL.has((err as { code?: string }).code ?? "")) return "other"
    const hosts = await (ask.https ?? mxOverHttps)(domain)
    return hosts ? mailboxFromMx(hosts) : null
  }
}

function lookUp(domain: string): Promise<Mailbox | null> {
  const kept = known.get(domain)
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.mailbox
  const mailbox = providerOf(domain)
  known.set(domain, { at: Date.now(), mailbox })
  // "Not known yet" isn't kept: the next look asks again.
  void mailbox.then((m) => m === null && known.delete(domain))
  return mailbox
}

/** Each address's provider (lowercase address → provider, or null: not known yet); free-mail domains need no lookup. */
export async function mailboxesOf(emails: string[], look: (domain: string) => Promise<Mailbox | null> = lookUp): Promise<Map<string, Mailbox | null>> {
  const domains = [...new Set(emails.map(domainOf).filter(Boolean))]
  const answers = new Map<string, Mailbox | null>()
  // A few lookups at a time, so a big list doesn't fire hundreds at once.
  for (let i = 0; i < domains.length; i += 20) {
    const chunk = domains.slice(i, i + 20)
    const found = await Promise.all(chunk.map(async (d) => FREE_MAIL[d] ?? (await look(d))))
    chunk.forEach((d, j) => answers.set(d, found[j]))
  }
  return new Map(emails.map((e) => [e.trim().toLowerCase(), domainOf(e) ? (answers.get(domainOf(e)) ?? null) : "other"]))
}
