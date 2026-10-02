// Tells the server about a failure only the panel can see — an Insert that
// couldn't find LinkedIn's box, a conversation that couldn't be read, a
// LinkedIn tab the panel couldn't reach — so the admin's Engage error figures
// cover them (app/api/ext/errors).
//
// Fire and forget: a report can never slow, fail or show anything in the
// panel. Only a code and a fixed description leave the browser: the content
// script's own wording can name the person whose page is open, so it is
// classified here and never sent. The same failure isn't reported twice
// within a minute.
import { apiFetch } from "@/lib/api";

export type ReportFeature = "comments" | "replies" | "connection_notes" | "messages";

const DESCRIPTIONS = {
  "insert.box_not_found": "Insert couldn't find LinkedIn's text box.",
  "insert.wrong_target": "Insert stopped: a different profile or conversation was open.",
  "insert.too_long": "Insert stopped: the text is longer than LinkedIn's box allows.",
  "insert.off": "Insert is switched off in the remote config.",
  "insert.recapture": "Insert stopped: the post or conversation needed capturing again.",
  "insert.failed": "Insert failed on the LinkedIn page.",
  "read.no_conversation": "Couldn't find an open conversation on the Messaging page.",
  "read.hidden_thread": "The conversation was hidden (narrow LinkedIn window).",
  "read.failed": "Couldn't read the conversation on the page.",
  tab_unreachable: "Couldn't reach the LinkedIn tab (opened before an update, or still loading).",
} as const;

export type ReportCode = keyof typeof DESCRIPTIONS;

// The content script's refusal of an Insert, as a code.
export function insertFailureCode(error: string | undefined): ReportCode {
  if (!error) return "insert.failed";
  if (/couldn't find/i.test(error)) return "insert.box_not_found";
  if (/written for|different profile/i.test(error)) return "insert.wrong_target";
  if (/characters/i.test(error)) return "insert.too_long";
  if (/turned off/i.test(error)) return "insert.off";
  if (/again|re-read/i.test(error)) return "insert.recapture";
  return "insert.failed";
}

// The content script's refusal to read a conversation, as a code. null when
// the person simply wasn't on the Messaging page: their navigation, not a
// failure.
export function readFailureCode(error: string | undefined): ReportCode | null {
  if (!error) return "read.failed";
  if (/messaging page/i.test(error)) return null;
  if (/chat list/i.test(error)) return "read.hidden_thread";
  if (/no conversation is open/i.test(error)) return "read.no_conversation";
  return "read.failed";
}

const REPEAT_WINDOW_MS = 60_000;
const lastSent = new Map<string, number>();

export function reportClientError(feature: ReportFeature, code: ReportCode): void {
  const key = `${feature}:${code}`;
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - REPEAT_WINDOW_MS) return;
  lastSent.set(key, now);

  void apiFetch("/api/ext/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature, code, message: DESCRIPTIONS[code] }),
  }).catch(() => {
    // Not signed in, offline, or an older server without the route: nothing to do.
  });
}

// For tests: forget which reports were already sent.
export function resetErrorReports(): void {
  lastSent.clear();
}
