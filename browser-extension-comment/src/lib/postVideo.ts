// src/lib/postVideo.ts — a LinkedIn video post, watched by the server
// (/api/ext/video): ten stills from all through it and what's said in
// it. Watched once per video while the panel is open, then sent with every
// Generate and Regenerate for that post.
//
// A video that can't be watched is never an error here: the comment is then
// written from the post's text and the video's cover, as before.
import { ApiError, apiFetch, isCancelled } from "@/lib/api";

export interface WatchedVideo {
  frames: string[];
  transcript: string;
}

// null: this video can't be read, so it isn't asked for again.
const watched = new Map<string, WatchedVideo | null>();
const MAX_KEPT = 20;

// The address without its time-limited signature, so the same video captured
// again is found again.
function keyOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

function remember(key: string, value: WatchedVideo | null) {
  watched.delete(key);
  watched.set(key, value);
  if (watched.size > MAX_KEPT) watched.delete(watched.keys().next().value as string);
}

// Whether a Generate for this video would have to wait for it to be watched.
export function needsWatching(url: string | undefined): boolean {
  return !!url && !watched.has(keyOf(url));
}

// Stop (the signal) is passed on as a cancellation; every other failure
// gives null.
export async function watchPostVideo(url: string, signal: AbortSignal): Promise<WatchedVideo | null> {
  const key = keyOf(url);
  if (watched.has(key)) return watched.get(key) ?? null;
  try {
    const res = await apiFetch<{ frames?: unknown; transcript?: unknown }>("/api/ext/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal,
    });
    const frames = Array.isArray(res.frames) ? res.frames.filter((f): f is string => typeof f === "string") : [];
    const transcript = typeof res.transcript === "string" ? res.transcript : "";
    const result = frames.length || transcript ? { frames, transcript } : null;
    remember(key, result);
    return result;
  } catch (err) {
    if (isCancelled(err)) throw err;
    // Can't be read (400, 422): not asked again. A time-out, the day's limit
    // or a passing outage may work next time.
    if (err instanceof ApiError && (err.status === 400 || err.status === 422)) remember(key, null);
    return null;
  }
}

// For tests: forget every video.
export function forgetWatchedVideos() {
  watched.clear();
}
