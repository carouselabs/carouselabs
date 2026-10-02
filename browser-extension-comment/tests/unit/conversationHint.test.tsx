// Pointing people to Messages when a LinkedIn conversation is open: the
// address check (only the address, never the page), the "AI" badge on the
// toolbar icon, and in the panel the hint card, the dot on Messages, the
// one-click read, and the prompt when the tab moves to another conversation.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/sidepanel/App";
import { ONBOARDING_DONE_STORAGE_KEY } from "@/sidepanel/components/Onboarding";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { conversationPath, sameConversation } from "@/lib/tabs";
import { chromeMock } from "../setup/chrome";

const READ = "carouselabs:read-conversation";
const BHARTI_URL = "https://www.linkedin.com/messaging/thread/2-bharti/";
const EMMA_URL = "https://www.linkedin.com/messaging/thread/2-emma/?miniProfileUrn=x";
const FEED_URL = "https://www.linkedin.com/feed/";

const conversationWith = (name: string, threadPath: string) => ({
  contact: { name, headline: "Founder", profileUrl: `https://www.linkedin.com/in/${name.toLowerCase()}` },
  threadPath,
  thread: [{ sender: "them", text: "Happy to! What are you working on?" }],
});

describe("conversationPath", () => {
  it.each([
    [BHARTI_URL, "/messaging/thread/2-bharti/"],
    ["https://www.linkedin.com/messaging/thread/2-bharti", "/messaging/thread/2-bharti/"],
    [EMMA_URL, "/messaging/thread/2-emma/"],
    ["https://www.linkedin.com/messaging/thread/2-ab%3D%3D/", "/messaging/thread/2-ab%3D%3D/"],
    ["https://www.linkedin.com/messaging/", null],
    ["https://www.linkedin.com/messaging/thread/new/", null],
    [FEED_URL, null],
    ["https://www.linkedin.com/in/bharti/", null],
    ["https://example.com/messaging/thread/2-bharti/", null],
    ["https://www.linkedin.com.evil.example/messaging/thread/2-x/", null],
    [undefined, null],
  ])("%s → %s", (url, path) => {
    expect(conversationPath(url)).toBe(path);
  });

  it("matches a thread path with or without the trailing slash", () => {
    expect(sameConversation("/messaging/thread/2-bharti/", "/messaging/thread/2-bharti")).toBe(true);
    expect(sameConversation("/messaging/thread/2-bharti/", "/messaging/thread/2-emma/")).toBe(false);
  });
});

describe("toolbar icon", () => {
  async function loadWorker() {
    vi.resetModules();
    await import("@/background");
  }
  const update = (tabId: number, change: chrome.tabs.TabChangeInfo, tab: Partial<chrome.tabs.Tab>) => {
    for (const fn of [...chromeMock().tabs.onUpdated.listeners]) fn(tabId, change, { id: tabId, ...tab } as chrome.tabs.Tab);
  };

  it("shows AI on a conversation and clears it when the tab moves on", async () => {
    await loadWorker();
    const chrome = chromeMock();

    update(5, { url: BHARTI_URL }, { url: BHARTI_URL });
    expect(chrome.__badges.get(5)).toBe("AI");
    expect(chrome.__titles.get(5)).toBe("Get AI help replying to this conversation");

    // LinkedIn moving to the feed without loading a page.
    update(5, { url: FEED_URL }, { url: FEED_URL });
    expect(chrome.__badges.get(5)).toBe("");
    expect(chrome.__titles.get(5)).toBe("CarouseLabs Engage");

    // Back to a conversation, then off to another site, whose address the
    // extension can't see: the load alone clears it.
    update(5, { url: BHARTI_URL }, { url: BHARTI_URL });
    update(5, { status: "loading" }, {});
    expect(chrome.__badges.get(5)).toBe("");
  });

  it("leaves other tabs alone", async () => {
    await loadWorker();
    update(5, { url: BHARTI_URL }, { url: BHARTI_URL });
    update(6, { url: FEED_URL }, { url: FEED_URL });
    expect(chromeMock().__badges.get(5)).toBe("AI");
    expect(chromeMock().__badges.get(6)).toBe("");
  });

  it("marks conversations already open when the worker starts", async () => {
    (chromeMock().tabs.query as Mock).mockImplementation(async (info: chrome.tabs.QueryInfo) =>
      info.url === "https://www.linkedin.com/messaging/thread/*" ? [{ id: 9, url: BHARTI_URL }] : [],
    );
    await loadWorker();
    await waitFor(() => expect(chromeMock().__badges.get(9)).toBe("AI"));
  });
});

describe("side panel", () => {
  let activeUrl = BHARTI_URL;
  let openConversation = conversationWith("Bharti", "/messaging/thread/2-bharti/");
  const PROFILE = { id: "mp1", name: "Potential client", goal: "g", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: false };

  function server() {
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/api/ext/message-profiles")) return json({ profiles: [PROFILE] });
        if (url.endsWith("/api/ext/profiles")) return json({ profiles: [] });
        if (url.endsWith("/api/ext/me")) return json({ defaultCommentProfileId: null, defaultMessageProfileId: null, commentsToday: 0, extension: null });
        if (url.endsWith("/api/ext/config")) return json({ insertEnabled: true });
        if (url.includes("/api/ext/contacts")) return json({ contact: null, contacts: [] });
        return json({});
      }),
    );
  }

  // The tab moves to another address, as Chrome reports it to the panel.
  function navigate(url: string) {
    activeUrl = url;
    for (const fn of [...chromeMock().tabs.onUpdated.listeners]) fn(7, { url }, { id: 7, url, active: true } as chrome.tabs.Tab);
  }

  const reads = () => (chromeMock().tabs.sendMessage as Mock).mock.calls.filter(([, m]) => (m as { type?: string })?.type === READ);
  const messagesButton = () => screen.getByRole("button", { name: "Messages" });

  beforeEach(() => {
    activeUrl = BHARTI_URL;
    openConversation = conversationWith("Bharti", "/messaging/thread/2-bharti/");
    const chrome = chromeMock();
    Object.assign(chrome.__store, {
      extensionToken: "cl_cmt_abc",
      [ONBOARDING_DONE_STORAGE_KEY]: true,
      settingsUploadedToAccount: true,
    });
    (chrome.tabs.query as Mock).mockImplementation(async () => [{ id: 7, url: activeUrl, active: true }]);
    (chrome.tabs.sendMessage as Mock).mockImplementation(async (_id: number, message: { type?: string }) =>
      message?.type === READ ? { ok: true, conversation: openConversation } : { ok: true },
    );
    server();
  });

  afterEach(() => {
    cleanup();
    setExtensionAccess(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers help on a conversation, and one click opens Messages with it read", async () => {
    render(<App />);
    const write = await screen.findByRole("button", { name: "Write a reply with AI" });
    expect(screen.getByRole("heading", { name: "Replying to someone?" })).toBeTruthy();
    expect(screen.getByTestId("attention-dot-messages")).toBeTruthy();
    expect(messagesButton().getAttribute("aria-describedby")).toBeTruthy();
    // Nothing is read just for being on the page.
    expect(reads()).toHaveLength(0);

    fireEvent.click(write);
    expect(await screen.findByText("Bharti")).toBeTruthy();
    expect(reads()).toHaveLength(1);
    // The conversation got its default reason, so Generate is ready.
    const generate = await screen.findByRole("button", { name: /^Generate (reply|opener)$/ });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    // On Messages, neither the card nor the dot.
    expect(screen.queryByRole("button", { name: "Write a reply with AI" })).toBeNull();
    expect(screen.queryByTestId("attention-dot-messages")).toBeNull();
  });

  it("says nothing off a conversation, and appears when one is opened", async () => {
    activeUrl = FEED_URL;
    render(<App />);
    await screen.findByRole("button", { name: "Generate" });
    expect(screen.queryByRole("button", { name: "Write a reply with AI" })).toBeNull();
    expect(screen.queryByTestId("attention-dot-messages")).toBeNull();

    navigate(BHARTI_URL);
    expect(await screen.findByRole("button", { name: "Write a reply with AI" })).toBeTruthy();
    navigate(FEED_URL);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Write a reply with AI" })).toBeNull());
  });

  it("Not now hides the card for that conversation only; the dot stays", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("button", { name: "Write a reply with AI" })).toBeNull();
    expect(screen.getByTestId("attention-dot-messages")).toBeTruthy();

    openConversation = conversationWith("Emma", "/messaging/thread/2-emma/");
    navigate(EMMA_URL);
    expect(await screen.findByRole("button", { name: "Write a reply with AI" })).toBeTruthy();
  });

  it("opening Messages from the side bar doesn't read by itself", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Write a reply with AI" });
    fireEvent.click(messagesButton());
    expect(await screen.findByRole("button", { name: "Read this conversation" })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(reads()).toHaveLength(0);
  });

  it("reads on open only right after the card's button, not on a later visit", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Write a reply with AI" }));
    expect(await screen.findByText("Bharti")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    await screen.findByRole("button", { name: "Write a reply with AI" });
    fireEvent.click(messagesButton());
    expect(await screen.findByRole("button", { name: "Read this conversation" })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(reads()).toHaveLength(1);
  });

  it("notices a switch to someone else's conversation and reads it on request", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Write a reply with AI" }));
    expect(await screen.findByText("Bharti")).toBeTruthy();
    expect(screen.queryByText("You opened a different conversation.")).toBeNull();

    openConversation = conversationWith("Emma", "/messaging/thread/2-emma/");
    navigate(EMMA_URL);
    expect(await screen.findByText("You opened a different conversation.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Read this one" }));
    expect(await screen.findByText("Emma")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("You opened a different conversation.")).toBeNull());
    expect(reads()).toHaveLength(2);
  });
});
