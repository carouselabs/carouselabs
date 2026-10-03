// The X extension's Profiles, History and Settings, run as the X build: X
// reply profiles come from and go to the X routes (never LinkedIn's), the
// builder is capped at the account's X limit, the Messages tab is the reasons
// shared with LinkedIn, History lists only X's rows, and Settings saves
// X Premium, Insert and the default X profile to X's own settings.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (import.meta.env as Record<string, string>).VITE_ENGAGE_PLATFORM = "x";
});

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { XProfilesScreen } from "@/x/sidepanel/screens/XProfilesScreen";
import { XSettingsScreen } from "@/x/sidepanel/screens/XSettingsScreen";
import { HistoryScreen } from "@/sidepanel/components/screens/HistoryScreen";
import App from "@/x/sidepanel/App";
import { chromeMock } from "../setup/chrome";

const stamp = "2026-10-01T00:00:00.000Z";
const profile = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id, userId: null, name, whoIAm: `${name} voice`, goal: "adds one useful insight", tone: "Conversational",
  length: "80-220 characters", emoji: "None", language: "English", alwaysDo: null, neverDo: null, samples: [],
  isDefault: false, isSystem: true, isRecommended: false, testsUsed: 0, createdAt: stamp, updatedAt: stamp, ...over,
});
const THOUGHTFUL = profile("sys-x-thoughtful-reply", "CarouseLabs — X Thoughtful Reply", { isDefault: true, isRecommended: true });
const QUICK = profile("sys-x-quick-reply", "CarouseLabs — X Quick Reply");
const MINE = profile("mine", "Punchy founder", { isSystem: false, userId: "u1" });
const OTHER = profile("other", "Calm explainer", { isSystem: false, userId: "u1" });

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[];
let settings: { defaultProfileId: string | null; maxReplyLength: number; insertButtonHidden: boolean };
let history: { entries: unknown[]; nextCursor: string | null };

function server() {
  calls = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      const path = new URL(url).pathname;
      if (path === "/api/ext/x/settings") {
        if (method === "PATCH") settings = { ...settings, ...body };
        return json(settings);
      }
      if (path === "/api/ext/x/profiles") {
        if (method === "POST") return json({ profile: { ...MINE, ...body, id: "new" } }, 201);
        return json({ profiles: [THOUGHTFUL, QUICK, MINE, OTHER], defaultProfileId: settings.defaultProfileId });
      }
      if (path.startsWith("/api/ext/x/profiles/")) return json({ ok: true });
      if (path === "/api/ext/message-profiles") return json({ profiles: [profile("m1", "Warm lead", { goal: "A lead" })] });
      if (path === "/api/ext/history") return json(history);
      if (path === "/api/ext/me") return json({ extension: null });
      if (path === "/api/ext/config") return json({ insertEnabled: true });
      return json({});
    }),
  );
}

const sent = (method: string, path: string) => calls.filter((c) => c.method === method && new URL(c.url).pathname === path);

beforeEach(() => {
  settings = { defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false };
  history = { entries: [], nextCursor: null };
  chromeMock().__store.extensionToken = "cl_cmt_x";
  server();
});

afterAll(() => {
  delete (import.meta.env as Record<string, string | undefined>).VITE_ENGAGE_PLATFORM;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("X Profiles", () => {
  it("lists X reply profiles from X's route, with the preset as default until one is chosen", async () => {
    render(<XProfilesScreen />);
    expect(await screen.findByText("Punchy founder")).toBeTruthy();
    expect(calls.some((c) => c.url.endsWith("/api/ext/profiles"))).toBe(false);
    const recommended = screen.getByRole("region", { name: "Recommended by CarouseLabs" });
    expect(within(recommended).getByText("Default")).toBeTruthy();
  });

  it("makes one of yours the default through X's settings", async () => {
    render(<XProfilesScreen />);
    await screen.findByText("Punchy founder");
    fireEvent.click(within(screen.getByRole("region", { name: "Your profiles" })).getAllByRole("button", { name: "Make default" })[0]);
    await waitFor(() => expect(sent("PATCH", "/api/ext/x/settings")[0]?.body).toEqual({ defaultProfileId: "mine" }));
    await waitFor(() =>
      expect(within(screen.getByRole("region", { name: "Your profiles" })).getAllByText("Default")).toHaveLength(1),
    );
  });

  it("deletes one of yours from X's route, after confirming", async () => {
    render(<XProfilesScreen />);
    await screen.findByText("Punchy founder");
    fireEvent.click(within(screen.getByRole("region", { name: "Your profiles" })).getAllByRole("button", { name: "Delete" })[0]);
    fireEvent.click(within(screen.getByRole("group", { name: "Delete Punchy founder?" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(sent("DELETE", "/api/ext/x/profiles/mine")).toHaveLength(1));
  });

  it("builds an X profile: X's words, X's routes, and a range no longer than the account's limit", async () => {
    render(<XProfilesScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "New profile" }));
    expect(screen.getByRole("heading", { name: "New X profile" })).toBeTruthy();
    expect((screen.getByLabelText("Max characters") as HTMLInputElement).max).toBe("280");

    fireEvent.change(screen.getByLabelText(/Profile name/), { target: { value: "Mine" } });
    fireEvent.change(screen.getByLabelText(/Who I am/), { target: { value: "A founder" } });
    fireEvent.change(screen.getByRole("textbox", { name: "X post to test on" }), { target: { value: "A post on X" } });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    await waitFor(() => expect(sent("POST", "/api/ext/x/profiles/test")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    await waitFor(() => expect(sent("POST", "/api/ext/x/profiles")).toHaveLength(1));
    expect(sent("POST", "/api/ext/x/profiles")[0].body).toMatchObject({ name: "Mine", length: "80-220 characters" });
  });

  it("lets an X Premium account set a longer range, up to what a profile allows", async () => {
    settings.maxReplyLength = 1000;
    render(<XProfilesScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "New profile" }));
    expect((screen.getByLabelText("Max characters") as HTMLInputElement).max).toBe("900");
  });

  it("opens straight into the builder when asked, once", async () => {
    const opened = vi.fn();
    render(<XProfilesScreen startInBuilder="replies" onBuilderOpened={opened} />);
    expect(await screen.findByRole("heading", { name: "New X profile" })).toBeTruthy();
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("shows the reasons shared with LinkedIn under Messages", async () => {
    render(<XProfilesScreen />);
    await screen.findByText("Punchy founder");
    fireEvent.click(screen.getByRole("radio", { name: "Messages" }));
    expect(await screen.findByText("Warm lead")).toBeTruthy();
    expect(calls.some((c) => c.url.endsWith("/api/ext/message-profiles"))).toBe(true);
  });
});

describe("X History", () => {
  const entry = (id: string, kind: string, postUrl: string) => ({
    id, kind, postAuthor: "Priya Raman", postUrl, postSnippet: "We cut onboarding", comment: `Text ${id}`,
    action: "NONE", createdAt: stamp, profileName: "Punchy founder",
  });

  it("asks for X's rows only, labels them, and links to x.com", async () => {
    history = {
      entries: [entry("h1", "x_reply", "https://x.com/priya/status/1"), entry("h2", "x_message", "https://x.com/i/chat/9")],
      nextCursor: "h2",
    };
    render(<HistoryScreen />);
    expect(await screen.findByText("Text h1")).toBeTruthy();
    expect(new URL(calls.find((c) => c.url.includes("/api/ext/history"))!.url).search).toBe("?platform=x");
    expect(screen.getByText("Reply")).toBeTruthy();
    expect(screen.getByText("Message")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View post" }));
    expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "https://x.com/priya/status/1" });
    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));
    expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "https://x.com/i/chat/9" });

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(calls.filter((c) => c.url.includes("/api/ext/history"))).toHaveLength(2));
    const more = new URL(calls.filter((c) => c.url.includes("/api/ext/history"))[1].url).searchParams;
    expect(more.get("platform")).toBe("x");
    expect(more.get("cursor")).toBe("h2");
  });

  it("never links anywhere but x.com", async () => {
    history = { entries: [entry("h1", "x_reply", "https://www.linkedin.com/feed/update/1")], nextCursor: null };
    render(<HistoryScreen />);
    await screen.findByText("Text h1");
    expect(screen.queryByRole("button", { name: "View post" })).toBeNull();
  });

  it("says what shows up here when empty", async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/Replies and messages you write for X show up here/)).toBeTruthy();
  });
});

describe("X Settings", () => {
  it("turns on X Premium for longer replies, and off again", async () => {
    render(<XSettingsScreen />);
    const premium = await screen.findByRole("switch", { name: "I have X Premium" });
    expect(premium.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/stay within X's 280 characters/)).toBeTruthy();

    fireEvent.click(premium);
    await waitFor(() => expect(sent("PATCH", "/api/ext/x/settings")[0]?.body).toEqual({ maxReplyLength: 1000 }));
    await waitFor(() => expect(premium.getAttribute("aria-checked")).toBe("true"));
    expect(screen.getByText(/up to 1,000 characters/)).toBeTruthy();

    fireEvent.click(premium);
    await waitFor(() => expect(sent("PATCH", "/api/ext/x/settings")[1]?.body).toEqual({ maxReplyLength: 280 }));
  });

  it("hides the Insert button through X's own settings", async () => {
    render(<XSettingsScreen />);
    const insert = await screen.findByRole("switch", { name: "Show the Insert button" });
    expect(insert.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(insert);
    await waitFor(() => expect(sent("PATCH", "/api/ext/x/settings")[0]?.body).toEqual({ insertButtonHidden: true }));
    expect(calls.some((c) => c.url.endsWith("/api/ext/settings"))).toBe(false);
  });

  it("shows the preset as the default X profile until one is chosen, and saves a new choice", async () => {
    render(<XSettingsScreen />);
    const trigger = await screen.findByRole("combobox", { name: "X profile" });
    expect(trigger.textContent).toContain("X Thoughtful Reply");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(await screen.findByRole("option", { name: "Calm explainer" }), { key: "Enter" });
    await waitFor(() => expect(sent("PATCH", "/api/ext/x/settings")[0]?.body).toEqual({ defaultProfileId: "other" }));
  });
});

describe("X panel", () => {
  it("opens the X profile builder from Home's + Create custom profile", async () => {
    (chromeMock().tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 4, url: "https://x.com/home" }]);
    render(<App />);
    const trigger = await screen.findByRole("combobox", { name: "X profile" });
    await waitFor(() => expect(trigger.textContent).toContain("X Thoughtful Reply"));
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(await screen.findByRole("option", { name: "+ Create custom profile" }), { key: "Enter" });
    expect(await screen.findByRole("heading", { name: "New X profile" })).toBeTruthy();
  });

  it("has History and Settings, with nothing left as a placeholder", async () => {
    render(<App />);
    await screen.findByRole("combobox", { name: "X profile" });
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("switch", { name: "I have X Premium" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText(/Replies and messages you write for X/)).toBeTruthy();
    expect(screen.queryByText(/Coming in the next step/)).toBeNull();
  });
});
