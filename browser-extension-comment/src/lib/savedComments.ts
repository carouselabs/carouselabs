// src/lib/savedComments.ts — Saved comments in LinkedIn's panel: comments a
// person keeps to insert again in one click, like the one a creator pins
// under every post (app/api/ext/saved-comments; the website shows and edits
// the same list at Engage → Saved comments).
//
// The list is kept in this browser too, so the Write screen shows it at once
// and refreshes it from the server behind. Which posts a reminder was already
// offered on is kept only here: "the first time you open a post" is about
// this person in this browser.
import { apiFetch } from "@/lib/api";

export type RemindOn = "own" | "any" | "off";

export interface SavedComment {
  id: string;
  title: string;
  body: string;
  tags: string[];
  favorite: boolean;
  remindOn: RemindOn;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedCommentFields {
  title?: string;
  body?: string;
  tags?: string[];
  favorite?: boolean;
  remindOn?: RemindOn;
}

// LinkedIn's limit on one comment (the server refuses longer).
export const SAVED_COMMENT_MAX = 1250;

const CACHE_KEY = "savedComments";
const REMINDED_KEY = "savedCommentReminded";
const MAX_REMINDED = 1000;

// Favorites first, then the most recently used, then the newest (as the
// server sends them).
export function sortSaved(list: SavedComment[]): SavedComment[] {
  return [...list].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) ||
      (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "") ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export async function loadCachedSaved(): Promise<SavedComment[] | null> {
  try {
    const stored = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];
    return Array.isArray(stored) ? (stored as SavedComment[]) : null;
  } catch {
    return null;
  }
}

async function cache(list: SavedComment[]) {
  await chrome.storage.local.set({ [CACHE_KEY]: list }).catch(() => {});
}

export async function fetchSaved(): Promise<SavedComment[]> {
  const res = await apiFetch<{ savedComments?: SavedComment[] }>("/api/ext/saved-comments");
  const list = sortSaved(Array.isArray(res?.savedComments) ? res.savedComments : []);
  await cache(list);
  return list;
}

export async function createSaved(fields: SavedCommentFields & { body: string }): Promise<SavedComment> {
  const res = await apiFetch<{ savedComment: SavedComment }>("/api/ext/saved-comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  return res.savedComment;
}

export async function updateSaved(id: string, fields: SavedCommentFields): Promise<SavedComment> {
  const res = await apiFetch<{ savedComment: SavedComment }>(`/api/ext/saved-comments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  return res.savedComment;
}

export async function deleteSaved(id: string): Promise<void> {
  await apiFetch(`/api/ext/saved-comments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Counted on the server for the list's order and the website's "used N
// times". Best effort: the comment was already inserted or copied.
export function markSavedUsed(id: string): void {
  apiFetch(`/api/ext/saved-comments/${encodeURIComponent(id)}/use`, { method: "POST" }).catch(() => {});
}

export const saveCache = cache;

// ── The first-visit reminder ────────────────────────────────────────────────

// The same post however it was reached: its activity id when the address
// has one, else the address without its query.
export function postKey(url: string | undefined | null): string | null {
  if (!url) return null;
  const activity = /urn:li:(?:activity|ugcPost|share):(\d+)/.exec(url);
  if (activity) return `activity:${activity[1]}`;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)linkedin\.com$/.test(parsed.hostname)) return null;
    // The feed itself isn't a post.
    if (parsed.pathname === "/feed/" || parsed.pathname === "/feed") return null;
    return `${parsed.hostname}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export async function remindedPosts(): Promise<Set<string>> {
  try {
    const stored = (await chrome.storage.local.get(REMINDED_KEY))[REMINDED_KEY];
    return new Set(Array.isArray(stored) ? (stored as string[]) : []);
  } catch {
    return new Set();
  }
}

// Remembers that a post has had its reminder (the oldest are forgotten past
// MAX_REMINDED).
export async function markReminded(key: string): Promise<void> {
  try {
    const stored = (await chrome.storage.local.get(REMINDED_KEY))[REMINDED_KEY];
    const list = (Array.isArray(stored) ? (stored as string[]) : []).filter((k) => k !== key);
    list.push(key);
    await chrome.storage.local.set({ [REMINDED_KEY]: list.slice(-MAX_REMINDED) });
  } catch {
    // Not remembered: at worst the reminder shows once more.
  }
}

// The saved comments to offer on a post opened for the first time: those
// set to remind on every post, and, on the person's own post, those set to
// remind on their own posts. In the list's order (favorites first).
export function remindersFor(list: SavedComment[], post: { isOwnPost?: boolean | null }): SavedComment[] {
  return list.filter((c) => c.remindOn === "any" || (c.remindOn === "own" && post.isOwnPost === true));
}
