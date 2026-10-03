// The LinkedIn panel's Home while another site is the active tab: it points
// back to LinkedIn instead of writing, keeps what was already written for
// Copy, and holds Insert, Regenerate and Shorter / Longer until LinkedIn is
// the active tab again. Comments and connection notes alike.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

const LINKEDIN_TAB = { id: 5, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;
const OTHER_SITE = { id: 12 } as chrome.tabs.Tab; // no address: no permission for it
let active: chrome.tabs.Tab;

async function switchTo(tab: chrome.tabs.Tab) {
  active = tab;
  await act(async () => {
    for (const fn of [...chromeMock().tabs.onActivated.listeners]) fn({ tabId: tab.id!, windowId: 1 });
  });
}

function server(routes: Record<string, (body: Record<string, unknown> | null) => unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      const route = Object.entries(routes).find(([path]) => url.includes(path));
      return new Response(JSON.stringify(route ? route[1](body) : {}), { status: 200 });
    }),
  );
}

const PROFILE = { id: "p1", name: "CarouseLabs — Simple & Human", tone: "Friendly", isDefault: true, isSystem: true, isRecommended: true };
const NOTE_PROFILE = { id: "cp1", name: "Warm intro", angle: "", goal: "Get the invite accepted", tone: "friendly", length: "90-180 characters", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true };
const TARGET = { name: "Maya Lindqvist", headline: "Talent Partner", currentRole: "Talent Partner at Northwind", about: "", url: "https://www.linkedin.com/in/maya", capturedAt: 1 };

beforeEach(() => {
  active = LINKEDIN_TAB;
  (chromeMock().tabs.query as unknown as Mock).mockImplementation(async (info: chrome.tabs.QueryInfo) =>
    info.url ? [LINKEDIN_TAB] : [active],
  );
  Object.assign(chromeMock().__store, { extensionToken: "cl_cmt_abc", settingsUploadedToAccount: true });
  setExtensionAccess({ access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null });
  server({
    "/api/ext/generate": () => ({ comment: "Paying for reach only works once the post already earns it.", freeRemaining: null, historyId: "h1" }),
    "/api/ext/connection-note": () => ({ note: "Hi Maya, I hire for platform teams too. Would be glad to connect.", freeRemaining: null, historyId: "h2" }),
    "/api/ext/connection-profiles": () => ({ profiles: [NOTE_PROFILE] }),
    "/api/ext/profiles": () => ({ profiles: [PROFILE] }),
    "/api/ext/me": () => ({ defaultCommentProfileId: null, defaultConnectionProfileId: "cp1", commentsToday: 0, extension: null }),
    "/api/ext/settings": () => ({ connectNoteContext: { choice: "none", purpose: "" }, connectNoteLength: null, linkedinProfile: null, insertButtonHidden: false }),
    "/api/ext/config": () => ({ insertEnabled: true }),
  });
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.unstubAllGlobals();
});

const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("off LinkedIn: comments", () => {
  beforeEach(() => {
    chromeMock().__store.lastSelectedPost = {
      mode: "comment", authorName: "Anthony N.", authorHeadline: "Founder", text: "LinkedIn algorithm solved. Just pay for reach.",
      type: "text", url: "https://www.linkedin.com/feed/update/urn:li:activity:1", capturedAt: 1,
    };
  });

  it("keeps a written comment for Copy; Insert, Regenerate and Shorter wait for LinkedIn", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    const generate = await screen.findByRole("button", { name: "Generate" });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
    const box = () => screen.getByRole("textbox", { name: "Your comment" }) as HTMLTextAreaElement;
    await waitFor(() => expect(box().value).toContain("Paying for reach"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Insert" })).toBeTruthy());

    await switchTo(OTHER_SITE);
    expect(await screen.findByText("You're not on LinkedIn")).toBeTruthy();
    expect(box().value).toContain("Paying for reach");
    expect(button("Copy").disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Insert" })).toBeNull();
    expect(button("Regenerate").disabled).toBe(true);
    expect(button("Shorter").disabled).toBe(true);

    await switchTo(LINKEDIN_TAB);
    await waitFor(() => expect(screen.queryByText("You're not on LinkedIn")).toBeNull());
    expect(screen.getByRole("button", { name: "Insert" })).toBeTruthy();
    expect(button("Regenerate").disabled).toBe(false);
    expect(button("Shorter").disabled).toBe(false);
  });
});

describe("off LinkedIn: connection notes", () => {
  beforeEach(() => {
    chromeMock().__store.lastSelectedPost = {
      mode: "connect", authorName: "Maya Lindqvist", authorHeadline: "Talent Partner", text: "", type: "text",
      url: "https://www.linkedin.com/in/maya", capturedAt: 1, connect: { target: TARGET },
    };
  });

  it("points back to LinkedIn instead of Generate note", async () => {
    active = OTHER_SITE;
    render(<HomeScreen onCreateProfile={() => {}} />);
    expect(await screen.findByText("You're not on LinkedIn")).toBeTruthy();
    expect(await screen.findByText("Maya Lindqvist")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Generate note" })).toBeNull();
  });

  it("keeps a written note for Copy; Insert and Regenerate wait for LinkedIn", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    const generate = await screen.findByRole("button", { name: "Generate note" });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
    const box = () => screen.getByRole("textbox", { name: "Your note" }) as HTMLTextAreaElement;
    await waitFor(() => expect(box().value).toContain("Hi Maya"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Insert" })).toBeTruthy());

    await switchTo(OTHER_SITE);
    expect(await screen.findByText("You're not on LinkedIn")).toBeTruthy();
    expect(box().value).toContain("Hi Maya");
    expect(button("Copy").disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Insert" })).toBeNull();
    expect(button("Regenerate").disabled).toBe(true);
  });
});
