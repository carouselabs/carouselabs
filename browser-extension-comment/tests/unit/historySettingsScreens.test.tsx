// History: rows say what was written, for whom, when, and what was done with
// it in words; search narrows them; nothing yet gets an explanation.
// Settings: a change applies at once and says "Saved".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HistoryScreen } from "@/sidepanel/components/screens/HistoryScreen";
import { SettingsScreen } from "@/sidepanel/components/screens/SettingsScreen";
import { chromeMock } from "../setup/chrome";

const HISTORY = {
  nextCursor: null,
  entries: [
    { id: "h1", kind: "comment", postAuthor: "Priya Raman", postUrl: "https://www.linkedin.com/feed/update/1", postSnippet: "Onboarding", comment: "Order beats count.", action: "COPIED", createdAt: new Date().toISOString(), profileName: "Thoughtful Expert" },
    { id: "h2", kind: "connection_note", postAuthor: "Maya Lindqvist", postUrl: "https://www.linkedin.com/in/maya", postSnippet: "Talent Partner", comment: "Would be good to connect.", action: "NONE", createdAt: "2026-01-02T10:00:00.000Z", profileName: "Warm intro" },
  ],
};

type Call = { url: string; method: string; body?: string };

function server(routes: Record<string, unknown>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
      const path = new URL(url).pathname;
      const body = init?.method === "PATCH" ? { ...(routes[path] as object), ...JSON.parse(init.body as string) } : routes[path];
      return new Response(JSON.stringify(body ?? {}), { status: 200 });
    }),
  );
  return calls;
}

beforeEach(() => {
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.settingsUploadedToAccount = true;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("History screen", () => {
  it("labels each row in words and filters by search", async () => {
    server({ "/api/ext/history": HISTORY });
    render(<HistoryScreen />);

    expect(await screen.findByText("Order beats count.")).toBeTruthy();
    expect(screen.getByText("Comment")).toBeTruthy();
    expect(screen.getByText("Connection note")).toBeTruthy();
    expect(screen.getByText("Copied")).toBeTruthy();
    expect(screen.queryByText("NONE")).toBeNull();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search history" }), { target: { value: "maya" } });
    expect(screen.queryByText("Order beats count.")).toBeNull();
    expect(screen.getByText("Would be good to connect.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Order beats count.")).toBeTruthy();
  });

  it("explains an empty history", async () => {
    server({ "/api/ext/history": { nextCursor: null, entries: [] } });
    render(<HistoryScreen />);
    expect(await screen.findByText("Nothing yet")).toBeTruthy();
  });
});

describe("Settings screen", () => {
  it("applies a switch at once and confirms it", async () => {
    const calls = server({
      "/api/ext/settings": { defaultCommentProfileId: null, defaultLanguage: null },
      "/api/ext/profiles": { profiles: [] },
      "/api/ext/config": { insertEnabled: true },
    });
    render(<SettingsScreen />);

    const show = await screen.findByRole("switch", { name: "Show the Insert button" });
    await waitFor(() => expect((show as HTMLButtonElement).disabled).toBe(false));
    expect(show.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(show);

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH" && c.body?.includes('"insertButtonHidden":true'))).toBe(true));
    expect(await screen.findByText("Saved")).toBeTruthy();
    await waitFor(() => expect(show.getAttribute("aria-checked")).toBe("false"));
  });

  it("has no Insert warning to switch on or off", async () => {
    server({
      "/api/ext/settings": { defaultCommentProfileId: null, defaultLanguage: null },
      "/api/ext/profiles": { profiles: [] },
      "/api/ext/config": { insertEnabled: true },
    });
    render(<SettingsScreen />);
    await screen.findByRole("switch", { name: "Show the Insert button" });
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.queryByText(/warn|risk|safer/i)).toBeNull();
  });
});
