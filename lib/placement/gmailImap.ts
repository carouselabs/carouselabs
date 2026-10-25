// lib/placement/gmailImap.ts — finds the test copies in the test Gmail and
// says where Gmail put each one. It signs in over IMAP with an app password
// (PLACEMENT_GMAIL_USER / PLACEMENT_GMAIL_APP_PASSWORD) and only searches and
// reads labels: it never opens, moves or marks anything, since that would
// teach Gmail about the sender and change later results.
//
// Gmail's IMAP search takes the same words as its search box (X-GM-RAW), so
// "category:promotions" finds the Promotions tab; labels (X-GM-LABELS) say
// Inbox and Important; Spam is a folder of its own, outside All Mail. When
// no tab answers (say, tabs can't be searched), the copy is reported as
// "inbox" (in the inbox, tab not known) rather than guessed.
import tls from "node:tls"
import type { Duplex } from "node:stream"

export type Placement = "primary" | "promotions" | "updates" | "social" | "forums" | "inbox" | "archived" | "spam"
export type FoundCopy = { placement: Placement; important: boolean }

const TABS = ["primary", "promotions", "updates", "social", "forums"] as const
const TIMEOUT_MS = 25_000

export class ImapError extends Error {}

/** One IMAP response line, with any {n} literal folded in as a quoted string. */
export function takeLine(buf: Buffer): { line: string; rest: Buffer } | null {
  let line = ""
  let offset = 0
  for (;;) {
    const end = buf.indexOf("\r\n", offset)
    if (end < 0) return null
    const piece = buf.subarray(offset, end).toString("utf8")
    const literal = /\{(\d+)\}$/.exec(piece)
    if (!literal) return { line: line + piece, rest: buf.subarray(end + 2) }
    const start = end + 2
    const size = Number(literal[1])
    if (buf.length < start + size) return null
    line += piece.slice(0, -literal[0].length) + quote(buf.subarray(start, start + size).toString("utf8"))
    offset = start + size
  }
}

export const quote = (s: string) => `"${s.replace(/[\\"]/g, (c) => `\\${c}`)}"`

/** The words of an IMAP list: quoted strings (unquoted), atoms and \Flags, and (…) groups flattened. */
export function words(text: string): string[] {
  const out: string[] = []
  const re = /"((?:[^"\\]|\\.)*)"|([^\s()"]+)/g
  for (const m of text.matchAll(re)) out.push(m[1] !== undefined ? m[1].replace(/\\(.)/g, "$1") : m[2])
  return out
}

class Session {
  private buf: Buffer = Buffer.alloc(0)
  private lines: string[] = []
  private wake: (() => void) | null = null
  private failed: Error | null = null
  private count = 0

  constructor(private socket: Duplex) {
    socket.on("data", (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, chunk])
      for (let next = takeLine(this.buf); next; next = takeLine(this.buf)) {
        this.lines.push(next.line)
        this.buf = next.rest
      }
      this.wake?.()
    })
    const stop = (err: Error) => {
      this.failed ??= err
      this.wake?.()
    }
    socket.on("error", stop)
    socket.on("close", () => stop(new ImapError("Gmail closed the connection")))
  }

  private async line(): Promise<string> {
    while (this.lines.length === 0) {
      if (this.failed) throw this.failed
      await new Promise<void>((resolve) => (this.wake = resolve))
      this.wake = null
    }
    return this.lines.shift()!
  }

  async greeting() {
    const first = await this.line()
    if (!/^\* (OK|PREAUTH)/i.test(first)) throw new ImapError(`Gmail didn't say hello: ${first.slice(0, 120)}`)
  }

  /** Runs one command; its untagged answers, or an ImapError with Gmail's reason. */
  async run(command: string): Promise<string[]> {
    const tag = `a${++this.count}`
    this.socket.write(`${tag} ${command}\r\n`)
    const untagged: string[] = []
    for (;;) {
      const line = await this.line()
      if (!line.startsWith(`${tag} `)) {
        untagged.push(line)
        continue
      }
      const done = /^\S+ (OK|NO|BAD)\b\s*(.*)$/i.exec(line)
      if (done?.[1].toUpperCase() === "OK") return untagged
      throw new ImapError(done?.[2] || line)
    }
  }

  async search(query: string): Promise<number[]> {
    const answer = await this.run(`UID SEARCH X-GM-RAW ${quote(query)}`)
    return answer.flatMap((l) => (/^\* SEARCH\b/i.test(l) ? l.replace(/^\* SEARCH/i, "").trim().split(/\s+/).filter(Boolean).map(Number) : []))
  }

  async labels(uid: number): Promise<string[]> {
    const answer = await this.run(`UID FETCH ${uid} (X-GM-LABELS)`)
    const line = answer.find((l) => /X-GM-LABELS/i.test(l)) ?? ""
    const inside = /X-GM-LABELS \(([^)]*)\)/i.exec(line)?.[1] ?? ""
    return words(inside)
  }

  end() {
    try {
      this.socket.write(`a${++this.count} LOGOUT\r\n`)
    } catch {}
    this.socket.end()
  }
}

/** The folders flagged \All and \Junk (named differently when Gmail isn't in English). */
export function specialFolders(listLines: string[]): { all: string; junk: string } {
  let all = "[Gmail]/All Mail"
  let junk = "[Gmail]/Spam"
  for (const line of listLines) {
    const m = /^\* LIST \(([^)]*)\) (?:"(?:[^"\\]|\\.)*"|NIL) (.+)$/i.exec(line)
    if (!m) continue
    const name = words(m[2])[0]
    if (/\\All\b/i.test(m[1])) all = name
    if (/\\Junk\b/i.test(m[1])) junk = name
  }
  return { all, junk }
}

const has = (labels: string[], name: string) => labels.some((l) => l.replace(/^\\+/, "").toLowerCase() === name.toLowerCase())

export type ImapConnect = () => Duplex

const gmail: ImapConnect = () => tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" })

/**
 * Where each test copy (by the address it was sent to) landed, or null when
 * it isn't there (yet). One sign-in for all of them.
 */
export async function findCopies(input: { user: string; password: string; addresses: string[]; connect?: ImapConnect }): Promise<Map<string, FoundCopy | null>> {
  const found = new Map<string, FoundCopy | null>(input.addresses.map((a) => [a, null]))
  if (input.addresses.length === 0) return found
  const socket = (input.connect ?? gmail)()
  ;(socket as Duplex & { setTimeout?: (ms: number) => void }).setTimeout?.(TIMEOUT_MS)
  socket.on("timeout", () => socket.destroy(new ImapError("Gmail took too long to answer")))
  const imap = new Session(socket)
  try {
    await imap.greeting()
    await imap.run(`LOGIN ${quote(input.user)} ${quote(input.password.replace(/\s+/g, ""))}`)
    const folders = specialFolders(await imap.run(`LIST "" "*"`))

    await imap.run(`EXAMINE ${quote(folders.all)}`)
    for (const address of input.addresses) {
      const query = `deliveredto:${address}`
      const uid = (await imap.search(query)).at(-1)
      if (uid === undefined) continue
      const labels = await imap.labels(uid)
      let placement: Placement = has(labels, "Inbox") ? "inbox" : "archived"
      if (placement === "inbox") {
        for (const tab of TABS) {
          if ((await imap.search(`${query} category:${tab}`)).includes(uid)) {
            placement = tab
            break
          }
        }
      }
      found.set(address, { placement, important: has(labels, "Important") })
    }

    const missing = input.addresses.filter((a) => !found.get(a))
    if (missing.length > 0) {
      await imap.run(`EXAMINE ${quote(folders.junk)}`)
      for (const address of missing) {
        if ((await imap.search(`deliveredto:${address}`)).length > 0) found.set(address, { placement: "spam", important: false })
      }
    }
    return found
  } catch (err) {
    if (err instanceof ImapError && /AUTHENTICATIONFAILED|Invalid credentials|Application-specific password/i.test(err.message)) {
      throw new ImapError("Gmail didn't accept the test inbox's app password. Make a new one (Google Account → Security → App passwords).")
    }
    throw err
  } finally {
    imap.end()
  }
}
