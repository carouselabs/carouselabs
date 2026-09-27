// src/lib/syncedSettings.ts — the extension settings that used to live only
// in this browser, now kept on the account so the website's Extension
// section can edit them too:
//   - the connection note's context and length
//   - the user's own LinkedIn profile ("Use my LinkedIn profile")
//   - each conversation's reason and tone (per contact)
//   - whether the Insert button shows
//
// The account is the source of truth. chrome.storage.local stays as a cache,
// used only when the server can't be reached, and it keeps the exact shapes
// the older local-only code stored — so the validating loaders in
// connectionNote.ts / messageThread.ts still read it.
//
// Before the first read, whatever this browser had saved locally is uploaded
// once (ensureUploaded), for any setting the account doesn't have yet. Only
// once: afterwards an empty account value means it was cleared on the
// website, and must not be brought back from the local copy.
import { apiFetch, type SettingsResponse } from "@/lib/api";
import {
  CONNECT_CONTEXT_STORAGE_KEY,
  CONNECT_LENGTH_STORAGE_KEY,
  SELF_PROFILE_STORAGE_KEY,
  loadConnectContext,
  loadConnectLength,
  loadSelfProfile,
  saveConnectContext,
  saveConnectLength,
  type ConnectContextSetting,
  type ConnectLengthSetting,
  type LinkedInProfileInfo,
} from "@/lib/connectionNote";
import {
  CONTACT_CONTEXT_STORAGE_PREFIX,
  loadMessageContext,
  saveMessageContext,
  type MessageContextSetting,
} from "@/lib/messageThread";

export const SHOW_INSERT_STORAGE_KEY = "showInsertButton";
// Set once this browser's local settings have been uploaded to the account.
// Cleared on sign out (src/lib/account.ts), so another account signing in
// here starts fresh.
export const SETTINGS_UPLOADED_STORAGE_KEY = "settingsUploadedToAccount";

interface ContactRow {
  id: string;
  contactUrl: string;
  contactName: string;
  choice: "profile" | "custom" | "flow";
  profileId: string | null;
  purpose: string;
  tone: string;
}

// ── Account settings, fetched once per burst ───────────────────────────────

// The note panel loads context, length and profile together; one request
// serves all three.
let settingsRequest: { at: number; promise: Promise<SettingsResponse | null> } | null = null;

function fetchSettings(): Promise<SettingsResponse | null> {
  if (settingsRequest && Date.now() - settingsRequest.at < 3_000) return settingsRequest.promise;
  const promise = apiFetch<SettingsResponse>("/api/ext/settings").catch(() => null);
  settingsRequest = { at: Date.now(), promise };
  return promise;
}

async function patchSettings(patch: Partial<SettingsResponse>): Promise<boolean> {
  settingsRequest = null;
  try {
    await apiFetch("/api/ext/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return true;
  } catch {
    return false;
  }
}

async function putContact(contactUrl: string, setting: MessageContextSetting, contactName: string): Promise<boolean> {
  try {
    await apiFetch("/api/ext/contacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactUrl, contactName, ...setting }),
    });
    return true;
  } catch {
    return false;
  }
}

const localRaw = async (key: string): Promise<unknown> => (await chrome.storage.local.get(key))[key];

// ── One-time upload of what this browser saved before ──────────────────────

let uploading: Promise<void> | null = null;

export function ensureUploaded(): Promise<void> {
  uploading ??= uploadLocalSettings().catch(() => {
    // Retried next time the panel opens; nothing is lost meanwhile, since
    // the local copies stay put until the upload succeeds.
    uploading = null;
  });
  return uploading;
}

async function uploadLocalSettings(): Promise<void> {
  if ((await localRaw(SETTINGS_UPLOADED_STORAGE_KEY)) === true) return;

  const server = await apiFetch<SettingsResponse>("/api/ext/settings");
  const all = await chrome.storage.local.get(null);
  const patch: Partial<SettingsResponse> = {};

  const context = await loadConnectContext();
  if (!server.connectNoteContext && context) patch.connectNoteContext = context;
  if (!server.connectNoteLength && all[CONNECT_LENGTH_STORAGE_KEY]) patch.connectNoteLength = await loadConnectLength();
  const self = await loadSelfProfile();
  if (!server.linkedinProfile && self) patch.linkedinProfile = self;
  if (server.insertButtonHidden == null && typeof all[SHOW_INSERT_STORAGE_KEY] === "boolean") {
    patch.insertButtonHidden = !all[SHOW_INSERT_STORAGE_KEY];
  }
  if (Object.keys(patch).length > 0 && !(await patchSettings(patch))) throw new Error("settings upload failed");

  const localContacts = Object.keys(all).filter((key) => key.startsWith(CONTACT_CONTEXT_STORAGE_PREFIX));
  if (localContacts.length > 0) {
    const { contacts } = await apiFetch<{ contacts: ContactRow[] }>("/api/ext/contacts");
    const known = new Set(contacts.map((c) => c.contactUrl));
    for (const key of localContacts) {
      const url = key.slice(CONTACT_CONTEXT_STORAGE_PREFIX.length);
      if (known.has(url)) continue;
      const setting = await loadMessageContext(url);
      if (setting && !(await putContact(url, setting, ""))) throw new Error("contact upload failed");
    }
  }

  await chrome.storage.local.set({ [SETTINGS_UPLOADED_STORAGE_KEY]: true });
  settingsRequest = null;
}

// ── Connection notes ───────────────────────────────────────────────────────

// Mirrors the account's value into the local cache (null removes it), so the
// loaders below read one validated shape whichever side it came from.
async function cache(key: string, value: unknown) {
  if (value == null) await chrome.storage.local.remove(key);
  else await chrome.storage.local.set({ [key]: value });
}

export async function loadSyncedConnectContext(): Promise<ConnectContextSetting | null> {
  await ensureUploaded();
  const server = await fetchSettings();
  if (server) await cache(CONNECT_CONTEXT_STORAGE_KEY, server.connectNoteContext);
  return loadConnectContext();
}

export async function saveSyncedConnectContext(setting: ConnectContextSetting): Promise<void> {
  await saveConnectContext(setting);
  const saved = await loadConnectContext();
  await patchSettings({ connectNoteContext: saved });
}

export async function loadSyncedConnectLength(): Promise<ConnectLengthSetting> {
  await ensureUploaded();
  const server = await fetchSettings();
  if (server) await cache(CONNECT_LENGTH_STORAGE_KEY, server.connectNoteLength);
  return loadConnectLength();
}

export async function saveSyncedConnectLength(setting: ConnectLengthSetting): Promise<void> {
  await saveConnectLength(setting);
  await patchSettings({ connectNoteLength: await loadConnectLength() });
}

// The panel's copy is written by the content script when the user clicks
// "Read my profile" (then uploaded with saveSyncedSelfProfile); the
// account's copy may also have been edited on the website. The newer wins.
export async function loadSyncedSelfProfile(): Promise<LinkedInProfileInfo | null> {
  await ensureUploaded();
  const [server, local] = await Promise.all([fetchSettings(), loadSelfProfile()]);
  if (!server) return local;
  const remote = server.linkedinProfile;
  if (!remote) {
    await cache(SELF_PROFILE_STORAGE_KEY, null);
    return null;
  }
  if (!local || (remote.capturedAt ?? 0) >= (local.capturedAt ?? 0)) {
    await cache(SELF_PROFILE_STORAGE_KEY, remote);
    return loadSelfProfile();
  }
  void patchSettings({ linkedinProfile: local });
  return local;
}

export async function saveSyncedSelfProfile(profile: LinkedInProfileInfo): Promise<void> {
  await patchSettings({ linkedinProfile: profile });
}

// ── Insert button ──────────────────────────────────────────────────────────

export async function loadShowInsert(): Promise<boolean> {
  await ensureUploaded();
  const server = await fetchSettings();
  if (server && typeof server.insertButtonHidden === "boolean") {
    await cache(SHOW_INSERT_STORAGE_KEY, !server.insertButtonHidden);
    return !server.insertButtonHidden;
  }
  const local = await localRaw(SHOW_INSERT_STORAGE_KEY);
  return typeof local === "boolean" ? local : true;
}

export async function saveShowInsert(show: boolean): Promise<void> {
  await chrome.storage.local.set({ [SHOW_INSERT_STORAGE_KEY]: show });
  await patchSettings({ insertButtonHidden: !show });
}

// ── Conversations (per contact) ────────────────────────────────────────────

export async function loadSyncedMessageContext(profileUrl: string): Promise<MessageContextSetting | null> {
  if (!profileUrl) return null;
  await ensureUploaded();
  const key = `${CONTACT_CONTEXT_STORAGE_PREFIX}${profileUrl}`;
  let remote: ContactRow | null;
  try {
    remote = (await apiFetch<{ contact: ContactRow | null }>(`/api/ext/contacts?url=${encodeURIComponent(profileUrl)}`))
      .contact;
  } catch {
    return loadMessageContext(profileUrl);
  }
  await cache(
    key,
    remote && { choice: remote.choice, profileId: remote.profileId ?? "", purpose: remote.purpose, tone: remote.tone },
  );
  return loadMessageContext(profileUrl);
}

// contactName is stored alongside so the website can list the conversation
// by name; the key stays the profile path.
export async function saveSyncedMessageContext(
  profileUrl: string,
  setting: MessageContextSetting,
  contactName: string,
): Promise<void> {
  if (!profileUrl) return;
  await saveMessageContext(profileUrl, setting);
  await putContact(profileUrl, setting, contactName);
}

// For tests: forget in-memory state between cases.
export function __resetSyncedSettingsForTests() {
  settingsRequest = null;
  uploading = null;
}
