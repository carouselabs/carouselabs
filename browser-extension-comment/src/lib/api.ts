// src/lib/api.ts — thin bearer-token API client for app/api/ext/* routes.
// The extension has no Clerk session cookie; auth is a bearer token (minted
// by app/api/ext/auth/exchange, see prisma/schema.prisma's ExtensionToken)
// stored in chrome.storage.local, set automatically by the Sign In flow
// (src/sidepanel/components/SignInScreen.tsx -> app/extension-connect ->
// src/content/authRelay.ts -> src/background.ts). For local dev against a
// non-default API host, set apiBaseUrl directly from an extension page's
// devtools console:
//   chrome.storage.local.set({ apiBaseUrl: "http://localhost:3000" })

import type { ConnectContextSetting, ConnectLengthSetting, LinkedInProfileInfo } from "@/lib/connectionNote";
import { PLATFORM } from "@/lib/platform";

// Chosen by build mode, the same switch manifest.config.ts uses for its
// localhost host permissions: `npm run build` (production) talks to the live
// site, `npm run build:dev` / `npm run dev` to a local server. The two must
// agree — a production build has no localhost permission, so pointing it at
// localhost could never work anyway. The apiBaseUrl override above still wins.
const DEFAULT_API_BASE_URL =
  import.meta.env.MODE === "production" ? "https://carouselabs.com" : "http://localhost:3000";

export interface CommentProfile {
  id: string;
  userId: string | null;
  name: string;
  whoIAm: string;
  goal: string;
  tone: string;
  length: string;
  emoji: string;
  language: string;
  alwaysDo: string | null;
  neverDo: string | null;
  samples: string[];
  isDefault: boolean;
  isSystem: boolean;
  // Curated CarouseLabs preset. Always also isSystem.
  isRecommended: boolean;
  testsUsed: number;
  createdAt: string;
  updatedAt: string;
}

// Free generations left after this one, or null when the account is on the
// unlimited plan (or the paywall is off for testing). Every generation route
// returns it; src/lib/extensionAccess.ts keeps the panel's count in step.
type FreeRemaining = number | null;

export interface GenerateResponse {
  comment: string;
  freeRemaining: FreeRemaining;
  // Id of the CommentHistory row this generation created, so a later Copy can
  // PATCH its action field. See app/api/ext/history/[id].
  historyId: string;
  // Stage durations, streaming responses only (src/lib/generationPerf.ts).
  timing?: import("./generationPerf").GenerateServerTiming;
}

export interface RewriteResponse {
  comment: string;
  freeRemaining: FreeRemaining;
}

// Connection Note profiles — the same shape as CommentProfile minus the fields
// a 280-character invitation has no use for. Mirrors model ConnectionProfile.
export interface ConnectionProfile {
  id: string;
  name: string;
  angle: string;
  goal: string;
  tone: string;
  length: string;
  alwaysDo: string | null;
  neverDo: string | null;
  samples: string[];
  isDefault: boolean;
  isSystem: boolean;
  isRecommended: boolean;
}

// Editable shape the connection-profile builder holds.
export interface ConnectionProfileDraft {
  name: string;
  angle: string;
  goal: string;
  tone: string;
  length: string;
  alwaysDo: string;
  neverDo: string;
  samples: string[];
}

export interface ConnectionNoteResponse {
  note: string;
  freeRemaining: FreeRemaining;
  // History row for this note, for marking Copy/Insert. null if the save failed.
  historyId: string | null;
}

// Conversation Assistant profiles — mirrors ConnectionProfile minus `length`:
// an ongoing message thread has no fixed length the way a single connection
// note does. Mirrors model MessageProfile.
export interface MessageProfile {
  id: string;
  name: string;
  goal: string;
  tone: string;
  alwaysDo: string | null;
  neverDo: string | null;
  samples: string[];
  isDefault: boolean;
  isSystem: boolean;
  isRecommended: boolean;
}

// Editable shape the message-profile builder holds.
export interface MessageProfileDraft {
  name: string;
  goal: string;
  tone: string;
  alwaysDo: string;
  neverDo: string;
  samples: string[];
}

export interface MessageGenerateResponse {
  message: string;
  freeRemaining: FreeRemaining;
  // History row for this message, for marking Copy/Insert. null if the save failed.
  historyId: string | null;
}

// The extension paywall, as app/api/ext/me reports it (lib/extAccess.ts):
// "unlimited" with an active $15/month subscription, "free" on the lifetime
// free generations, "testing" while the server's paywall is switched off.
export interface ExtensionAccess {
  access: "unlimited" | "free" | "testing";
  freeUsed: number;
  freeLimit: number;
  // Lemon Squeezy status of the extension subscription, if there ever was one.
  status: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  // Lemon Squeezy customer portal: cancel, change card, invoices.
  manageUrl: string | null;
  // Set by servers with the Engage admin (absent on older ones). "grant": an
  // admin gave unlimited access, until grantEndsAt (null = for life).
  source?: "subscription" | "grant" | "free" | "testing";
  grantEndsAt?: string | null;
  // An admin paused this account's Engage access.
  suspended?: boolean;
  // false for a feature an admin switched off for this account.
  features?: Partial<Record<"comments" | "replies" | "connection_notes" | "messages", boolean>>;
}

export interface MeResponse {
  email: string;
  // The web app's plan. Only sets custom-profile limits; the extension itself
  // is paid for separately (extension below).
  plan: string;
  extension: ExtensionAccess;
  commentsThisMonth: number;
  commentsToday: number;
  defaultCommentProfileId: string | null;
  defaultConnectionProfileId?: string | null;
  defaultMessageProfileId?: string | null;
  defaultLanguage: string | null;
}

// x_reply / x_message come from CarouseLabs Engage for X, whose History asks
// for them with ?platform=x.
export type HistoryKind = "comment" | "reply" | "connection_note" | "message" | "x_reply" | "x_message";

export interface HistoryEntry {
  id: string;
  // Optional because a server from before notes/messages were saved omits it.
  kind?: HistoryKind;
  postAuthor: string;
  postUrl: string;
  postSnippet: string;
  comment: string;
  action: "NONE" | "COPIED" | "INSERTED";
  createdAt: string;
  profileName: string;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  nextCursor: string | null;
}

// Roughly one comment every 10 minutes across a working day. Past this the
// panel shows a pacing nudge — LinkedIn reads sustained bursts as automation.
export const DAILY_NUDGE_THRESHOLD = 50;

export const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";

export interface SettingsResponse {
  defaultCommentProfileId: string | null;
  defaultConnectionProfileId: string | null;
  defaultMessageProfileId: string | null;
  defaultLanguage: string | null;
  // Settings that used to live only in this browser (src/lib/syncedSettings.ts).
  // null = never set on the account. Optional for an older server.
  connectNoteContext?: ConnectContextSetting | null;
  connectNoteLength?: ConnectLengthSetting | null;
  linkedinProfile?: LinkedInProfileInfo | null;
  insertButtonHidden?: boolean | null;
}

// Mirrors LANGUAGES in app/api/ext/settings/route.ts, which validates against
// the same list — a value not in it is rejected server-side.
export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

// Public selector config (app/api/ext/config). Only the fields the side panel
// reads; the content script has its own fuller copy of this shape.
export interface ExtConfigResponse {
  insertEnabled: boolean;
}

// Public route — no bearer token, so it bypasses apiFetch.
export async function fetchExtConfig(): Promise<ExtConfigResponse> {
  const baseUrl = await getApiBaseUrl();
  // Each extension has its own Insert switch (admin → Engage → Controls).
  const res = await fetch(`${baseUrl}/api/ext/config${PLATFORM === "x" ? "?platform=x" : ""}`);
  if (!res.ok) throw new ApiError(res.status, "Failed to load config");
  return (await res.json()) as ExtConfigResponse;
}

// Editable shape of a profile — what the builder form holds and what the
// create/edit/test routes accept. Mirrors ProfileInput in lib/commentProfiles.
export interface ProfileDraft {
  name: string;
  whoIAm: string;
  goal: string;
  tone: string;
  length: string;
  emoji: string;
  language: string;
  alwaysDo: string;
  neverDo: string;
  samples: string[];
}

export interface TestResponse {
  comment: string;
  // null for an unsaved draft, which has no row to count against.
  testsUsed: number | null;
  testLimit: number;
  freeRemaining: FreeRemaining;
}

export class ApiError extends Error {
  status: number;
  // The error response's JSON body, for flags beyond the message (e.g.
  // requiresSubscription on the paywall's 402). Empty when there was none.
  data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Opens a page of the website in a new tab — the same host the API calls go
// to, so a dev build opens the local site. The website's Extension section
// (/extension) shows the same profiles, history and settings as the panel.
export async function openWebsite(path: string): Promise<void> {
  const baseUrl = await getApiBaseUrl();
  await chrome.tabs.create({ url: `${baseUrl}${path}` });
}

export async function getApiBaseUrl(): Promise<string> {
  const { apiBaseUrl } = await chrome.storage.local.get("apiBaseUrl");
  const trimmed = typeof apiBaseUrl === "string" ? apiBaseUrl.trim() : "";
  return trimmed || DEFAULT_API_BASE_URL;
}

async function getExtensionToken(): Promise<string | null> {
  const { extensionToken } = await chrome.storage.local.get("extensionToken");
  return typeof extensionToken === "string" && extensionToken ? extensionToken : null;
}

// Longer than any generation (the server gives one 40s in all, see
// lib/ai/commentModel.ts), short enough that a hung connection doesn't leave a
// spinner running for long.
const REQUEST_TIMEOUT_MS = 60_000;
// A streamed answer that sends nothing at all for this long has lost its
// connection: while the model is quiet the server sends a keep-alive every 8s.
const STREAM_IDLE_MS = 25_000;

const TIMEOUT_MESSAGE = "The server took too long to respond. Try again.";
const STALLED_MESSAGE = "The connection to CarouseLabs dropped. Try again.";

// The caller cancelled the request through init.signal (Stop, or a new post
// replacing the one being written for). Not an error to show anyone.
export class RequestCancelled extends Error {
  constructor() {
    super("Request cancelled");
    this.name = "RequestCancelled";
  }
}

export function isCancelled(err: unknown): err is RequestCancelled {
  return err instanceof RequestCancelled;
}

// One request's abort controller. It fires when the caller's own signal does,
// when the overall time limit passes, or when the stream is found stalled;
// failure() turns whichever it was into the error to throw.
function requestControl(outer: AbortSignal | null | undefined) {
  const controller = new AbortController();
  let reason: "cancelled" | "timeout" | "stalled" | null = null;
  const abort = (why: "cancelled" | "timeout" | "stalled") => {
    reason ??= why;
    controller.abort();
  };
  const timer = setTimeout(() => abort("timeout"), REQUEST_TIMEOUT_MS);
  const onCancel = () => abort("cancelled");
  if (outer?.aborted) onCancel();
  else outer?.addEventListener("abort", onCancel, { once: true });
  return {
    signal: controller.signal,
    abort,
    failure(): Error | null {
      if (reason === "cancelled") return new RequestCancelled();
      if (reason === "timeout") return new ApiError(408, TIMEOUT_MESSAGE);
      if (reason === "stalled") return new ApiError(408, STALLED_MESSAGE);
      return null;
    },
    done() {
      clearTimeout(timer);
      outer?.removeEventListener("abort", onCancel);
    },
  };
}

// What a person is told when a request fails. A refusal the server explains
// (4xx: out of free generations, a limit, no post text) is shown as written;
// a dropped connection and a signed-out browser get their own words; anything
// else (5xx: the server's own trouble) a plain "try again". Shared by every
// screen that generates.
export const OFFLINE_MESSAGE = "You're offline. Check your internet connection, then try again.";
export const UNREACHABLE_MESSAGE = "Couldn't reach CarouseLabs. Check your connection, then try again.";
export const SIGNED_OUT_MESSAGE = "You've been signed out of CarouseLabs. Sign in again to keep writing.";
export const GENERIC_FAILURE_MESSAGE = "Something went wrong, try again";

export function userFacingError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return SIGNED_OUT_MESSAGE;
    if (err.status >= 400 && err.status < 500) return err.message;
    return GENERIC_FAILURE_MESSAGE;
  }
  // fetch() rejects with a TypeError when there's no connection at all.
  if (err instanceof TypeError) {
    return typeof navigator !== "undefined" && navigator.onLine === false ? OFFLINE_MESSAGE : UNREACHABLE_MESSAGE;
  }
  return GENERIC_FAILURE_MESSAGE;
}

// The server no longer accepts this browser's token (signed out from the
// website or by an admin, the account removed): the panel registers what to
// do then (sign out here too, so it shows Sign in rather than failing every
// request). Not set in content scripts, which never send the token.
let signedOutHandler: (() => void) | null = null;

export function onSignedOut(handler: (() => void) | null): void {
  signedOutHandler = handler;
}

// Every request says which version of the extension sent it, so the admin can
// see who runs what (and the server could treat old versions differently).
function versionHeader(): Record<string, string> {
  try {
    const version = chrome.runtime.getManifest?.().version;
    return version ? { "X-Engage-Version": version } : {};
  } catch {
    return {};
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  if (res.status === 401) signedOutHandler?.();
  const parsed: unknown = await res.json().catch(() => ({}));
  const body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const message = typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
  return new ApiError(res.status, message, body);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getExtensionToken()]);
  if (!token) throw new ApiError(401, "Not signed in — no extension token stored yet");

  // The time limit covers reading the answer too, not just its first byte.
  const control = requestControl(init.signal);
  try {
    // Cancelled while the token was being read: don't send it at all.
    if (control.signal.aborted) throw new RequestCancelled();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: control.signal,
      headers: {
        ...init.headers,
        ...versionHeader(),
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw await errorFrom(res);
    // 204: done, nothing to read (e.g. an error report).
    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
  } catch (err) {
    throw control.failure() ?? err;
  } finally {
    control.done();
  }
}

export interface StreamHandlers {
  // Just before the request is sent (after the token/base URL are read), with
  // the request's id: random, sent as X-Engage-Request-Id, and printed in the
  // server's timing line, so the two can be matched (src/lib/generationPerf.ts).
  onRequest?: (requestId: string) => void;
  // The server accepted the request and is calling the model.
  onStart?: () => void;
  // The comment so far. "" means clear what's shown (a discarded attempt).
  onText?: (text: string) => void;
  // A draft was discarded and a new attempt is starting.
  onRetry?: (attempt: number) => void;
}

function newRequestId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// One server-sent event, as app/api/ext/generate writes them.
function parseEvent(frame: string): { event: string; data: unknown } | null {
  let event = "message";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) };
  } catch {
    return null;
  }
}

// Like apiFetch, but asks for the result as it is produced (server-sent
// events) and reports each piece through `handlers`. Resolves with the final
// event's payload — the authoritative result, which replaces anything
// streamed. Failures are the same ApiErrors apiFetch throws: a non-2xx answer
// before streaming starts keeps its status and JSON body (so a 402 still
// reaches the paywall), and an `error` event carries its own status. A server
// from before streaming answers with plain JSON, which is taken as the result.
export async function apiStream<T>(path: string, init: RequestInit, handlers: StreamHandlers = {}): Promise<T> {
  const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getExtensionToken()]);
  if (!token) throw new ApiError(401, "Not signed in — no extension token stored yet");

  const control = requestControl(init.signal);
  // Armed once the stream starts: a stream that goes completely quiet (not
  // even the server's keep-alive) has lost its connection.
  let idle: ReturnType<typeof setTimeout> | undefined;
  const alive = () => {
    clearTimeout(idle);
    idle = setTimeout(() => control.abort("stalled"), STREAM_IDLE_MS);
  };
  try {
    if (control.signal.aborted) throw new RequestCancelled();
    const requestId = newRequestId();
    handlers.onRequest?.(requestId);
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: control.signal,
      headers: {
        ...init.headers,
        ...versionHeader(),
        "X-Engage-Request-Id": requestId,
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw await errorFrom(res);
    if (!(res.headers.get("content-type") ?? "").includes("text/event-stream") || !res.body) {
      return (await res.json()) as T;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    alive();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      alive();
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const parsed = parseEvent(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (!parsed) continue;
        const data = (parsed.data ?? {}) as Record<string, unknown>;

        switch (parsed.event) {
          case "start":
            handlers.onStart?.();
            break;
          case "text":
            handlers.onText?.(typeof data.text === "string" ? data.text : "");
            break;
          case "retry":
            handlers.onRetry?.(typeof data.attempt === "number" ? data.attempt : 2);
            break;
          case "final":
            void reader.cancel().catch(() => {});
            return data as T;
          case "error":
            throw new ApiError(
              typeof data.status === "number" ? data.status : 500,
              typeof data.error === "string" ? data.error : "Something went wrong, try again",
              data,
            );
        }
      }
    }
    // The connection ended without a result: the server died mid-generation.
    throw new ApiError(502, "Something went wrong, try again");
  } catch (err) {
    throw control.failure() ?? err;
  } finally {
    clearTimeout(idle);
    control.done();
  }
}
