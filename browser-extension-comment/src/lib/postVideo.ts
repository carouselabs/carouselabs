// src/lib/postVideo.ts — a LinkedIn video post, watched by the server
// (/api/ext/video): ten stills from all through it and what's said in
// it.
//
// Watching starts as soon as the post is picked (prefetchPostVideo), so it
// is usually done by the time Generate is pressed; Generate waits for it at
// most VIDEO_WAIT_MS, then writes without it rather than keep the person
// waiting (it's still kept for Regenerate). Watched once per video while the
// panel is open, then sent with every Generate and Regenerate for that post.
//
// A video that can't be watched is never an error here: the comment is then
// written from the post's text and the video's cover, as before.
import { ApiError, apiFetch, RequestCancelled } from "@/lib/api";

export interface WatchedVideo {
  frames: string[];
  transcript: string;
}

// null: this video can't be read, so it isn't asked for again.
const watched = new Map<string, WatchedVideo | null>();
// Watches still under way, so a Generate joins the one the pick started.
const pending = new Map<string, Promise<WatchedVideo | null>>();
const MAX_KEPT = 20;

// How long Generate waits for a watch that's still under way.
export const VIDEO_WAIT_MS = 12_000;

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

// One watch per video at a time, shared by the pick and any Generate. Never
// cancelled by a Stop: the result is worth keeping for the next try.
function startWatching(url: string): Promise<WatchedVideo | null> {
  const key = keyOf(url);
  const running = pending.get(key);
  if (running) return running;
  const run = (async () => {
    try {
      const res = await apiFetch<{ frames?: unknown; transcript?: unknown }>("/api/ext/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const frames = Array.isArray(res.frames) ? res.frames.filter((f): f is string => typeof f === "string") : [];
      const transcript = typeof res.transcript === "string" ? res.transcript : "";
      const result = frames.length || transcript ? { frames, transcript } : null;
      remember(key, result);
      return result;
    } catch (err) {
      // Can't be read (400, 422): not asked again. A time-out, the day's
      // limit or a passing outage may work next time.
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) remember(key, null);
      return null;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, run);
  return run;
}

// The post was just picked: start watching now, in the background.
export function prefetchPostVideo(url: string): void {
  if (!watched.has(keyOf(url))) void startWatching(url);
}

// The watched video for Generate: at once when it's done, else the watch
// under way (started now if none is), waited for at most maxWaitMs; null
// past that or when it can't be watched. Stop (the signal) rejects with a
// cancellation.
export function watchPostVideo(url: string, signal: AbortSignal, maxWaitMs: number = VIDEO_WAIT_MS): Promise<WatchedVideo | null> {
  const key = keyOf(url);
  if (watched.has(key)) return Promise.resolve(watched.get(key) ?? null);
  if (signal.aborted) return Promise.reject(new RequestCancelled());
  const run = startWatching(url);
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };
    const timer = setTimeout(() => {
      done();
      resolve(null);
    }, maxWaitMs);
    const onAbort = () => {
      done();
      reject(new RequestCancelled());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    void run.then((result) => {
      done();
      resolve(result);
    });
  });
}

// For tests: forget every video.
export function forgetWatchedVideos() {
  watched.clear();
  pending.clear();
}
