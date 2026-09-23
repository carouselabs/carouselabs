// src/lib/api.ts — thin bearer-token API client for app/api/ext/* routes.
// The extension has no Clerk session cookie; auth is a bearer token (minted
// by app/api/ext/auth/exchange, see prisma/schema.prisma's ExtensionToken)
// stored in chrome.storage.local, set automatically by the Sign In flow
// (src/sidepanel/components/SignInScreen.tsx -> app/extension-connect ->
// src/content/authRelay.ts -> src/background.ts). For local dev against a
// non-default API host, set apiBaseUrl directly from an extension page's
// devtools console:
//   chrome.storage.local.set({ apiBaseUrl: "http://localhost:3000" })

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

export interface GenerateResponse {
  comment: string;
  creditsRemaining: number;
  // Id of the CommentHistory row this generation created, so a later Copy can
  // PATCH its action field. See app/api/ext/history/[id].
  historyId: string;
}

export interface RewriteResponse {
  comment: string;
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
  creditsRemaining: number;
}

export interface MeResponse {
  email: string;
  plan: string;
  creditsAvailable: number;
  // TESTING PHASE ONLY: false while the server's COMMENT_CREDITS_ENFORCED
  // flag is off. Optional because a server predating the flag omits it.
  creditsEnforced?: boolean;
  commentsThisMonth: number;
  commentsToday: number;
  defaultCommentProfileId: string | null;
  defaultConnectionProfileId?: string | null;
  defaultLanguage: string | null;
  insertWarningHidden: boolean;
}

export interface HistoryEntry {
  id: string;
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
  defaultLanguage: string | null;
  insertWarningHidden: boolean;
}

// Mirrors LANGUAGES in app/api/ext/settings/route.ts, which validates against
// the same list — a value not in it is rejected server-side.
export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

export const BILLING_URL = "https://carouselabs.com/settings/billing";

// Public selector config (app/api/ext/config). Only the fields the side panel
// reads; the content script has its own fuller copy of this shape.
export interface ExtConfigResponse {
  insertEnabled: boolean;
}

// Public route — no bearer token, so it bypasses apiFetch.
export async function fetchExtConfig(): Promise<ExtConfigResponse> {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/ext/config`);
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
}

// How many custom profiles each plan may own. Mirrors CUSTOM_PROFILE_LIMITS in
// lib/commentProfiles — the server is authoritative and re-checks on create;
// this only drives the UI so the limit is visible before the user fills a form.
export const CUSTOM_PROFILE_LIMITS: Record<string, number | null> = {
  FREE: 1,
  PRO: 5,
  GROWTH: null,
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getExtensionToken()]);
  if (!token) throw new ApiError(401, "Not signed in — no extension token stored yet");

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}
