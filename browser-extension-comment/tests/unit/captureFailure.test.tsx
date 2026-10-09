// A Comment click the content script couldn't read (no post card around the
// button): Home says so, and tells the server, instead of staying silent.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

const LINKEDIN_TAB = { id: 5, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;
const PROFILE = { id: "p1", name: "Simple & Human", tone: "Friendly", isDefault: true, isSystem: true, isRecommended: true };
const POST = {
  mode: "comment", authorName: "Jane Doe", authorHeadline: "Founder", text: "Shipping small beats shipping big.",
  type: "text", url: "https://www.linkedin.com/feed/update/urn:li:activity:1", capturedAt: 1_000,
};
let reports: unknown[];

beforeEach(() => {
  reports = [];
  (chromeMock().tabs.query as unknown as Mock).mockImplementation(async () => [LINKEDIN_TAB]);
  Object.assign(chromeMock().__store, { extensionToken: "cl_cmt_abc", settingsUploadedToAccount: true });
  setExtensionAccess({ access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/ext/errors")) reports.push(JSON.parse(String(init?.body)));
      const body = url.includes("/api/ext/profiles")
        ? { profiles: [PROFILE] }
        : url.includes("/api/ext/me")
          ? { defaultCommentProfileId: null, commentsToday: 0, extension: null }
          : url.includes("/api/ext/config")
            ? { insertEnabled: true }
            : {};
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.unstubAllGlobals();
});

const failure = () => screen.queryByText(/Couldn.t read the post you clicked Comment on/);

async function clickFails(at: number) {
  await act(async () => {
    await chromeMock().storage.local.set({ lastCaptureFailure: { mode: "comment", at } });
  });
}

describe("a Comment click that couldn't be read", () => {
  it("is explained on Home and reported (code only)", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    await screen.findByText("Pick a post on LinkedIn");
    await clickFails(Date.now());
    expect(failure()).toBeTruthy();
    await waitFor(() => expect(reports).toEqual([expect.objectContaining({ feature: "comments", code: "capture.no_post" })]));
  });

  it("keeps the post picked before, says so, and goes away once a post is read", async () => {
    chromeMock().__store.lastSelectedPost = POST;
    render(<HomeScreen onCreateProfile={() => {}} />);
    await screen.findByText("Jane Doe");
    await clickFails(2_000);
    expect(failure()?.textContent).toMatch(/Below is the post you picked before/);

    await act(async () => {
      await chromeMock().storage.local.set({ lastSelectedPost: { ...POST, authorName: "Raj Patel", capturedAt: 3_000 } });
    });
    await screen.findByText("Raj Patel");
    expect(failure()).toBeNull();
  });

  it("an old failure found when the panel opens is not shown", async () => {
    chromeMock().__store.lastCaptureFailure = { mode: "comment", at: Date.now() - 60 * 60_000 };
    render(<HomeScreen onCreateProfile={() => {}} />);
    await screen.findByText("Pick a post on LinkedIn");
    expect(failure()).toBeNull();
  });

  it("a recent one is", async () => {
    chromeMock().__store.lastCaptureFailure = { mode: "comment", at: Date.now() - 5_000 };
    render(<HomeScreen onCreateProfile={() => {}} />);
    await waitFor(() => expect(failure()).toBeTruthy());
  });
});
