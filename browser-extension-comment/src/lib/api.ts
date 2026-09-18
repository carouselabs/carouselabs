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
}

export interface MeResponse {
  email: string;
  plan: string;
  creditsAvailable: number;
  defaultCommentProfileId: string | null;
}

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
