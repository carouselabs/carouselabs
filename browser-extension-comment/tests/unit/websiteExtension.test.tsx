// The website's Extension section (components/extension/* in the Next.js
// project): Voice profiles, History and Settings, driven through their UI
// against a stubbed API. Checks that what the website sends is what the
// shared app/api/ext routes expect, so a change here reaches the extension.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProfilesManager } from "../../../components/extension/ProfilesManager";
import { HistoryList } from "../../../components/extension/HistoryList";
import { ExtensionSettingsForm } from "../../../components/extension/ExtensionSettingsForm";
import { XReplyProfiles, XSettingsPanel } from "../../../components/extension/XExtensionViews";
import { ExtensionTabs } from "../../../components/extension/ExtensionTabs";
import { DevicesList } from "../../../components/extension/DevicesList";
import { InstallSteps } from "../../../components/extension/InstallSteps";
import { ExtensionPlanSection } from "../../../components/extension/ExtensionPlanSection";
import { platformOfPath, tabPathOf } from "../../../components/extension/engageExtensions";
import { EXTENSION_STORE_URL, X_EXTENSION_STORE_URL } from "../../../lib/plans";
import type { ExtAccessSummary } from "../../../lib/extAccess";

const nav = vi.hoisted(() => ({ pathname: "/extension" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
// Next's Link brings the website's own React; a plain link is all the tab row needs.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

type Call = { url: string; method: string; body: unknown };

function server(routes: Record<string, unknown | ((call: Call) => unknown)>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call = { url, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined };
      calls.push(call);
      const key = Object.keys(routes)
        .sort((a, b) => b.length - a.length)
        .find((k) => `${call.method} ${url}`.startsWith(k));
      if (!key) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      const route = routes[key];
      const body = typeof route === "function" ? (route as (c: Call) => unknown)(call) : route;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
  return calls;
}

// "New profile" stays disabled until the list has loaded, on purpose.
async function newProfileButton() {
  const button = await screen.findByRole("button", { name: /new profile/i });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  return button;
}

const ME = {
  email: "a@b.co",
  plan: "FREE",
  commentsThisMonth: 0,
  commentsToday: 0,
  defaultCommentProfileId: null,
  defaultConnectionProfileId: null,
  defaultMessageProfileId: null,
  defaultLanguage: null,
  insertWarningHidden: false,
};

const SYSTEM_PROFILE = {
  id: "sys1",
  userId: null,
  name: "Thoughtful Peer",
  whoIAm: "A peer in the same field",
  goal: "adds one useful insight",
  tone: "friendly",
  length: "Medium (2-3 sentences)",
  emoji: "None",
  language: "English",
  alwaysDo: null,
  neverDo: null,
  samples: [],
  isSystem: true,
  isRecommended: true,
  isDefault: true,
};

describe("website — voice profiles", () => {
  it("creates a comment profile with exactly what the shared route expects", async () => {
    const calls = server({
      "GET /api/ext/me": ME,
      "GET /api/ext/profiles": { profiles: [SYSTEM_PROFILE] },
      "POST /api/ext/profiles": { profile: { id: "new1" } },
    });
    render(<ProfilesManager />);

    fireEvent.click(await newProfileButton());
    fireEvent.change(screen.getByPlaceholderText("e.g. Founder voice"), { target: { value: "My voice" } });
    fireEvent.change(screen.getByPlaceholderText(/B2B SaaS founder/), { target: { value: "A founder" } });
    fireEvent.click(screen.getByRole("button", { name: /add sample/i }));
    fireEvent.change(screen.getByPlaceholderText("Sample 1"), { target: { value: "  Great point.  " } });
    fireEvent.click(screen.getByRole("button", { name: /create profile/i }));

    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/ext/profiles");
    expect(post.body).toMatchObject({
      name: "My voice",
      whoIAm: "A founder",
      goal: "adds one useful insight",
      tone: "professional",
      length: "100-220 characters",
      emoji: "None",
      language: "English",
      samples: ["Great point."],
      setAsDefault: false,
    });
  });

  it("won't save a length the server would reject", async () => {
    server({ "GET /api/ext/me": ME, "GET /api/ext/profiles": { profiles: [] } });
    render(<ProfilesManager />);
    fireEvent.click(await newProfileButton());
    fireEvent.change(screen.getByPlaceholderText("e.g. Founder voice"), { target: { value: "x" } });
    fireEvent.change(screen.getByPlaceholderText(/B2B SaaS founder/), { target: { value: "y" } });
    fireEvent.change(screen.getByLabelText("Minimum characters"), { target: { value: "5" } });
    expect(screen.getByText(/between 15 and 900 characters/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /create profile/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("has no limit on custom tones, whatever the web plan", async () => {
    const custom = (n: number) => ({ ...SYSTEM_PROFILE, id: `c${n}`, userId: "u1", name: `Mine ${n}`, isSystem: false, isRecommended: false, isDefault: false });
    server({ "GET /api/ext/me": ME, "GET /api/ext/profiles": { profiles: [SYSTEM_PROFILE, custom(1), custom(2), custom(3)] } });
    render(<ProfilesManager />);
    fireEvent.click(await newProfileButton());
    expect(screen.getByRole("button", { name: /create profile/i })).toBeTruthy();
    expect(screen.queryByText(/plan allows/)).toBeNull();
  });

  it("sets the default through the same settings route the extension reads", async () => {
    const calls = server({
      "GET /api/ext/me": ME,
      "GET /api/ext/connection-profiles": {
        profiles: [{ id: "n1", name: "Warm intro", angle: "A peer", goal: "Connect", tone: "Warm", length: "120-220 characters", alwaysDo: null, neverDo: null, samples: [], isSystem: true, isRecommended: false, isDefault: false }],
      },
      "PATCH /api/ext/settings": {},
    });
    render(<ProfilesManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Connection notes" }));
    const card = (await screen.findByText("Warm intro")).closest("div.rounded-2xl") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: /make default/i }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ defaultConnectionProfileId: "n1" });
  });
});

describe("website — history", () => {
  const entry = (id: string, kind: string) => ({
    id,
    kind,
    postAuthor: "Sam",
    postUrl: kind === "message" ? "https://www.linkedin.com/messaging/thread/2-x/" : "javascript:alert(1)",
    postSnippet: "What's the drop-off?",
    comment: `Generated ${id}`,
    action: "NONE",
    createdAt: "2026-09-20T10:00:00Z",
    profileName: "Just continue",
  });

  it("filters by kind on the server, links only to LinkedIn, and deletes a row", async () => {
    const calls = server({
      "GET /api/ext/history?limit=30&kind=message": { entries: [entry("m1", "message")], nextCursor: null },
      "GET /api/ext/history": { entries: [entry("c1", "comment"), entry("m1", "message")], nextCursor: null },
      "DELETE /api/ext/history/m1": { ok: true },
    });
    render(<HistoryList />);
    expect(await screen.findByText("Generated c1")).toBeTruthy();
    // The comment's postUrl isn't LinkedIn, so it gets no link.
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "https://www.linkedin.com/messaging/thread/2-x/",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    await waitFor(() => expect(screen.queryByText("Generated c1")).toBeNull());
    expect(calls.some((c) => c.url.includes("kind=message"))).toBe(true);
    expect(screen.getByText("Message to Sam")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Generated m1")).toBeNull());
    expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/ext/history/m1")).toBe(true);
  });
});

describe("website — settings", () => {
  it("saves each change through the shared settings route", async () => {
    const calls = server({
      "GET /api/ext/settings": ME,
      "GET /api/ext/profiles": { profiles: [SYSTEM_PROFILE] },
      "GET /api/ext/connection-profiles": { profiles: [] },
      "GET /api/ext/message-profiles": { profiles: [] },
      "PATCH /api/ext/settings": (call: Call) => ({ ...ME, ...(call.body as object) }),
    });
    render(<ExtensionSettingsForm />);
    const language = (await screen.findByText("Default language")).closest("div.grid") as HTMLElement;
    fireEvent.change(within(language).getByRole("combobox"), { target: { value: "Hindi" } });
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ defaultLanguage: "Hindi" });

    // There is no Insert warning to switch any more.
    expect(screen.queryByRole("checkbox", { name: /warning/i })).toBeNull();

    // Used to be set per browser only; now the website sets it for the account.
    fireEvent.click(screen.getByRole("checkbox", { name: /show the insert button/i }));
    await waitFor(() => expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2));
    expect(calls.filter((c) => c.method === "PATCH")[1].body).toEqual({ insertButtonHidden: true });
  });
});

describe("website — connection note settings", () => {
  it("saves the note context, length and an edited LinkedIn profile for the extension to use", async () => {
    const calls = server({
      "GET /api/ext/me": ME,
      "GET /api/ext/connection-profiles": { profiles: [] },
      "GET /api/ext/settings": {
        ...ME,
        connectNoteContext: { choice: "profile", purpose: "" },
        connectNoteLength: { preset: "medium", min: 150, max: 280 },
        linkedinProfile: { name: "Anant", headline: "Founder", currentRole: "", about: "", url: "", capturedAt: 5 },
        insertButtonHidden: null,
      },
      "PATCH /api/ext/settings": {},
    });
    render(<ProfilesManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Connection notes" }));

    const headline = await screen.findByPlaceholderText("Headline");
    expect((headline as HTMLInputElement).value).toBe("Founder");
    fireEvent.change(headline, { target: { value: "Founder, CarouseLabs" } });
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Minimum characters"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Maximum characters"), { target: { value: "220" } });
    fireEvent.click(screen.getByRole("button", { name: /save note settings/i }));

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const body = calls.find((c) => c.method === "PATCH")!.body as Record<string, unknown> & { linkedinProfile: { capturedAt: number } };
    expect(body.connectNoteContext).toEqual({ choice: "profile", purpose: "" });
    expect(body.connectNoteLength).toEqual({ preset: "custom", min: 100, max: 220 });
    expect(body.linkedinProfile).toMatchObject({ name: "Anant", headline: "Founder, CarouseLabs" });
    // Stamped now, so it wins over the extension's older copy.
    expect(body.linkedinProfile.capturedAt).toBeGreaterThan(5);
  });

  it("won't save a custom purpose that's empty, or a length out of range", async () => {
    server({
      "GET /api/ext/me": ME,
      "GET /api/ext/connection-profiles": { profiles: [] },
      "GET /api/ext/settings": { ...ME, connectNoteContext: null, connectNoteLength: null, linkedinProfile: null, insertButtonHidden: null },
    });
    render(<ProfilesManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Connection notes" }));
    fireEvent.click(await screen.findByRole("radio", { name: /write my own purpose/i }));
    const save = screen.getByRole("button", { name: /save note settings/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/I help SaaS founders/), { target: { value: "I help founders" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Maximum characters"), { target: { value: "400" } });
    expect(screen.getByText(/between 40 and 280 characters/)).toBeTruthy();
    expect(save.disabled).toBe(true);
  });
});

describe("website — conversations", () => {
  const CONTACT = {
    id: "k1",
    contactUrl: "/in/sam-lee",
    contactName: "Sam Lee",
    choice: "flow",
    profileId: null,
    purpose: "",
    tone: "Natural",
    updatedAt: "2026-09-20T10:00:00Z",
  };

  it("changes one person's reason and tone, keyed by their profile", async () => {
    const calls = server({
      "GET /api/ext/me": ME,
      "GET /api/ext/message-profiles": { profiles: [] },
      "GET /api/ext/contacts": { contacts: [CONTACT] },
      "PUT /api/ext/contacts": (call: Call) => ({ contact: { ...CONTACT, ...(call.body as object) } }),
    });
    render(<ProfilesManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Conversations" }));
    expect(await screen.findByText("Sam Lee")).toBeTruthy();
    expect(screen.getByRole("link", { name: /profile/i }).getAttribute("href")).toBe("https://www.linkedin.com/in/sam-lee");

    fireEvent.click(screen.getByRole("button", { name: "Write my own" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "A potential client" } });
    fireEvent.change(screen.getByLabelText("Tone"), { target: { value: "Warm" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({
      contactUrl: "/in/sam-lee",
      contactName: "Sam Lee",
      choice: "custom",
      profileId: null,
      purpose: "A potential client",
      tone: "Warm",
    });
  });

  it("forgets a person", async () => {
    const calls = server({
      "GET /api/ext/me": ME,
      "GET /api/ext/message-profiles": { profiles: [] },
      "GET /api/ext/contacts": { contacts: [CONTACT] },
      "DELETE /api/ext/contacts/k1": { ok: true },
    });
    render(<ProfilesManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Conversations" }));
    fireEvent.click(await screen.findByRole("button", { name: "Forget Sam Lee" }));
    fireEvent.click(screen.getByRole("button", { name: "Forget" }));
    await waitFor(() => expect(screen.queryByText("Sam Lee")).toBeNull());
    expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/ext/contacts/k1")).toBe(true);
  });
});

describe("website — X extension", () => {
  const X_PRESET = { ...SYSTEM_PROFILE, id: "sys-x-thoughtful-reply", name: "CarouseLabs — X Thoughtful Reply", length: "80-220 characters" };
  // A preset that isn't the default, listed first: what a dropdown with no
  // choice would show if Settings didn't pick the real default itself.
  const X_QUICK = { ...X_PRESET, id: "sys-x-quick-reply", name: "CarouseLabs — X Quick Reply", isDefault: false }
  const X_MINE = { ...X_PRESET, id: "xmine", userId: "u1", name: "Punchy founder", isSystem: false, isRecommended: false, isDefault: false };
  const X_SETTINGS = { defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false };

  function xServer(settings = X_SETTINGS, extra: Record<string, unknown | ((call: Call) => unknown)> = {}) {
    let current = { ...settings };
    return server({
      "GET /api/ext/x/settings": () => current,
      "PATCH /api/ext/x/settings": (call: Call) => (current = { ...current, ...(call.body as object) }),
      "GET /api/ext/x/profiles": () => ({ profiles: [X_QUICK, X_PRESET, X_MINE], defaultProfileId: current.defaultProfileId }),
      ...extra,
    });
  }

  it("creates an X reply profile on X's route, within X's limit, apart from LinkedIn's", async () => {
    const calls = xServer(X_SETTINGS, { "POST /api/ext/x/profiles": { profile: { id: "new" } } });
    render(<XReplyProfiles />);
    expect(await screen.findByText("Punchy founder")).toBeTruthy();
    fireEvent.click(await newProfileButton());
    expect(screen.getByText(/New profile · X replies/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("e.g. Founder voice"), { target: { value: "Short and sharp" } });
    fireEvent.change(screen.getByPlaceholderText(/B2B SaaS founder/), { target: { value: "A founder" } });

    fireEvent.change(screen.getByLabelText("Maximum characters"), { target: { value: "400" } });
    expect(screen.getByText(/between 15 and 280 characters/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Maximum characters"), { target: { value: "200" } });

    fireEvent.click(screen.getByRole("button", { name: /create profile/i }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/ext/x/profiles");
    expect(post.body).toMatchObject({ name: "Short and sharp", length: "80-200 characters" });
    expect(calls.some((c) => c.url === "/api/ext/profiles" || c.url === "/api/ext/me")).toBe(false);
  });

  it("allows a longer range once X Premium is on", async () => {
    xServer({ ...X_SETTINGS, maxReplyLength: 1000 });
    render(<XReplyProfiles />);
    fireEvent.click(await newProfileButton());
    fireEvent.change(screen.getByPlaceholderText("e.g. Founder voice"), { target: { value: "x" } });
    fireEvent.change(screen.getByPlaceholderText(/B2B SaaS founder/), { target: { value: "y" } });
    fireEvent.change(screen.getByLabelText("Maximum characters"), { target: { value: "600" } });
    expect(screen.queryByText(/between 15 and/)).toBeNull();
    expect(screen.getByText(/X Premium is on/)).toBeTruthy();
  });

  it("makes a profile the default through X's settings, and shows it", async () => {
    const calls = xServer();
    render(<XReplyProfiles />);
    const card = (await screen.findByText("Punchy founder")).closest("div.rounded-2xl") as HTMLElement;
    expect(within(card).queryByText("Default")).toBeNull();
    fireEvent.click(within(card).getByRole("button", { name: /make default/i }));
    await waitFor(() => expect(within(card).getByText("Default")).toBeTruthy());
    expect(calls.find((c) => c.method === "PATCH")).toMatchObject({ url: "/api/ext/x/settings", body: { defaultProfileId: "xmine" } });
  });

  it("lists only X's history, and links to x.com", async () => {
    const calls = xServer(X_SETTINGS, {
      "GET /api/ext/history?limit=30&platform=x": {
        entries: [
          { id: "h1", kind: "x_reply", postAuthor: "Priya", postUrl: "https://x.com/priya/status/1", postSnippet: "", comment: "Order beats count.", action: "INSERTED", createdAt: "2026-10-01T10:00:00Z", profileName: "Punchy founder" },
        ],
        nextCursor: null,
      },
    });
    render(<HistoryList platform="x" />);
    expect(await screen.findByText("Order beats count.")).toBeTruthy();
    expect(screen.getByText("Reply to Priya")).toBeTruthy();
    expect(screen.getByRole("link", { name: /View post/ }).getAttribute("href")).toBe("https://x.com/priya/status/1");

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    await waitFor(() => expect(calls.some((c) => c.url.includes("platform=x") && c.url.includes("kind=x_message"))).toBe(true));
  });

  it("saves X Premium, the default X profile and Insert to X's settings", async () => {
    const calls = xServer();
    render(<XSettingsPanel />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /I have X Premium/ }));
    await waitFor(() => expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(1));

    const row = (await screen.findByText("Default X profile")).closest("div.grid") as HTMLElement;
    await waitFor(() => expect((within(row).getByRole("combobox") as HTMLSelectElement).value).toBe("sys-x-thoughtful-reply"));
    fireEvent.change(within(row).getByRole("combobox"), { target: { value: "xmine" } });
    await waitFor(() => expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2));

    fireEvent.click(screen.getByRole("checkbox", { name: /show the insert button/i }));
    await waitFor(() => expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(3));

    const patches = calls.filter((c) => c.method === "PATCH");
    expect(patches.map((c) => c.url)).toEqual(["/api/ext/x/settings", "/api/ext/x/settings", "/api/ext/x/settings"]);
    expect(patches.map((c) => c.body)).toEqual([
      { maxReplyLength: 1000 },
      { defaultProfileId: "xmine" },
      { insertButtonHidden: true },
    ]);
  });
});

describe("website — Extension header: two separate extensions", () => {
  const tabHrefs = () => screen.getAllByRole("link").map((a) => a.getAttribute("href"));

  it("LinkedIn's pages are titled for LinkedIn, with LinkedIn's tabs only", () => {
    nav.pathname = "/extension/history";
    render(<ExtensionTabs />);
    expect(screen.getByRole("heading", { name: "CarouseLabs Engage for LinkedIn" })).toBeTruthy();
    expect(tabHrefs()).toEqual([
      "/extension",
      "/extension/profiles",
      "/extension/agents",
      "/extension/history",
      "/extension/settings",
      "/extension/billing",
    ]);
    expect(screen.getByRole("link", { name: "Custom tones" })).toBeTruthy();
  });

  it("X's pages are titled for X, with X's own tabs under /extension/x", () => {
    nav.pathname = "/extension/x/settings";
    render(<ExtensionTabs />);
    expect(screen.getByRole("heading", { name: "CarouseLabs Engage for X" })).toBeTruthy();
    expect(screen.getByText(/separate extension from LinkedIn's, with its own plan/)).toBeTruthy();
    expect(tabHrefs()).toEqual([
      "/extension/x",
      "/extension/x/profiles",
      "/extension/x/agents",
      "/extension/x/history",
      "/extension/x/settings",
      "/extension/x/billing",
    ]);
    expect(screen.getByRole("link", { name: "Reply profiles" }).getAttribute("href")).toBe("/extension/x/profiles");
  });

  it("the title is a dropdown that switches extension and stays on the same tab", () => {
    nav.pathname = "/extension/history";
    render(<ExtensionTabs />);
    const toggle = screen.getByRole("button", { name: "CarouseLabs Engage for LinkedIn" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: /CarouseLabs Engage for X/ })).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const toX = screen.getByRole("link", { name: /CarouseLabs Engage for X/ });
    expect(toX.getAttribute("href")).toBe("/extension/x/history");
    const here = screen.getByRole("link", { name: /CarouseLabs Engage for LinkedIn/ });
    expect(here.getAttribute("href")).toBe("/extension/history");
    expect(here.getAttribute("aria-current")).toBe("page");
    expect(toX.getAttribute("aria-current")).toBeNull();
    expect(screen.getByText(/Two separate extensions/)).toBeTruthy();

    // jsdom can't navigate; the menu closing is what this checks.
    toX.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(toX);
    expect(screen.queryByRole("link", { name: /CarouseLabs Engage for X/ })).toBeNull();
  });

  it("from X's overview it goes to LinkedIn's overview", () => {
    nav.pathname = "/extension/x";
    render(<ExtensionTabs />);
    fireEvent.click(screen.getByRole("button", { name: "CarouseLabs Engage for X" }));
    expect(screen.getByRole("link", { name: /CarouseLabs Engage for LinkedIn/ }).getAttribute("href")).toBe("/extension");
  });

  it("closes on Escape (back to the button) and on a click outside", () => {
    nav.pathname = "/extension";
    render(<ExtensionTabs />);
    const toggle = screen.getByRole("button", { name: "CarouseLabs Engage for LinkedIn" });
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);

    fireEvent.click(toggle);
    fireEvent.pointerDown(screen.getByRole("link", { name: /CarouseLabs Engage for X/ }));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerDown(document.body);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("knows which extension and tab a path is", () => {
    expect(platformOfPath("/extension/x")).toBe("x");
    expect(platformOfPath("/extension/x/history")).toBe("x");
    expect(platformOfPath("/extension/xyz")).toBe("linkedin");
    expect(platformOfPath("/extension")).toBe("linkedin");
    expect(tabPathOf("/extension/x/billing")).toBe("/billing");
    expect(tabPathOf("/extension/profiles")).toBe("/profiles");
    expect(tabPathOf("/extension/x/somewhere-else")).toBe("");
  });
});

describe("website — signed-in browsers", () => {
  const DEVICES = [
    { id: "d1", device: "Chrome on Windows", lastUsedAt: "2026-10-09T10:00:00Z", createdAt: "2026-10-01T10:00:00Z" },
    { id: "d2", device: "X extension · Edge on Windows", lastUsedAt: "2026-10-10T10:00:00Z", createdAt: "2026-10-10T10:00:00Z" },
  ];

  it("shows only LinkedIn's sign-ins on LinkedIn's overview", async () => {
    server({ "GET /api/ext/devices": { devices: DEVICES } });
    render(<DevicesList />);
    expect(await screen.findByText("Chrome on Windows")).toBeTruthy();
    expect(screen.queryByText(/Edge on Windows/)).toBeNull();
  });

  it("shows only X's on X's, without the label the server uses to tell them apart", async () => {
    server({ "GET /api/ext/devices": { devices: DEVICES } });
    render(<DevicesList platform="x" />);
    expect(await screen.findByText("Edge on Windows")).toBeTruthy();
    expect(screen.queryByText("Chrome on Windows")).toBeNull();
  });

  it("says where to sign in when there are none", async () => {
    server({ "GET /api/ext/devices": { devices: [DEVICES[0]] } });
    render(<DevicesList platform="x" />);
    expect(await screen.findByText(/Open the extension's panel on X/)).toBeTruthy();
  });
});

describe("website — install steps", () => {
  const ACCESS = { access: "free", freeUsed: 3, freeLimit: 10, status: null, renewsAt: null, endsAt: null, manageUrl: null, source: "free", grantEndsAt: null, suspended: false } as unknown as ExtAccessSummary;
  const PAID = { ...ACCESS, access: "unlimited", status: "active", source: "subscription" } as ExtAccessSummary;

  it("X, paid, not installed yet: open, with X's own listing, x.com and the account to sign in with", () => {
    const { container } = render(<InstallSteps platform="x" email="me@site.co" ext={PAID} signedInBrowsers={0} />);
    expect(container.querySelector("details")!.open).toBe(true);
    expect(screen.getByText("Install CarouseLabs Engage for X")).toBeTruthy();
    const store = screen.getByRole("link", { name: /Open in Chrome Web Store/ });
    expect(store.getAttribute("href")).toBe(X_EXTENSION_STORE_URL);
    expect(store.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: "X" }).getAttribute("href")).toBe("https://x.com/home");
    expect(screen.getByText(/separate extension from the LinkedIn one/)).toBeTruthy();
    expect(screen.getByText(/plan is active/).textContent).toContain("me@site.co");
    expect(screen.getByText(/that's what unlocks your plan/)).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Add it to your browser",
      "Pin it to your toolbar",
      "Sign in",
      "Start writing",
    ]);
  });

  it("LinkedIn: its own listing and LinkedIn; free tries left while it's free", () => {
    render(<InstallSteps platform="linkedin" email="me@site.co" ext={ACCESS} signedInBrowsers={0} />);
    expect(screen.getByRole("link", { name: /Open in Chrome Web Store/ }).getAttribute("href")).toBe(EXTENSION_STORE_URL);
    expect(screen.getByRole("link", { name: "LinkedIn" }).getAttribute("href")).toBe("https://www.linkedin.com/feed/");
    expect(screen.getByText(/You have 7 free generations/)).toBeTruthy();
    expect(screen.queryByText(/plan is active/)).toBeNull();
    expect(screen.queryByText(/separate extension/)).toBeNull();
  });

  it("folds away once it's signed in somewhere", () => {
    const { container } = render(<InstallSteps platform="x" email="me@site.co" ext={PAID} signedInBrowsers={2} />);
    expect(container.querySelector("details")!.open).toBe(false);
    expect(screen.getByText("Install on another browser")).toBeTruthy();
    expect(screen.getByText("Signed in on 2 browsers.")).toBeTruthy();
    expect(screen.queryByText(/plan is active/)).toBeNull();
  });

  it("no free-tries line once they're used up", () => {
    render(<InstallSteps platform="x" email="me@site.co" ext={{ ...ACCESS, freeUsed: 10 }} signedInBrowsers={0} />);
    expect(screen.queryByText(/free generation/)).toBeNull();
  });
});

describe("website — plan card install links", () => {
  const PAID_X = { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null, source: "subscription", grantEndsAt: null, suspended: false } as unknown as ExtAccessSummary;

  it("each extension's plan card links its own Chrome Web Store listing", () => {
    render(<ExtensionPlanSection ext={PAID_X} platform="x" />);
    expect(screen.getByRole("link", { name: "Install from Chrome Web Store" }).getAttribute("href")).toBe(X_EXTENSION_STORE_URL);
    cleanup();
    render(<ExtensionPlanSection ext={PAID_X} />);
    expect(screen.getByRole("link", { name: "Install from Chrome Web Store" }).getAttribute("href")).toBe(EXTENSION_STORE_URL);
  });
});
