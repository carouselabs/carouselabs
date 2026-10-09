// A browser that blocks extensions on LinkedIn (the person turned off "Allow
// extensions on www.linkedin.com", or a policy did): no content script runs
// there, though the extension still holds the permission and sees the tab's
// address. Clicks go nowhere, so the panel says what's wrong and how to undo
// it, and Insert / Read say the same instead of "reload the page".
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { chromeMock } from "../setup/chrome";
import { contentScriptStatus, noContentScriptMessage, sendToTab, SiteBlocked } from "@/lib/tabs";
import { tabFailureCode } from "@/lib/errorReport";
import { SiteBlockedNotice, useSiteBlocked } from "@/sidepanel/components/SiteBlockedNotice";

const LINKEDIN_TAB = { id: 5, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;
const NO_RECEIVER = "Could not establish connection. Receiving end does not exist.";
let blocked: boolean;
let reports: unknown[];

beforeEach(() => {
  blocked = true;
  reports = [];
  const chrome = chromeMock();
  (chrome.tabs.query as unknown as Mock).mockImplementation(async () => [LINKEDIN_TAB]);
  let injected = false;
  (chrome.scripting.executeScript as Mock).mockImplementation(async () => {
    if (blocked) throw new Error("Blocked"); // what Edge answers
    injected = true;
    return [];
  });
  (chrome.tabs.sendMessage as Mock).mockImplementation(async () => {
    if (!injected) throw new Error(NO_RECEIVER);
    return { ok: true };
  });
  chrome.__store.extensionToken = "cl_cmt_abc";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/ext/errors")) reports.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("telling a blocked site apart", () => {
  it("is 'blocked' when the browser refuses to run the script (Edge: \"Blocked\"; a policy; Chrome: \"Cannot access contents\")", async () => {
    expect(await contentScriptStatus(LINKEDIN_TAB)).toBe("blocked");
    (chromeMock().scripting.executeScript as Mock).mockRejectedValueOnce(new Error("This page cannot be scripted due to an ExtensionsSettings policy."));
    expect(await contentScriptStatus(LINKEDIN_TAB)).toBe("blocked");
    (chromeMock().scripting.executeScript as Mock).mockRejectedValueOnce(new Error('Cannot access contents of url "https://www.linkedin.com/feed/".'));
    expect(await contentScriptStatus(LINKEDIN_TAB)).toBe("blocked");
  });

  it("is not 'blocked' when the page was just being replaced", async () => {
    (chromeMock().scripting.executeScript as Mock).mockRejectedValueOnce(new Error("Frame with ID 0 was removed."));
    expect(await contentScriptStatus(LINKEDIN_TAB)).toBe("failed");
  });

  it("Insert and Read say how to allow extensions instead of asking for a reload", async () => {
    const err = await sendToTab(LINKEDIN_TAB, { type: "x" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SiteBlocked);
    expect(tabFailureCode(err)).toBe("site_blocked");
    const message = noContentScriptMessage(LINKEDIN_TAB, "Open LinkedIn first.", err);
    expect(message).toMatch(/blocking extensions on LinkedIn/);
    expect(message).toMatch(/Allow extensions on www\.linkedin\.com/);
    expect(message).not.toMatch(/Reload the page, then try again/);
  });
});

function Panel() {
  const site = useSiteBlocked();
  return site.blocked ? <SiteBlockedNotice checking={site.checking} onCheck={site.check} /> : <p>fine</p>;
}

describe("the panel's notice", () => {
  it("explains the block in the browser's own words, and reports it", async () => {
    render(<Panel />);
    expect(await screen.findByRole("heading", { name: /is blocking extensions on LinkedIn/ })).toBeTruthy();
    expect(screen.getByText("Allow extensions on www.linkedin.com")).toBeTruthy();
    await waitFor(() => expect(reports).toEqual([expect.objectContaining({ code: "site_blocked" })]));
  });

  it("goes away on Check again once the person has allowed extensions (and the tab now works)", async () => {
    render(<Panel />);
    await screen.findByRole("heading", { name: /is blocking extensions/ });
    blocked = false;
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    await screen.findByText("fine");
    expect(chromeMock().scripting.executeScript).toHaveBeenCalled();
  });

  it("checks again by itself when the LinkedIn tab reloads", async () => {
    render(<Panel />);
    await screen.findByRole("heading", { name: /is blocking extensions/ });
    blocked = false;
    await act(async () => {
      for (const fn of [...chromeMock().tabs.onUpdated.listeners]) fn(5, { status: "complete" }, LINKEDIN_TAB);
    });
    await screen.findByText("fine");
  });

  it.each([
    ["Google Chrome", "Chrome", "puzzle piece"],
    ["Microsoft Edge", "Edge", "puzzle piece"],
    ["Brave", "Brave", "puzzle piece"],
    ["Opera", "Opera", "cube"],
  ])("names the browser it is in: %s", async (brand, name, icon) => {
    Object.defineProperty(navigator, "userAgentData", { configurable: true, value: { brands: [{ brand: "Chromium", version: "154" }, { brand, version: "154" }] } });
    try {
      render(<Panel />);
      expect(await screen.findByRole("heading", { name: `${name} is blocking extensions on LinkedIn` })).toBeTruthy();
      expect(screen.getByText(new RegExp(`icon \\(${icon}\\) next`))).toBeTruthy();
      const err = await sendToTab(LINKEDIN_TAB, { type: "x" }).catch((e: unknown) => e);
      expect(noContentScriptMessage(LINKEDIN_TAB, "Open LinkedIn first.", err)).toMatch(new RegExp(`^${name} is blocking extensions on LinkedIn\\. Click the Extensions icon \\(${icon}\\)`));
    } finally {
      delete (navigator as { userAgentData?: unknown }).userAgentData;
    }
  });

  it("shows nothing on a site that works", async () => {
    blocked = false;
    render(<Panel />);
    await waitFor(() => expect(chromeMock().tabs.sendMessage).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: /is blocking extensions/ })).toBeNull();
  });
});
