// src/lib/profileCache.ts — the last comment-profile list the server sent,
// kept in this browser so the Home screen can show it, and enable Generate,
// the moment the panel opens instead of waiting on the network every time.
// The server's answer still arrives and replaces it. It is account data, so
// signing out removes it (src/lib/account.ts).
import type { CommentProfile } from "@/lib/api";

export const COMMENT_PROFILES_CACHE_KEY = "cachedCommentProfiles";

export interface CachedCommentProfiles {
  profiles: CommentProfile[];
  defaultProfileId: string | null;
}

export async function loadCachedCommentProfiles(): Promise<CachedCommentProfiles | null> {
  try {
    const stored = await chrome.storage.local.get(COMMENT_PROFILES_CACHE_KEY);
    const value = stored[COMMENT_PROFILES_CACHE_KEY] as CachedCommentProfiles | undefined;
    return value && Array.isArray(value.profiles) ? value : null;
  } catch {
    return null;
  }
}

export async function saveCachedCommentProfiles(value: CachedCommentProfiles): Promise<void> {
  try {
    await chrome.storage.local.set({ [COMMENT_PROFILES_CACHE_KEY]: value });
  } catch {
    // Only a speed-up; the next panel open simply waits for the server.
  }
}
