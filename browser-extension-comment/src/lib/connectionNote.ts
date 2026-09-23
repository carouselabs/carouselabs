// src/lib/connectionNote.ts — shared by the content script (src/content/
// connectNote.ts) and the side panel for the Connection Request Note feature.
// Both bundles import this module, so the storage keys and message types here
// have one definition instead of hand-synced literals.
//
// Everything is per-install chrome.storage.local, like showInsertButton: the
// context choice, the user's own purpose text and their cached profile are
// about how this browser writes notes, and persist across sessions without a
// schema change.

// Written by the content script when it reads the user's own profile page.
export const SELF_PROFILE_STORAGE_KEY = "linkedinSelfProfile";
// The "Your context" choice plus any custom purpose text.
export const CONNECT_CONTEXT_STORAGE_KEY = "connectNoteContext";
// The last length the user picked, remembered between notes.
export const CONNECT_LENGTH_STORAGE_KEY = "connectNoteLength";

// Side panel → tab: read the profile on the active tab as the user's OWN.
export const READ_SELF_PROFILE_MESSAGE_TYPE = "carouselabs:read-self-profile";

// Must equal CONNECTION_NOTE_HARD_MAX / CONNECTION_NOTE_MIN in
// lib/ai/prompts/connectionNotePrompt.ts (a separate project). LinkedIn's
// limit is 300; 280 leaves a buffer in case its counter isn't character-exact.
export const CONNECT_NOTE_HARD_MAX = 280;
export const CONNECT_NOTE_MIN = 40;

export const MAX_PURPOSE_CHARS = 400;

// Opened by "Open my profile". LinkedIn redirects /in/me/ to the signed-in
// member's own profile.
export const OWN_PROFILE_URL = "https://www.linkedin.com/in/me/";

export interface LinkedInProfileInfo {
  name: string;
  headline: string;
  // "Title at Company" when both are known, else whichever is.
  currentRole: string;
  about: string;
  url: string;
  capturedAt: number;
}

export type ConnectContextChoice = "profile" | "custom" | "none";

export interface ConnectContextSetting {
  choice: ConnectContextChoice;
  // Kept even while another choice is active, so switching back restores it.
  purpose: string;
}

export type ConnectLengthPreset = "short" | "medium" | "custom";

export interface ConnectLengthSetting {
  preset: ConnectLengthPreset;
  min: number;
  max: number;
}

export const CONNECT_LENGTH_PRESETS: Record<Exclude<ConnectLengthPreset, "custom">, { min: number; max: number }> = {
  short: { min: 80, max: 150 },
  medium: { min: 150, max: CONNECT_NOTE_HARD_MAX },
};

export const DEFAULT_CONNECT_LENGTH: ConnectLengthSetting = { preset: "medium", ...CONNECT_LENGTH_PRESETS.medium };

function isProfileInfo(value: unknown): value is LinkedInProfileInfo {
  return !!value && typeof value === "object" && typeof (value as LinkedInProfileInfo).name === "string";
}

export async function loadSelfProfile(): Promise<LinkedInProfileInfo | null> {
  const stored = (await chrome.storage.local.get(SELF_PROFILE_STORAGE_KEY))[SELF_PROFILE_STORAGE_KEY];
  return isProfileInfo(stored) ? stored : null;
}

// null means the user has never chosen, which is what triggers the first-time
// chooser.
export async function loadConnectContext(): Promise<ConnectContextSetting | null> {
  const stored = (await chrome.storage.local.get(CONNECT_CONTEXT_STORAGE_KEY))[CONNECT_CONTEXT_STORAGE_KEY];
  if (!stored || typeof stored !== "object") return null;
  const { choice, purpose } = stored as Partial<ConnectContextSetting>;
  if (choice !== "profile" && choice !== "custom" && choice !== "none") return null;
  return { choice, purpose: typeof purpose === "string" ? purpose : "" };
}

export function saveConnectContext(setting: ConnectContextSetting): Promise<void> {
  return chrome.storage.local.set({
    [CONNECT_CONTEXT_STORAGE_KEY]: { choice: setting.choice, purpose: setting.purpose.slice(0, MAX_PURPOSE_CHARS) },
  });
}

export async function loadConnectLength(): Promise<ConnectLengthSetting> {
  const stored = (await chrome.storage.local.get(CONNECT_LENGTH_STORAGE_KEY))[CONNECT_LENGTH_STORAGE_KEY];
  if (!stored || typeof stored !== "object") return DEFAULT_CONNECT_LENGTH;
  const { preset, min, max } = stored as Partial<ConnectLengthSetting>;
  if (preset !== "short" && preset !== "medium" && preset !== "custom") return DEFAULT_CONNECT_LENGTH;
  if (preset !== "custom") return { preset, ...CONNECT_LENGTH_PRESETS[preset] };
  const lo = Math.max(CONNECT_NOTE_MIN, Math.min(CONNECT_NOTE_HARD_MAX, Number(min) || CONNECT_NOTE_MIN));
  const hi = Math.max(lo, Math.min(CONNECT_NOTE_HARD_MAX, Number(max) || CONNECT_NOTE_HARD_MAX));
  return { preset, min: lo, max: hi };
}

export function saveConnectLength(setting: ConnectLengthSetting): Promise<void> {
  return chrome.storage.local.set({ [CONNECT_LENGTH_STORAGE_KEY]: setting });
}
