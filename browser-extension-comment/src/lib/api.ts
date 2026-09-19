// src/lib/api.ts — thin bearer-token API client for app/api/ext/* routes.
// The extension has no Clerk session cookie; auth is a bearer token (minted
// by app/api/ext/auth/exchange, see prisma/schema.prisma's ExtensionToken)
// stored in chrome.storage.local, set automatically by the Sign In flow
// (src/sidepanel/components/SignInScreen.tsx -> app/extension-connect ->
// src/content/authRelay.ts -> src/background.ts). For local dev against a
// non-default API host, set apiBaseUrl directly from an extension page's
// devtools console:
//   chrome.storage.local.set({ apiBaseUrl: "http://localhost:3000" })

const DEFAULT_API_BASE_URL = "https://carouselabs.com";

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

export interface MeResponse {
  email: string;
  plan: string;
  creditsAvailable: number;
  defaultCommentProfileId: string | null;
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
