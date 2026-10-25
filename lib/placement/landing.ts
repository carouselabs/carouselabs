// lib/placement/landing.ts — the "Where it landed" column. No one can see
// inside a lead's own inbox (Gmail and Outlook never tell the sender), so
// each person shows what's known for sure first: it bounced, they marked it
// as spam, they clicked, or they saw it. Otherwise it shows where the
// campaign's test copy landed at their kind of inbox (lib/placement/tests.ts):
// a copy at the test Gmail stands for everyone on Gmail or Google Workspace.
import type { Placement } from "./gmailImap"
import { MAILBOX_LABEL, familyOf, type Mailbox } from "./mailbox"

export type PlacementTestView = {
  id: string
  // What sent the copy, so it's compared with people sent the same way.
  via: string
  // The test inbox's provider ("gmail").
  inbox: Mailbox
  status: "waiting" | "found" | "missing" | "failed"
  placement: Placement | null
  important: boolean
  error: string | null
  sentAt: string | Date
  checkedAt: string | Date | null
}

export type LandingTone = "good" | "warn" | "bad" | "muted"
export type Landing = { label: string; detail?: string; tone: LandingTone }

export const PLACEMENT_LABEL: Record<Placement, string> = {
  primary: "Primary",
  promotions: "Promotions tab",
  updates: "Updates tab",
  social: "Social tab",
  forums: "Forums tab",
  inbox: "Inbox",
  archived: "Skipped the inbox",
  spam: "Spam",
}

export const placementTone = (p: Placement): LandingTone => (p === "primary" || p === "inbox" ? "good" : p === "spam" || p === "archived" ? "bad" : "warn")

/** A test's result in words, e.g. "Promotions tab · Important", or why there's none. */
export function testResult(test: PlacementTestView): Landing {
  if (test.status === "found" && test.placement) {
    return { label: PLACEMENT_LABEL[test.placement], detail: test.important ? "Marked important" : undefined, tone: placementTone(test.placement) }
  }
  if (test.status === "missing") return { label: "Never arrived", detail: "The test copy didn't reach the test inbox in 30 minutes", tone: "bad" }
  if (test.status === "failed") return { label: "Test copy not sent", detail: test.error ?? undefined, tone: "muted" }
  return { label: "Checking…", detail: "Looking for the test copy in the test inbox", tone: "muted" }
}

/** The newest test for people of this provider sent this way, if any. */
export function testFor(tests: PlacementTestView[], mailbox: Mailbox | null, via: string): PlacementTestView | null {
  if (!mailbox) return null
  const family = familyOf(mailbox)
  return (
    tests
      .filter((t) => t.via === via && familyOf(t.inbox) === family)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] ?? null
  )
}

export type LandingPerson = {
  status: string
  sentAt: string | Date | null
  openedAt: string | Date | null
  clickedAt: string | Date | null
  mailbox: Mailbox | null
  // How it was sent ("brevo", or "resend" for CarouseLabs users).
  via: string
  // The lead stopped getting emails (Brevo told us: bounced, spam, …) and when.
  stop?: { reason: string | null; at: string | Date } | null
}

/** What the column says for one person. */
export function landingOf(person: LandingPerson, tests: PlacementTestView[]): Landing {
  if (person.status !== "sent") return { label: "—", tone: "muted" }
  const provider = person.mailbox ? MAILBOX_LABEL[person.mailbox] : null
  const stoppedAfter = person.stop && person.sentAt && new Date(person.stop.at).getTime() >= new Date(person.sentAt).getTime() ? person.stop.reason : null
  if (stoppedAfter === "bounced") return { label: "Bounced", detail: "The address doesn't take mail", tone: "bad" }
  if (stoppedAfter === "spam") return { label: "Marked as spam", detail: "They reported it as spam", tone: "bad" }

  const test = testFor(tests, person.mailbox, person.via)
  const tested = test ? testResult(test) : null
  const atTest = tested && test?.status === "found" ? `${provider ?? "Their inbox"} test: ${tested.label}` : undefined
  if (person.clickedAt) return { label: "Clicked", detail: atTest ?? "It reached them", tone: "good" }
  if (person.openedAt) return { label: "Seen", detail: atTest ?? "It reached them", tone: "good" }
  if (stoppedAfter === "unsubscribed") return { label: "Unsubscribed", detail: "It reached them", tone: "muted" }

  if (!person.mailbox) return { label: "Not known yet", detail: "Looking up their email provider", tone: "muted" }
  if (!test || !tested) {
    if (person.mailbox === "other") return { label: "Not tested", detail: "Another email provider: no test inbox there", tone: "muted" }
    return { label: `${provider}: not tested`, detail: `No test inbox at ${provider} yet`, tone: "muted" }
  }
  return { label: `${provider}: ${tested.label}`, detail: test.status === "found" ? "From the test copy" : tested.detail, tone: tested.tone }
}
