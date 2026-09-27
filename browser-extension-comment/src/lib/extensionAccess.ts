// src/lib/extensionAccess.ts — the side panel's view of the paywall: 10 free
// generations per account for life, then the $15/month unlimited plan. The
// server decides (lib/extAccess.ts, reported by app/api/ext/me); this module
// only holds the latest answer so every screen shows the same count, and
// keeps it current from each generation's freeRemaining.
//
// One module-level store rather than per-screen state: Home, Messages and
// Account all show it, and a generation on one must update the others.
import { useSyncExternalStore } from "react";
import { apiFetch, ApiError, type ExtensionAccess, type MeResponse } from "@/lib/api";

export const EXTENSION_PRICE_LABEL = "$15/month";
// Mirrors EXT_FREE_GENERATIONS in lib/extensionAccessRules.ts. Only used if a
// paywall 402 arrives before /api/ext/me has answered.
const FREE_GENERATIONS = 10;

let current: ExtensionAccess | null = null;
const listeners = new Set<() => void>();

function set(next: ExtensionAccess | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function getExtensionAccess(): ExtensionAccess | null {
  return current;
}

export function setExtensionAccess(next: ExtensionAccess | null | undefined) {
  set(next ?? null);
}

// A generation route's freeRemaining. null means unlimited, which the store
// already knows; a number only ever lowers the free count shown.
export function noteFreeRemaining(freeRemaining: number | null | undefined) {
  if (typeof freeRemaining !== "number" || !current || current.access !== "free") return;
  set({ ...current, freeUsed: Math.max(0, current.freeLimit - freeRemaining) });
}

// The paywall's 402. Returns true when err was one, having marked the free
// generations as used up so the panel swaps in the unlock card.
export function notePaywallError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 402 || err.data.requiresSubscription !== true) return false;
  set(
    current
      ? { ...current, access: "free", freeUsed: current.freeLimit }
      : { access: "free", freeUsed: FREE_GENERATIONS, freeLimit: FREE_GENERATIONS, status: null, renewsAt: null, endsAt: null, manageUrl: null },
  );
  return true;
}

export function freeGenerationsLeft(access: ExtensionAccess | null): number | null {
  if (!access || access.access !== "free") return null;
  return Math.max(0, access.freeLimit - access.freeUsed);
}

// Only a known "free, none left" blocks Generate. Unknown (still loading)
// never does: the server re-checks anyway, and blocking on every panel open
// while /api/ext/me is in flight would be worse than one extra 402.
export function isPaywalled(access: ExtensionAccess | null): boolean {
  return freeGenerationsLeft(access) === 0;
}

export async function refreshExtensionAccess(): Promise<void> {
  try {
    const me = await apiFetch<MeResponse>("/api/ext/me");
    set(me.extension ?? null);
  } catch {
    // Keeps the last known state; the next generation reports the truth anyway.
  }
}

// Checkout happens in a normal tab. Coming back to the panel afterwards
// refreshes, so a completed purchase unlocks without reopening the panel.
const FOCUS_REFRESH_MIN_MS = 5_000;
let lastFocusRefresh = 0;
function onFocus() {
  if (!current || current.access === "testing") return;
  const now = Date.now();
  if (now - lastFocusRefresh < FOCUS_REFRESH_MIN_MS) return;
  lastFocusRefresh = now;
  void refreshExtensionAccess();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("focus", onFocus);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("focus", onFocus);
  };
}

export function useExtensionAccess(): ExtensionAccess | null {
  return useSyncExternalStore(subscribe, getExtensionAccess);
}

interface CheckoutResponse {
  url?: string;
  alreadySubscribed?: boolean;
  manageUrl?: string | null;
}

// Opens the Lemon Squeezy checkout. The link comes from the server
// (app/api/ext/checkout) because it carries this account's id, which is how
// the payment finds the right account. Throws ApiError for the caller to show.
export async function openCheckout(): Promise<void> {
  const res = await apiFetch<CheckoutResponse>("/api/ext/checkout");
  if (res.alreadySubscribed) {
    await refreshExtensionAccess();
    if (res.manageUrl) await chrome.tabs.create({ url: res.manageUrl });
    return;
  }
  if (res.url) await chrome.tabs.create({ url: res.url });
}
