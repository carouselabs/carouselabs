// src/lib/account.ts — what signing out removes from this browser.
//
// Everything tied to the signed-in person goes: the token, their own LinkedIn
// name and profile, their "your context" purpose, the per-contact reasons,
// and the last capture (other people's content). Otherwise the next account
// to sign in here would inherit them — and a connection note would be written
// using the previous person's profile as "you".
//
// Plain device preferences stay: the Insert button setting, onboarding done,
// the note length, and a developer's apiBaseUrl override.
import { SELF_NAME_STORAGE_KEY } from "@/content/replyThread";
import { CONNECT_CONTEXT_STORAGE_KEY, SELF_PROFILE_STORAGE_KEY } from "@/lib/connectionNote";
import { CONTACT_CONTEXT_STORAGE_PREFIX } from "@/lib/messageThread";

const ACCOUNT_KEYS = [
  "extensionToken",
  "lastSelectedPost",
  SELF_NAME_STORAGE_KEY,
  SELF_PROFILE_STORAGE_KEY,
  CONNECT_CONTEXT_STORAGE_KEY,
];

export async function clearAccountData(): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  const perContact = Object.keys(stored).filter((key) => key.startsWith(CONTACT_CONTEXT_STORAGE_PREFIX));
  // One call, so the side panel sees a single change and flips to Sign in once.
  await chrome.storage.local.remove([...ACCOUNT_KEYS, ...perContact]);
}
