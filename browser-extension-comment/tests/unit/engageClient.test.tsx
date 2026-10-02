// What 1.3.0 tells the server and shows for the Engage admin: every request
// carries the extension's version; failures only the panel can see are
// reported as codes (never the page's wording, which can name people); the
// Account screen shows free access granted by an admin, a paused account and
// features switched off.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiFetch, apiStream } from "@/lib/api";
import { insertFailureCode, readFailureCode, reportClientError, resetErrorReports } from "@/lib/errorReport";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { AccountScreen } from "@/sidepanel/components/screens/AccountScreen";
import { MessagesScreen } from "@/sidepanel/components/screens/MessagesScreen";
import { chromeMock } from "../setup/chrome";

type FetchCall = [string, RequestInit | undefined];

function okFetch(status = 200, body: unknown = { ok: 1 }) {
  const fetchMock = vi.fn(async () =>
    status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function withVersion(version: string | undefined) {
  const getManifest = chromeMock().runtime.getManifest as Mock;
  const base = getManifest();
  getManifest.mockReturnValue(version === undefined ? base : { ...base, version });
}

const headersOf = (call: unknown) => ((call as FetchCall)[1]?.headers ?? {}) as Record<string, string>;

function errorReports(fetchMock: Mock) {
  return (fetchMock.mock.calls as unknown as FetchCall[])
    .filter(([url]) => url.endsWith("/api/ext/errors"))
    .map(([, init]) => JSON.parse(String(init?.body)) as { feature: string; code: string; message: string });
}

beforeEach(() => {
  chromeMock().__store.extensionToken = "cl_cmt_abc";
  resetErrorReports();
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("version header", () => {
  it("sends the manifest's version with every request", async () => {
    withVersion("1.3.0");
    const fetchMock = okFetch();
    await apiFetch("/api/ext/me");
    expect(headersOf(fetchMock.mock.calls[0])).toMatchObject({
      "X-Engage-Version": "1.3.0",
      Authorization: "Bearer cl_cmt_abc",
    });
  });

  it("sends it on streamed requests too", async () => {
    withVersion("1.3.0");
    const fetchMock = okFetch();
    await apiStream("/api/ext/generate", { method: "POST" });
    expect(headersOf(fetchMock.mock.calls[0])).toMatchObject({ "X-Engage-Version": "1.3.0", Accept: "text/event-stream" });
  });

  it("leaves it out when the version can't be read", async () => {
    withVersion(undefined);
    const fetchMock = okFetch();
    await apiFetch("/api/ext/me");
    expect(headersOf(fetchMock.mock.calls[0])).not.toHaveProperty("X-Engage-Version");

    (chromeMock().runtime.getManifest as Mock).mockImplementation(() => {
      throw new Error("context invalidated");
    });
    await apiFetch("/api/ext/me");
    expect(headersOf(fetchMock.mock.calls[1])).not.toHaveProperty("X-Engage-Version");
  });

  it("treats 204 as done instead of failing to read an empty body", async () => {
    okFetch(204);
    await expect(apiFetch("/api/ext/errors", { method: "POST" })).resolves.toBeUndefined();
  });
});

describe("failure codes", () => {
  it.each([
    ["Couldn't find LinkedIn's note box. Click Connect, then \"Add a note\", then try Insert.", "insert.box_not_found"],
    ["Couldn't find the message box in this conversation. Click into it, then try Insert.", "insert.box_not_found"],
    [
      "This was written for Bharti Agrawal, but Emma Stone's conversation is open now. Go back to Bharti Agrawal's conversation, or re-read this one.",
      "insert.wrong_target",
    ],
    ["This note is for a different profile than the one open. Open their profile, click Connect, then Insert.", "insert.wrong_target"],
    ["This note is 320 characters, but LinkedIn's note box allows 300 on your account. Shorten it (or Copy and edit), then Insert.", "insert.too_long"],
    ["Insert is turned off right now. Use Copy instead.", "insert.off"],
    ["Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy.", "insert.no_connection"],
    ["Click Comment on the post again, then try Insert.", "insert.recapture"],
    ['Click "Re-read this conversation", then Insert.', "insert.recapture"],
    ["Something new", "insert.failed"],
    [undefined, "insert.failed"],
  ])("Insert: %s → %s", (error, code) => {
    expect(insertFailureCode(error)).toBe(code);
  });

  it.each([
    ["Open the conversation on LinkedIn's Messaging page (not a chat pop-up), then try again.", null],
    ["LinkedIn is showing only your chat list right now, so the conversation isn't visible.", "read.hidden_thread"],
    ["No conversation is open. Pick a conversation on the left, then try again.", "read.no_conversation"],
    ["Something new", "read.failed"],
    [undefined, "read.failed"],
  ])("Read: %s → %s", (error, code) => {
    expect(readFailureCode(error)).toBe(code);
  });
});

describe("reportClientError", () => {
  it("posts the code and a fixed description, once a minute per failure", async () => {
    const fetchMock = okFetch(204);
    reportClientError("comments", "insert.box_not_found");
    reportClientError("comments", "insert.box_not_found");
    reportClientError("replies", "insert.box_not_found");
    await waitFor(() => expect(errorReports(fetchMock)).toHaveLength(2));
    expect(errorReports(fetchMock)[0]).toEqual({
      feature: "comments",
      code: "insert.box_not_found",
      message: "Insert couldn't find LinkedIn's text box.",
    });
    expect(errorReports(fetchMock)[1].feature).toBe("replies");
  });

  it("reports again after a minute", async () => {
    const fetchMock = okFetch(204);
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    reportClientError("messages", "tab_unreachable");
    now.mockReturnValue(1_000_000 + 59_000);
    reportClientError("messages", "tab_unreachable");
    now.mockReturnValue(1_000_000 + 61_000);
    reportClientError("messages", "tab_unreachable");
    await waitFor(() => expect(errorReports(fetchMock)).toHaveLength(2));
  });

  it("never throws or rejects when the report can't be sent", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(() => reportClientError("messages", "read.failed")).not.toThrow();
    delete chromeMock().__store.extensionToken;
    expect(() => reportClientError("messages", "insert.failed")).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe("Messages screen reports", () => {
  const READ = "carouselabs:read-conversation";
  const TAB = { id: 7, url: "https://www.linkedin.com/messaging/thread/2-bharti/" } as chrome.tabs.Tab;
  const CONVERSATION = {
    contact: { name: "Bharti Agrawal", headline: "Founder", profileUrl: "https://www.linkedin.com/in/bharti" },
    threadPath: "/messaging/thread/2-bharti/",
    thread: [{ sender: "them", text: "Happy to! What are you working on?" }],
  };
  const PROFILE = { id: "mp1", name: "Potential client", goal: "g", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: false };

  function server() {
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    const send = vi.fn(async (url: string) => {
      if (url.endsWith("/api/ext/errors")) return new Response(null, { status: 204 });
      if (url.endsWith("/api/ext/message")) return json(200, { message: "Sounds good — Tuesday?", freeRemaining: null, historyId: "h1" });
      if (url.endsWith("/api/ext/message-profiles")) return json(200, { profiles: [PROFILE] });
      if (url.endsWith("/api/ext/me")) return json(200, { defaultMessageProfileId: "mp1", extension: null });
      if (url.endsWith("/api/ext/config")) return json(200, { insertEnabled: true });
      if (url.includes("/api/ext/contacts")) return json(200, { contact: null, contacts: [] });
      return json(200, {});
    });
    vi.stubGlobal("fetch", send);
    return send;
  }

  beforeEach(() => {
    chromeMock().__store.settingsUploadedToAccount = true;
  });

  it("reports a failed read as a code", async () => {
    const fetchMock = server();
    chromeMock().tabs.query.mockResolvedValue([TAB]);
    chromeMock().tabs.sendMessage.mockResolvedValue({ ok: false, error: "No conversation is open. Pick a conversation on the left, then try again." });
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
    await waitFor(() => expect(errorReports(fetchMock)).toEqual([
      { feature: "messages", code: "read.no_conversation", message: "Couldn't find an open conversation on the Messaging page." },
    ]));
  });

  it("doesn't report someone who simply isn't on the Messaging page", async () => {
    const fetchMock = server();
    chromeMock().tabs.query.mockResolvedValue([TAB]);
    chromeMock().tabs.sendMessage.mockResolvedValue({
      ok: false,
      error: "Open the conversation on LinkedIn's Messaging page (not a chat pop-up), then try again.",
    });
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
    expect(await screen.findByText(/Messaging page \(not a chat pop-up\)/)).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(errorReports(fetchMock)).toEqual([]);
  });

  it("reports an unreachable LinkedIn tab, but not a tab that isn't LinkedIn", async () => {
    const fetchMock = server();
    chromeMock().tabs.query.mockResolvedValue([{ id: 9, url: "https://example.com/" }]);
    chromeMock().tabs.sendMessage.mockRejectedValue(new Error("Receiving end does not exist."));
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
    expect(await screen.findByText("Open a LinkedIn conversation in the active tab first.")).toBeTruthy();
    expect(errorReports(fetchMock)).toEqual([]);

    // On LinkedIn the panel first tries to repair the tab; here that fails too.
    chromeMock().tabs.query.mockResolvedValue([TAB]);
    (chromeMock().scripting.executeScript as Mock).mockRejectedValue(new Error("Frame with ID 0 was removed."));
    fireEvent.click(screen.getByRole("button", { name: "Read this conversation" }));
    await waitFor(() => expect(errorReports(fetchMock).map((r) => r.code)).toEqual(["tab_unreachable"]));
  });

  it("reports a refused Insert without the page's wording, which names people", async () => {
    const fetchMock = server();
    const refusal = "This was written for Bharti Agrawal, but Emma Stone's conversation is open now. Go back to Bharti Agrawal's conversation, or re-read this one.";
    chromeMock().tabs.query.mockResolvedValue([TAB]);
    chromeMock().tabs.sendMessage.mockImplementation(async (_id: number, message: { type?: string }) =>
      message.type === READ ? { ok: true, conversation: CONVERSATION } : { ok: false, error: refusal },
    );
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
    const generate = await screen.findByRole("button", { name: "Generate reply" });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
    fireEvent.click(await screen.findByRole("button", { name: "Insert" }));

    expect(await screen.findByText(refusal)).toBeTruthy();
    await waitFor(() => expect(errorReports(fetchMock).map((r) => r.code)).toEqual(["insert.wrong_target"]));
    const sent = (fetchMock.mock.calls as unknown as FetchCall[]).find(([url]) => url.endsWith("/api/ext/errors"))!;
    expect(String(sent[1]?.body)).not.toMatch(/Bharti|Emma/);
  });
});

describe("Account screen", () => {
  const BILLING = { status: null, renewsAt: null, endsAt: null, manageUrl: null };

  function me(extension: Record<string, unknown>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ email: "a@b.co", plan: "FREE", commentsThisMonth: 2, extension }), { status: 200 }),
      ),
    );
  }

  it("shows free access granted until a date, with nothing to pay or manage", async () => {
    me({
      access: "unlimited",
      freeUsed: 4,
      freeLimit: 10,
      // An old, lapsed subscription: its renewal date and portal no longer apply.
      status: "expired",
      renewsAt: "2026-09-01T00:00:00.000Z",
      endsAt: null,
      manageUrl: "https://carouselabs.lemonsqueezy.com/billing",
      source: "grant",
      grantEndsAt: "2026-12-31T12:00:00.000Z",
      suspended: false,
      features: { comments: true, replies: true, connection_notes: true, messages: true },
    });
    render(<AccountScreen />);
    const expected = new Date("2026-12-31T12:00:00.000Z").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    expect(await screen.findByText(`Unlimited until ${expected}`)).toBeTruthy();
    expect(screen.getByText("Free access from the CarouseLabs team. Nothing to pay.")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /manage subscription/i })).toBeNull();
    expect(screen.queryByText("Renews")).toBeNull();
    expect(screen.queryByRole("button", { name: /get unlimited/i })).toBeNull();
  });

  it("shows lifetime free access", async () => {
    me({ access: "unlimited", freeUsed: 0, freeLimit: 10, ...BILLING, source: "grant", grantEndsAt: null, suspended: false });
    render(<AccountScreen />);
    expect(await screen.findByText("Unlimited for life")).toBeTruthy();
  });

  it("says when Engage is paused, and how to ask about it", async () => {
    me({ access: "free", freeUsed: 2, freeLimit: 10, ...BILLING, source: "free", grantEndsAt: null, suspended: true });
    render(<AccountScreen />);
    expect(await screen.findByText("Paused")).toBeTruthy();
    expect(screen.getByText(/Engage is paused on this account/).textContent).toContain("support@carouselabs.com");
  });

  it("lists features switched off for the account", async () => {
    me({
      access: "free",
      freeUsed: 2,
      freeLimit: 10,
      ...BILLING,
      source: "free",
      grantEndsAt: null,
      suspended: false,
      features: { comments: true, replies: false, connection_notes: true, messages: false },
    });
    render(<AccountScreen />);
    expect(await screen.findByText("Turned off for this account: Replies, Messages.")).toBeTruthy();
  });

  it("counts a feature the server doesn't mention as on", async () => {
    me({ access: "free", freeUsed: 2, freeLimit: 10, ...BILLING, source: "free", grantEndsAt: null, suspended: false, features: { replies: false } });
    render(<AccountScreen />);
    expect(await screen.findByText("Turned off for this account: Replies.")).toBeTruthy();
  });

  it("keeps working with an older server that sends none of this", async () => {
    me({ access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: "2026-11-01T00:00:00.000Z", endsAt: null, manageUrl: "https://portal" });
    render(<AccountScreen />);
    expect(await screen.findByText("Unlimited")).toBeTruthy();
    expect(screen.getByText("Renews")).toBeTruthy();
    expect(screen.getByRole("button", { name: /manage subscription/i })).toBeTruthy();
    expect(screen.queryByText(/Turned off/)).toBeNull();
    expect(screen.queryByText("Paused")).toBeNull();
  });
});
