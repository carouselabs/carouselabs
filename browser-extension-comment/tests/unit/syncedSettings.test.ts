// src/lib/syncedSettings.ts: the settings that moved from one browser to the
// account, so the website can edit them. Covers the one-time upload of what
// this browser had, the account winning afterwards, and the local copy only
// standing in when the server can't be reached.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromeMock } from "../setup/chrome";
import {
  __resetSyncedSettingsForTests,
  loadShowInsert,
  loadSyncedConnectContext,
  loadSyncedConnectLength,
  loadSyncedMessageContext,
  loadSyncedSelfProfile,
  saveSyncedMessageContext,
  SETTINGS_UPLOADED_STORAGE_KEY,
} from "@/lib/syncedSettings";

type Call = { method: string; path: string; body: Record<string, unknown> | undefined };

// A stand-in account: settings plus per-contact rows, with every request logged.
function account(initial: { settings?: Record<string, unknown>; contacts?: Record<string, unknown>[] } = {}) {
  const settings: Record<string, unknown> = {
    defaultCommentProfileId: null,
    defaultConnectionProfileId: null,
    defaultMessageProfileId: null,
    defaultLanguage: null,
    insertWarningHidden: false,
    connectNoteContext: null,
    connectNoteLength: null,
    linkedinProfile: null,
    insertButtonHidden: null,
    ...initial.settings,
  };
  const contacts = [...(initial.contacts ?? [])];
  const calls: Call[] = [];
  let offline = false;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (offline) throw new TypeError("Failed to fetch");
      const { pathname, searchParams } = new URL(url);
      const method = init.method ?? "GET";
      const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
      calls.push({ method, path: pathname, body });
      const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

      if (pathname === "/api/ext/settings" && method === "GET") return json(settings);
      if (pathname === "/api/ext/settings" && method === "PATCH") {
        Object.assign(settings, body);
        return json(settings);
      }
      if (pathname === "/api/ext/contacts" && method === "GET") {
        const one = searchParams.get("url");
        if (one !== null) return json({ contact: contacts.find((c) => c.contactUrl === one) ?? null });
        return json({ contacts });
      }
      if (pathname === "/api/ext/contacts" && method === "PUT") {
        const i = contacts.findIndex((c) => c.contactUrl === body!.contactUrl);
        const row = { id: `c${contacts.length + 1}`, ...body };
        if (i >= 0) contacts[i] = { ...contacts[i], ...body };
        else contacts.push(row);
        return json({ contact: row });
      }
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }),
  );

  return {
    settings,
    contacts,
    calls,
    goOffline: () => {
      offline = true;
    },
  };
}

const store = () => chromeMock().__store as Record<string, unknown>;

beforeEach(() => {
  __resetSyncedSettingsForTests();
  store().extensionToken = "cl_cmt_live";
});

describe("the one-time upload of this browser's settings", () => {
  it("copies everything the account doesn't have yet, then marks it done", async () => {
    Object.assign(store(), {
      connectNoteContext: { choice: "custom", purpose: "I help SaaS founders" },
      connectNoteLength: { preset: "custom", min: 90, max: 200 },
      linkedinSelfProfile: { name: "Anant", headline: "Founder", currentRole: "", about: "", url: "", capturedAt: 5 },
      showInsertButton: false,
      "messageContext:/in/bharti": { choice: "custom", profileId: "", purpose: "Lead", tone: "Warm" },
    });
    const acct = account();

    expect(await loadSyncedConnectContext()).toEqual({ choice: "custom", purpose: "I help SaaS founders" });

    expect(acct.settings.connectNoteContext).toEqual({ choice: "custom", purpose: "I help SaaS founders" });
    expect(acct.settings.connectNoteLength).toEqual({ preset: "custom", min: 90, max: 200 });
    expect(acct.settings.linkedinProfile).toMatchObject({ name: "Anant" });
    expect(acct.settings.insertButtonHidden).toBe(true);
    expect(acct.contacts).toEqual([expect.objectContaining({ contactUrl: "/in/bharti", purpose: "Lead", tone: "Warm" })]);
    expect(store()[SETTINGS_UPLOADED_STORAGE_KEY]).toBe(true);
  });

  it("never overwrites what the account already has", async () => {
    store().connectNoteContext = { choice: "none", purpose: "" };
    const acct = account({ settings: { connectNoteContext: { choice: "profile", purpose: "" } } });
    expect(await loadSyncedConnectContext()).toEqual({ choice: "profile", purpose: "" });
    expect(acct.calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("happens once: a conversation deleted on the website doesn't come back", async () => {
    store()["messageContext:/in/emma"] = { choice: "flow", profileId: "", purpose: "", tone: "Natural" };
    const acct = account();
    await loadSyncedMessageContext("/in/emma");
    expect(acct.contacts).toHaveLength(1);

    // Deleted on the website.
    acct.contacts.length = 0;
    __resetSyncedSettingsForTests();

    expect(await loadSyncedMessageContext("/in/emma")).toBeNull();
    expect(acct.contacts).toHaveLength(0);
    expect(store()["messageContext:/in/emma"]).toBeUndefined();
  });
});

describe("after the upload, the account wins", () => {
  beforeEach(() => {
    store()[SETTINGS_UPLOADED_STORAGE_KEY] = true;
  });

  it("uses the account's note length and caches it here", async () => {
    store().connectNoteLength = { preset: "short", min: 80, max: 150 };
    account({ settings: { connectNoteLength: { preset: "custom", min: 100, max: 250 } } });
    expect(await loadSyncedConnectLength()).toEqual({ preset: "custom", min: 100, max: 250 });
    expect(store().connectNoteLength).toEqual({ preset: "custom", min: 100, max: 250 });
  });

  it("uses the account's Insert button setting", async () => {
    store().showInsertButton = true;
    account({ settings: { insertButtonHidden: true } });
    expect(await loadShowInsert()).toBe(false);
  });

  it("takes whichever copy of your LinkedIn profile is newer", async () => {
    store().linkedinSelfProfile = { name: "Old", headline: "", currentRole: "", about: "", url: "", capturedAt: 1 };
    account({ settings: { linkedinProfile: { name: "Edited on website", headline: "", currentRole: "", about: "", url: "", capturedAt: 9 } } });
    expect((await loadSyncedSelfProfile())?.name).toBe("Edited on website");
  });

  it("saves a conversation's reason to the account with the contact's name", async () => {
    const acct = account();
    await saveSyncedMessageContext("/in/sam", { choice: "custom", profileId: "", purpose: "Reconnect", tone: "Warm" }, "Sam Lee");
    expect(acct.contacts).toEqual([expect.objectContaining({ contactUrl: "/in/sam", contactName: "Sam Lee", purpose: "Reconnect" })]);
  });
});

describe("offline", () => {
  it("falls back to this browser's copy when the server can't be reached", async () => {
    Object.assign(store(), {
      [SETTINGS_UPLOADED_STORAGE_KEY]: true,
      connectNoteContext: { choice: "custom", purpose: "Cached" },
      "messageContext:/in/sam": { choice: "flow", profileId: "", purpose: "", tone: "Natural" },
      showInsertButton: false,
    });
    account().goOffline();
    expect(await loadSyncedConnectContext()).toEqual({ choice: "custom", purpose: "Cached" });
    expect((await loadSyncedMessageContext("/in/sam"))?.choice).toBe("flow");
    expect(await loadShowInsert()).toBe(false);
  });
});
