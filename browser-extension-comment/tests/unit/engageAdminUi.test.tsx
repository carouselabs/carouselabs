// The Engage admin's screens with LinkedIn / X split (components/admin/engage
// in the Next.js project): the Overview's extension switch asks the server for
// one extension and shows only its features; the Users table filters by
// extension and shows each extension's version; a user's recent list names X
// generations.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => "/admin/engage",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
// The chart itself is recharts; what matters here is which lines it is given.
vi.mock("../../../components/admin/charts", () => ({
  AdminLineChart: ({ series }: { series: { key: string; label: string }[] }) => (
    <ul aria-label="Chart lines">
      {series.map((s) => (
        <li key={s.key}>{s.label}</li>
      ))}
    </ul>
  ),
}));
vi.mock("../../../components/admin/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { EngageOverview } from "../../../components/admin/engage/EngageOverview";
import { EngageUsersTable } from "../../../components/admin/engage/EngageUsersTable";
import { EngageControls } from "../../../components/admin/engage/EngageControls";
import { EngageUserDetail } from "../../../components/admin/engage/EngageUserDetail";
import { EngageAi } from "../../../components/admin/engage/EngageAi";
import { EngageErrors } from "../../../components/admin/engage/EngageErrors";
import { EngageHealth } from "../../../components/admin/engage/EngageHealth";
import { EngageSessions } from "../../../components/admin/engage/EngageSessions";
import { EngageAuditTable } from "../../../components/admin/engage/EngageAuditTable";
import { ENGAGE_FEATURES, LIMIT_KEYS, planLimit } from "../../../lib/engage/features";
import { defaultGlobalSettings, type EngageGlobalSettings } from "../../../lib/engage/settingsRules";

const FEATURES0 = { comments: 0, replies: 0, connection_notes: 0, messages: 0, x_replies: 0, x_messages: 0 };
const overview = (platform: string) => ({
  range: { from: "2026-09-26T00:00:00Z", to: "2026-10-03T00:00:00Z" },
  platform,
  users: { total: 10, paid: 3, granted: 1, free: 6, suspended: 0, pendingGrants: 0, active: 4, new: 2 },
  generations: { ...FEATURES0, comments: 5, x_replies: 7, total: 12 },
  actions: { copied: 2, inserted: 3, none: 7 },
  clientErrors: 1,
  series: [{ date: "2026-10-02", activeUsers: 4, newUsers: 2, ...FEATURES0, x_replies: 7 }],
});

let urls: string[];
beforeEach(() => {
  urls = [];
  nav.search = "";
  nav.replace.mockReset();
  try {
    localStorage.clear();
  } catch {
    /* no storage */
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      const u = new URL(url, "https://admin.carouselabs.com");
      if (u.pathname === "/api/admin/engage/overview") return new Response(JSON.stringify(overview(u.searchParams.get("platform") ?? "all")));
      if (u.pathname === "/api/admin/engage/users") {
        return new Response(
          JSON.stringify({
            total: 2,
            page: 1,
            pageSize: 50,
            rows: [
              {
                id: "u1", email: "both@example.com", name: "Both", createdAt: "2026-09-01T00:00:00Z", lastActiveAt: null,
                access: "paid", status: "active", subscriptionStatus: "active", grantEndsAt: null, grantLifetime: false,
                freeUsed: 0, freeLimit: 10, hasOverrides: false, monthByFeature: { x_replies: 3 }, monthTotal: 3,
                extensionVersion: "1.3.0", xExtensionVersion: "1.0.0", extensions: ["linkedin", "x"], tags: [],
              },
              {
                id: "u2", email: "xonly@example.com", name: null, createdAt: "2026-09-01T00:00:00Z", lastActiveAt: null,
                access: "free", status: "active", subscriptionStatus: null, grantEndsAt: null, grantLifetime: false,
                freeUsed: 1, freeLimit: 10, hasOverrides: false, monthByFeature: {}, monthTotal: 0,
                extensionVersion: null, xExtensionVersion: null, extensions: ["x"], tags: [],
              },
            ],
          }),
        );
      }
      return new Response("{}");
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const overviewUrls = () => urls.filter((u) => u.startsWith("/api/admin/engage/overview"));
const tiles = () => within(screen.getByRole("region", { name: "Generated in range" }));

describe("Engage overview: All / LinkedIn / X", () => {
  it("shows both extensions' features by default, then only X's when X is picked", async () => {
    render(<EngageOverview />);
    await screen.findByRole("region", { name: "Generated in range" });
    expect(tiles().getByText("AI comments")).toBeTruthy();
    expect(tiles().getByText("X replies")).toBeTruthy();
    expect(overviewUrls()[0]).not.toContain("platform=");
    expect(screen.getByText(/used on LinkedIn or X/)).toBeTruthy();

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Extension" })).getByRole("radio", { name: "X" }));
    await waitFor(() => expect(overviewUrls().at(-1)).toContain("platform=x"));
    await waitFor(() => expect(screen.queryByText("AI comments")).toBeNull());
    expect(tiles().getByText("X replies")).toBeTruthy();
    expect(tiles().getByText("X messages")).toBeTruthy();
    expect(screen.getByText(/used on X/)).toBeTruthy();
    expect(screen.getByText("Generated on X")).toBeTruthy();
    const lines = within(screen.getByRole("region", { name: "Generations per day" }));
    expect(lines.getByText("X replies")).toBeTruthy();
    expect(lines.queryByText("AI comments")).toBeNull();
  });

  it("LinkedIn: only LinkedIn's features", async () => {
    render(<EngageOverview />);
    await screen.findByRole("region", { name: "Generated in range" });
    fireEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    await waitFor(() => expect(overviewUrls().at(-1)).toContain("platform=linkedin"));
    await waitFor(() => expect(screen.queryByText("X replies")).toBeNull());
    expect(tiles().getByText("AI comments")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Generations per day" })).getByText("Connection notes")).toBeTruthy();
  });
});

describe("Engage users: by extension", () => {
  it("shows each extension a user has, with its version", async () => {
    render(<EngageUsersTable />);
    expect(await screen.findByText("1.3.0 · X 1.0.0")).toBeTruthy();
    // Uses X, version not reported yet.
    expect(screen.getByText("X")).toBeTruthy();
  });

  it("filters by extension through the URL and the server", async () => {
    render(<EngageUsersTable />);
    await screen.findByText("1.3.0 · X 1.0.0");
    fireEvent.change(screen.getByRole("combobox", { name: "Extension" }), { target: { value: "x" } });
    expect(nav.replace).toHaveBeenCalledWith("?platform=x", { scroll: false });

    cleanup();
    urls = [];
    nav.search = "platform=x";
    render(<EngageUsersTable />);
    await screen.findByText("1.3.0 · X 1.0.0");
    expect(urls.find((u) => u.startsWith("/api/admin/engage/users"))).toContain("platform=x");
    expect((screen.getByRole("combobox", { name: "Extension" }) as HTMLSelectElement).value).toBe("x");

    // Back to any extension: the filter leaves the address.
    fireEvent.change(screen.getByRole("combobox", { name: "Extension" }), { target: { value: "any" } });
    expect(nav.replace).toHaveBeenLastCalledWith("?", { scroll: false });
  });
});

describe("Engage controls", () => {
  type Controls = { ready: boolean; settings: EngageGlobalSettings; saved: Record<string, unknown>; versions: unknown[] };
  let controls: Controls;
  let patches: Array<Record<string, unknown>>;
  let refuse: string | null;

  beforeEach(() => {
    patches = [];
    refuse = null;
    controls = {
      ready: true,
      settings: defaultGlobalSettings(),
      saved: {},
      versions: [
        { platform: "linkedin", version: "1.3.0", browsers: 8, people: 7, lastSeenAt: "2026-10-03T09:00:00Z" },
        { platform: "linkedin", version: "1.2.0", browsers: 3, people: 3, lastSeenAt: "2026-10-01T09:00:00Z" },
        { platform: "linkedin", version: null, browsers: 2, people: 2, lastSeenAt: "2026-09-20T09:00:00Z" },
        { platform: "x", version: "1.0.0", browsers: 4, people: 4, lastSeenAt: "2026-10-03T09:00:00Z" },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!url.startsWith("/api/admin/engage/controls")) return new Response("{}");
        if (init?.method === "PATCH") {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          patches.push(body);
          if (refuse) return new Response(JSON.stringify({ error: refuse }), { status: 400 });
          const f = body.feature as { key: keyof EngageGlobalSettings["features"]; enabled: boolean; message?: string | null } | undefined;
          if (f) controls.settings.features[f.key] = { enabled: f.enabled, message: f.message ?? null };
          const ins = body.insert as { platform: "linkedin" | "x"; enabled: boolean } | undefined;
          if (ins) controls.settings.insert[ins.platform] = ins.enabled;
          const mv = body.minVersion as { platform: "linkedin" | "x"; version: string | null } | undefined;
          if (mv) controls.settings.minVersion[mv.platform] = mv.version;
        }
        return new Response(JSON.stringify(controls));
      }),
    );
  });

  const row = (label: string) => screen.getByText(label, { selector: "span" }).parentElement as HTMLElement;

  it("pauses a feature for everyone with a message and a reason, and shows it paused", async () => {
    render(<EngageControls />);
    await screen.findByRole("region", { name: "Features for everyone" });
    fireEvent.click(within(row("X replies")).getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("heading", { name: "Pause X replies for everyone?" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message people see (optional)"), { target: { value: "Back in an hour" } });
    fireEvent.change(screen.getByLabelText("Reason (for the audit log)"), { target: { value: "X changed its reply box" } });
    fireEvent.click(screen.getByRole("button", { name: "Pause for everyone" }));

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({ feature: { key: "x_replies", enabled: false, message: "Back in an hour" }, reason: "X changed its reply box" });
    await waitFor(() => expect(within(row("X replies")).getByText("Paused for everyone")).toBeTruthy());
    expect(within(row("X replies")).getByText("“Back in an hour”")).toBeTruthy();
    expect(within(row("X replies")).getByRole("button", { name: "Turn back on" })).toBeTruthy();
    expect(within(row("AI comments")).getByText("On")).toBeTruthy();
  });

  it("switches Insert off for one extension", async () => {
    render(<EngageControls />);
    const insert = await screen.findByRole("region", { name: "Insert button" });
    fireEvent.click(within(within(insert).getByText("X extension", { selector: "span" }).parentElement as HTMLElement).getByRole("button", { name: "Turn off" }));
    const dialog = screen.getByRole("heading", { name: "Turn Insert off in the X extension?" }).closest("div.rounded-xl") as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn off" }));
    await waitFor(() => expect(patches[0]).toEqual({ insert: { platform: "x", enabled: false } }));
    await waitFor(() => expect(within(insert).getByText("Off for everyone")).toBeTruthy());
  });

  it("previews how many browsers a minimum version would stop, and won't send one nobody has", async () => {
    render(<EngageControls />);
    const linkedin = await screen.findByRole("group", { name: "LinkedIn versions" });
    expect(within(linkedin).getByText("Before 1.3.0 (no version sent)")).toBeTruthy();
    fireEvent.click(within(linkedin).getByRole("button", { name: "Set a minimum" }));

    const input = screen.getByLabelText("Oldest version allowed") as HTMLInputElement;
    expect(input.value).toBe("1.3.0");
    // 1.2.0 (3) and the ones that send no version (2).
    expect(screen.getByRole("status").textContent).toBe("5 browsers would be asked to update.");
    fireEvent.change(input, { target: { value: "1.4.0" } });
    expect(screen.getByRole("status").textContent).toContain("Nobody has 1.4.0 yet");
    fireEvent.change(input, { target: { value: "one" } });
    expect((screen.getByRole("button", { name: "Set minimum" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: "1.3.0" } });
    fireEvent.click(screen.getByRole("button", { name: "Set minimum" }));
    await waitFor(() => expect(patches[0]).toEqual({ minVersion: { platform: "linkedin", version: "1.3.0" } }));
    await waitFor(() => expect(within(linkedin).getAllByText("Asked to update")).toHaveLength(2));
    expect(within(linkedin).getByRole("button", { name: "Remove minimum" })).toBeTruthy();
  });

  it("shows the server's refusal in the dialog and keeps it open", async () => {
    refuse = "Nobody has LinkedIn 1.3.0 or newer yet, so everyone would be asked to update.";
    render(<EngageControls />);
    const linkedin = await screen.findByRole("group", { name: "LinkedIn versions" });
    fireEvent.click(within(linkedin).getByRole("button", { name: "Set a minimum" }));
    fireEvent.click(screen.getByRole("button", { name: "Set minimum" }));
    expect((await screen.findByRole("alert")).textContent).toBe(refuse);
    expect(screen.getByLabelText("Oldest version allowed")).toBeTruthy();
  });

  it("says to run the SQL first, and can't save until then", async () => {
    controls.ready = false;
    render(<EngageControls />);
    expect(await screen.findByText("Run the phase B SQL first")).toBeTruthy();
    expect((within(row("X replies")).getByRole("button", { name: "Pause" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Engage user page", () => {
  const feature = (paused = false, override: "on" | "off" | null = null) => ({
    override,
    paused,
    pauseMessage: paused ? "Back soon" : null,
    enabled: !paused && override !== "off",
  });
  const detail = {
    user: { id: "u1", email: "sam@example.com", name: "Sam Lee", headline: null, createdAt: "2026-09-01T00:00:00Z", accountSuspendedAt: null, deletedAt: null },
    access: {
      status: "active", suspendReason: null, access: "unlimited", source: "subscription", subscriptionActive: true, activeGrant: null,
      freeGenerations: { plan: 10, override: null, effective: 10 }, freeUsed: 0, freeRemaining: null,
      features: { ...Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, feature()])), x_replies: feature(true), messages: feature(false, "off") },
      limits: Object.fromEntries(LIMIT_KEYS.map((k) => [k, { plan: planLimit(k), override: null, effective: planLimit(k) }])),
    },
    control: null,
    subscription: null,
    usage: { counters: { day: {}, month: {} }, historyToday: {}, historyMonth: {}, series: [] },
    grants: [],
    sessions: [],
    notes: [],
    tags: [],
    activity: { generations: [], admin: [] },
    errors: [],
    aiMonth: { calls: 3, cost: 1.25, unpriced: false },
  };

  it("says a feature is paused for everyone, not just off for this person", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(detail))));
    render(<EngageUserDetail userId="u1" />);
    expect(await screen.findAllByText("Paused for everyone")).toHaveLength(2);
    // Off for this person only still reads "Off".
    expect(screen.getAllByText("Off").length).toBeGreaterThan(0);
    // This month's AI cost.
    expect(screen.getByText("AI cost · month")).toBeTruthy();
    expect(screen.getByText("$1.25")).toBeTruthy();
  });
});

describe("Engage AI page", () => {
  const LUNA = "gpt-6-luna";
  const HAIKU = "claude-haiku-4-5-20251001";
  let patches: Array<Record<string, unknown>>;
  let recording: boolean;
  const state = () => ({
    settingsReady: true,
    models: Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, "luna"])),
    prices: { [HAIKU]: { input: 1, output: 5 } },
    usage: {
      recording,
      totals: { calls: 12, ok: 10, fallback: 1, failed: 2, inputTokens: 1_010_000, outputTokens: 200_500, cost: 2, unpricedModels: [LUNA], avgMs: 1350 },
      byFeature: [
        { feature: "comments", model: LUNA, calls: 10, ok: 9, fallback: 0, failed: 1, refused: 0, inputTokens: 10_000, outputTokens: 500, cost: null, avgMs: 1200, p95Ms: 2500, avgFirstTokenMs: 400 },
        { feature: "x_replies", model: HAIKU, calls: 2, ok: 2, fallback: 1, failed: 0, refused: 0, inputTokens: 1_000_000, outputTokens: 200_000, cost: 2, avgMs: 2100, p95Ms: 3000, avgFirstTokenMs: null },
      ],
      series: [
        { date: "2026-10-01", calls: 4, inputTokens: 1, outputTokens: 1, cost: 0.5 },
        { date: "2026-10-02", calls: 8, inputTokens: 1, outputTokens: 1, cost: 1.5 },
      ],
      topUsers: [{ userId: "u1", email: "sam@example.com", calls: 12, inputTokens: 1_010_000, outputTokens: 200_500, cost: 2 }],
    },
  });

  beforeEach(() => {
    patches = [];
    recording = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(url);
        if (url.startsWith("/api/admin/engage/prompts")) {
          return new Response(JSON.stringify({ prompts: [{ id: "x_reply", label: "X reply", feature: "x_replies", system: "You write replies on X.", user: "<post>…</post>" }] }));
        }
        if (url.startsWith("/api/admin/engage/ai")) {
          if (init?.method === "PATCH") {
            const body = JSON.parse(String(init.body)) as Record<string, unknown>;
            patches.push(body);
            const s = state();
            const m = body.model as { feature: string; key: string } | undefined;
            if (m) (s.models as Record<string, string>)[m.feature] = m.key;
            return new Response(JSON.stringify({ models: s.models, prices: s.prices, settingsReady: true }));
          }
          return new Response(JSON.stringify(state()));
        }
        return new Response("{}");
      }),
    );
  });

  it("shows what the AI costs, where models have no price, by feature and by user", async () => {
    render(<EngageAi />);
    const totals = await screen.findByRole("region", { name: "AI totals" });
    expect(within(totals).getByText("$2.00")).toBeTruthy();
    expect(within(totals).getByText("No price yet for GPT Luna")).toBeTruthy();
    expect(within(totals).getByText("8%")).toBeTruthy(); // 1 of 12 by the backup
    expect(within(totals).getByText("17%")).toBeTruthy(); // 2 of 12 failed
    const byFeature = screen.getByRole("region", { name: "By feature and model" });
    expect(within(byFeature).getByText("no price")).toBeTruthy();
    expect(within(byFeature).getByText("Claude Haiku 4.5")).toBeTruthy();
    const users = screen.getByRole("region", { name: "Who costs the most" });
    expect(within(users).getByRole("link", { name: "sam@example.com" }).getAttribute("href")).toBe("/admin/engage/users/u1");
    expect(urls.find((u) => u.startsWith("/api/admin/engage/ai"))).toBe("/api/admin/engage/ai?range=30d");
    const csv = () => screen.getByRole("link", { name: "Download CSV" }).getAttribute("href");
    expect(csv()).toBe("/api/admin/engage/export?type=ai-users&range=30d");

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Extension" })).getByRole("radio", { name: "X" }));
    await waitFor(() => expect(urls.at(-1)).toBe("/api/admin/engage/ai?range=30d&platform=x"));
    expect(csv()).toBe("/api/admin/engage/export?type=ai-users&range=30d&platform=x");
  });

  it("says when AI calls aren't recorded yet", async () => {
    recording = false;
    render(<EngageAi />);
    expect(await screen.findByText("AI calls aren't recorded yet")).toBeTruthy();
  });

  it("switches a feature's model after a confirmation, with a reason", async () => {
    render(<EngageAi />);
    await screen.findByRole("region", { name: "AI totals" });
    fireEvent.click(screen.getByRole("tab", { name: "Models and prices" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "X messages model" }), { target: { value: "haiku" } });
    expect(screen.getByRole("heading", { name: "X messages: write with Claude Haiku 4.5 first?" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Reason (for the audit log)"), { target: { value: "Luna slow on X" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches[0]).toEqual({ model: { feature: "x_messages", key: "haiku" }, reason: "Luna slow on X" }));
    await waitFor(() => expect((screen.getByRole("combobox", { name: "X messages model" }) as HTMLSelectElement).value).toBe("haiku"));
  });

  it("sets a price for a model with none, and won't save one that isn't a number", async () => {
    render(<EngageAi />);
    await screen.findByRole("region", { name: "AI totals" });
    fireEvent.click(screen.getByRole("tab", { name: "Models and prices" }));
    const prices = await screen.findByRole("region", { name: "Prices" });
    expect(within(prices).getByText("Not set")).toBeTruthy();
    fireEvent.click(within(prices).getByRole("button", { name: "Set price" }));
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("$ per million tokens in"), { target: { value: "0.4" } });
    fireEvent.change(screen.getByLabelText("$ per million tokens out"), { target: { value: "abc" } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("$ per million tokens out"), { target: { value: "1.6" } });
    fireEvent.click(save);
    await waitFor(() => expect(patches[0]).toEqual({ price: { model: LUNA, input: 0.4, output: 1.6 } }));
  });

  it("shows what each feature sends the AI", async () => {
    render(<EngageAi />);
    await screen.findByRole("region", { name: "AI totals" });
    fireEvent.click(screen.getByRole("tab", { name: "Prompts" }));
    expect(await screen.findByText("You write replies on X.")).toBeTruthy();
    expect(screen.getByText("X reply")).toBeTruthy();
  });
});

describe("Engage overview: AI cost", () => {
  it("shows the AI cost tile once calls are recorded, linking to the AI page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ...overview("all"), ai: { recording: true, cost: 3.5, calls: 40, unpricedModels: [] } }))),
    );
    render(<EngageOverview />);
    const tile = (await screen.findByText("$3.50")).closest("a") as HTMLAnchorElement;
    expect(tile.getAttribute("href")).toBe("/admin/engage/ai");
    expect(within(tile).getByText("40 AI calls")).toBeTruthy();
  });
});

// ── Phase D: bulk actions, saved views, CSV, Errors, Health, Sessions ──

// The admin's Modal has a heading, not a dialog role: the box around it.
const dialog = (title: string | RegExp) => within(screen.getByRole("heading", { name: title }).parentElement!.parentElement!);

describe("Engage users: bulk actions, saved views, CSV", () => {
  let posts: Array<Record<string, unknown>>;
  let bulkAnswer: { done: number; skipped: { userId: string; why: string }[] };
  beforeEach(() => {
    posts = [];
    bulkAnswer = { done: 1, skipped: [] };
    const base = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/admin/engage/users/bulk") {
          urls.push(url);
          posts.push(JSON.parse(String(init?.body)));
          return new Response(JSON.stringify(bulkAnswer));
        }
        return base(url, init);
      }),
    );
  });

  it("downloads the table as CSV with its filters, not its page", async () => {
    nav.search = "platform=x&page=2&sort=email";
    render(<EngageUsersTable />);
    await screen.findByRole("checkbox", { name: "Select both@example.com" });
    expect(screen.getByRole("link", { name: "Download CSV" }).getAttribute("href")).toBe("/api/admin/engage/export?type=users&platform=x&sort=email");
  });

  it("another page or filter starts with nothing selected", async () => {
    const { rerender } = render(<EngageUsersTable />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select both@example.com" }));
    expect(screen.getByRole("region", { name: "Bulk actions" })).toBeTruthy();
    nav.search = "page=2";
    rerender(<EngageUsersTable />);
    expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull();
  });

  it("pauses the selected users with a reason, then clears the selection", async () => {
    render(<EngageUsersTable />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select both@example.com" }));
    const bar = within(screen.getByRole("region", { name: "Bulk actions" }));
    expect(bar.getByText("1 selected")).toBeTruthy();
    fireEvent.click(bar.getByRole("button", { name: "Pause" }));
    const box = dialog("Pause Engage access · 1 user");
    const go = box.getByRole("button", { name: "Pause Engage access" }) as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.change(box.getByLabelText("Reason (for the audit log)"), { target: { value: "Spam reports" } });
    fireEvent.click(go);
    await waitFor(() => expect(posts).toEqual([{ action: "suspend", userIds: ["u1"], reason: "Spam reports" }]));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull());
    expect(screen.queryByRole("heading", { name: /Pause Engage access/ })).toBeNull();
  });

  it("selects the whole page, and lists anyone the action skipped and why", async () => {
    bulkAnswer = { done: 1, skipped: [{ userId: "u2", why: "Already tagged" }] };
    render(<EngageUsersTable />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select everyone on this page" }));
    const bar = within(screen.getByRole("region", { name: "Bulk actions" }));
    expect(bar.getByText("2 selected")).toBeTruthy();
    fireEvent.click(bar.getByRole("button", { name: "Add tag" }));
    const box = dialog("Add a tag · 2 users");
    fireEvent.change(box.getByPlaceholderText("e.g. Beta tester"), { target: { value: " VIP " } });
    fireEvent.click(box.getByRole("button", { name: "Add a tag" }));
    await waitFor(() => expect(posts).toEqual([{ action: "tag", userIds: ["u1", "u2"], tag: "VIP" }]));
    // The table has cleared its selection; the dialog still says how many it was for.
    const result = dialog("Add a tag · 2 users");
    expect(await result.findByText("Done for 1 of 2. Skipped:")).toBeTruthy();
    const skipped = within(result.getByRole("list", { name: "Skipped users" }));
    expect(skipped.getByText("xonly@example.com")).toBeTruthy();
    expect(skipped.getByText("Already tagged")).toBeTruthy();
    fireEvent.click(result.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { name: /Add a tag/ })).toBeNull();
  });

  it("free access for the selected users takes a length and a reason", async () => {
    render(<EngageUsersTable />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select xonly@example.com" }));
    fireEvent.click(within(screen.getByRole("region", { name: "Bulk actions" })).getByRole("button", { name: "Give free access" }));
    const box = dialog("Give free access · 1 user");
    const lengths = [...(box.getByRole("combobox", { name: "For how long" }) as HTMLSelectElement).options].map((o) => o.value);
    expect(lengths).toContain("30d");
    expect(lengths).not.toContain("custom");
    fireEvent.change(box.getByRole("combobox", { name: "For how long" }), { target: { value: "3m" } });
    fireEvent.change(box.getByLabelText("Reason (for the audit log)"), { target: { value: "Launch partners" } });
    fireEvent.click(box.getByRole("button", { name: "Give free access" }));
    await waitFor(() => expect(posts).toEqual([{ action: "grant", userIds: ["u2"], reason: "Launch partners", duration: "3m" }]));
  });

  it("saves the current filters under a name, and opens them again from the list", async () => {
    nav.search = "platform=x&access=paid";
    render(<EngageUsersTable />);
    await screen.findByRole("checkbox", { name: "Select both@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Save these filters" }));
    fireEvent.change(screen.getByRole("textbox", { name: "View name" }), { target: { value: "X paid" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((screen.getByRole("combobox", { name: "Saved view" }) as HTMLSelectElement).value).toBe("X paid");
    expect(screen.getByRole("button", { name: "Delete view “X paid”" })).toBeTruthy();
    cleanup();

    nav.search = "";
    render(<EngageUsersTable />);
    await screen.findByRole("checkbox", { name: "Select both@example.com" });
    const views = screen.getByRole("combobox", { name: "Saved view" }) as HTMLSelectElement;
    expect(views.value).toBe("");
    fireEvent.change(views, { target: { value: "X paid" } });
    expect(nav.replace).toHaveBeenCalledWith("?platform=x&access=paid", { scroll: false });
  });
});

describe("Engage errors page", () => {
  let recording: boolean;
  const errors = () => ({
    extension: {
      recording,
      total: recording ? 9 : 0,
      groups: recording
        ? [{ feature: "comments", code: "insert.box_not_found", message: "Insert couldn't find LinkedIn's text box.", count: 7, people: 3, versions: ["1.3.0", "1.10.0"], lastAt: "2026-10-02T12:00:00Z" }]
        : [],
      recent: recording
        ? [{ id: "e1", at: "2026-10-02T12:00:00Z", userId: "u1", email: "ana@example.com", feature: "comments", what: "insert.box_not_found", version: "1.3.0" }]
        : [],
    },
    ai: {
      recording,
      total: recording ? 3 : 0,
      groups: recording ? [{ feature: "x_replies", model: "gpt-6-luna", outcome: "timeout", count: 3, people: 2, lastAt: "2026-10-02T11:00:00Z" }] : [],
      recent: recording ? [{ id: "c1", at: "2026-10-02T11:00:00Z", userId: null, email: null, feature: "x_replies", what: "GPT Luna timed out", version: null }] : [],
    },
    people: recording ? 4 : 0,
    series: [{ date: "2026-10-02", extension: 9, ai: 3 }],
    rangeKey: "7d",
  });
  beforeEach(() => {
    recording = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(JSON.stringify(url.startsWith("/api/admin/engage/errors") ? errors() : {}));
      }),
    );
  });

  it("shows what's failing, for how many people, on which versions, and who it happened to", async () => {
    render(<EngageErrors />);
    const totals = within(await screen.findByRole("region", { name: "Error totals" }));
    expect(totals.getByText("9")).toBeTruthy();
    expect(totals.getByText("4")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Chart lines" })).getByText("AI failures")).toBeTruthy();
    const kinds = within(screen.getByRole("region", { name: "Extension errors by kind" }));
    expect(kinds.getByText("Insert couldn't find LinkedIn's text box.")).toBeTruthy();
    expect(kinds.getByText("1.10.0")).toBeTruthy();
    const latest = within(screen.getByRole("region", { name: "Latest extension errors" }));
    expect(latest.getByRole("link", { name: "ana@example.com" }).getAttribute("href")).toBe("/admin/engage/users/u1");

    fireEvent.click(screen.getByRole("tab", { name: /AI failures/ }));
    const ai = within(screen.getByRole("region", { name: "AI failures by kind" }));
    expect(ai.getByText("GPT Luna")).toBeTruthy();
    expect(ai.getByText("Timed out")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Latest AI failures" })).getByText("Unknown")).toBeTruthy();
  });

  it("asks the server for one extension, and the CSV follows", async () => {
    render(<EngageErrors />);
    await screen.findByRole("region", { name: "Error totals" });
    expect(urls.at(-1)).toBe("/api/admin/engage/errors?range=7d");
    const csv = () => screen.getByRole("link", { name: "Download CSV" }).getAttribute("href");
    expect(csv()).toBe("/api/admin/engage/export?type=errors&range=7d");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Extension" })).getByRole("radio", { name: "X" }));
    await waitFor(() => expect(urls.at(-1)).toBe("/api/admin/engage/errors?range=7d&platform=x"));
    expect(csv()).toBe("/api/admin/engage/export?type=errors&range=7d&platform=x");
  });

  it("says which SQL to run when errors aren't recorded yet", async () => {
    recording = false;
    render(<EngageErrors />);
    const totals = within(await screen.findByRole("region", { name: "Error totals" }));
    expect(totals.getByText("Run the Engage admin SQL")).toBeTruthy();
    expect(totals.getByText("Run the phase C SQL")).toBeTruthy();
    expect(screen.getByText("No extension errors in this range")).toBeTruthy();
  });
});

describe("Engage health page", () => {
  let overall: string;
  beforeEach(() => {
    overall = "warn";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(
          JSON.stringify({
            checkedAt: "2026-10-03T12:00:00Z",
            overall,
            checks: [
              { id: "database", label: "Database", status: "ok", detail: "Answered in 12 ms" },
              { id: "setup:EngageAiCall", label: "Setup: AI usage and cost", status: "warn", detail: "Run scripts/engage-admin-phase-c.sql in Supabase" },
              { id: "ai:haiku", label: "Claude Haiku 4.5, last hour", status: "idle", detail: "No calls" },
              { id: "controls", label: "Controls", status: "warn", detail: "X replies paused" },
            ],
          }),
        );
      }),
    );
  });

  it("says whether Engage is working, lists each check, and links to what's switched off", async () => {
    render(<EngageHealth />);
    expect((await screen.findByRole("status")).textContent).toBe("Working, with something worth a look.");
    const checks = within(screen.getByRole("list", { name: "Checks" }));
    expect(checks.getAllByRole("listitem")).toHaveLength(4);
    expect(checks.getByText("Run scripts/engage-admin-phase-c.sql in Supabase")).toBeTruthy();
    expect(checks.getByText("No activity")).toBeTruthy();
    expect(checks.getByRole("link", { name: "X replies paused" }).getAttribute("href")).toBe("/admin/engage/controls");
  });

  it("checks again on request", async () => {
    render(<EngageHealth />);
    await screen.findByRole("status");
    overall = "bad";
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Something is broken."));
    expect(urls.filter((u) => u === "/api/admin/engage/health")).toHaveLength(2);
  });
});

describe("Engage sessions page", () => {
  let deletes: Array<{ url: string; body: unknown }>;
  beforeEach(() => {
    deletes = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(url);
        if (init?.method === "DELETE") {
          deletes.push({ url, body: JSON.parse(String(init.body)) });
          return new Response(JSON.stringify({ ok: true }));
        }
        return new Response(
          JSON.stringify({
            rows: [
              { id: "t1", userId: "u1", email: "ana@example.com", device: "Chrome on Windows", platform: "linkedin", version: "1.3.0", createdAt: "2026-09-01T00:00:00Z", lastUsedAt: "2026-10-03T08:00:00Z", revokedAt: null },
              { id: "t3", userId: "u2", email: "ben@example.com", device: null, platform: "x", version: null, createdAt: "2026-08-01T00:00:00Z", lastUsedAt: "2026-09-01T00:00:00Z", revokedAt: "2026-09-02T00:00:00Z" },
            ],
            total: 2,
            page: 1,
            pageSize: 50,
          }),
        );
      }),
    );
  });

  it("lists browsers with who, which extension and version; signed-out ones say so", async () => {
    render(<EngageSessions />);
    const table = within(await screen.findByRole("table", { name: "Sessions" }));
    expect(table.getByRole("link", { name: "ana@example.com" }).getAttribute("href")).toBe("/admin/engage/users/u1");
    expect(table.getByText("1.3.0")).toBeTruthy();
    expect(table.getByText("Chrome on Windows")).toBeTruthy();
    expect(table.getByText(/^Signed out /)).toBeTruthy();
    expect(table.getAllByRole("button", { name: "Sign out" })).toHaveLength(1);
    expect(urls[0]).toBe("/api/admin/engage/sessions?status=active&platform=any&page=1");
  });

  it("filters by status, extension and email through the server", async () => {
    render(<EngageSessions />);
    await screen.findByRole("table", { name: "Sessions" });
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "signed_out" } });
    await waitFor(() => expect(urls.at(-1)).toBe("/api/admin/engage/sessions?status=signed_out&platform=any&page=1"));
    fireEvent.change(screen.getByRole("combobox", { name: "Extension" }), { target: { value: "x" } });
    await waitFor(() => expect(urls.at(-1)).toBe("/api/admin/engage/sessions?status=signed_out&platform=x&page=1"));
    fireEvent.change(screen.getByRole("textbox", { name: "Search by email" }), { target: { value: " ana@ " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(urls.at(-1)).toBe("/api/admin/engage/sessions?status=signed_out&platform=x&page=1&q=ana%40"));
  });

  it("signs one browser out after a reason, then reloads the list", async () => {
    render(<EngageSessions />);
    const table = within(await screen.findByRole("table", { name: "Sessions" }));
    fireEvent.click(table.getByRole("button", { name: "Sign out" }));
    const box = dialog("Sign out this browser?");
    expect(box.getByText(/ana@example.com's LinkedIn extension in Chrome on Windows is signed out at once/)).toBeTruthy();
    const go = box.getByRole("button", { name: "Sign out" }) as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.change(box.getByLabelText("Reason (for the audit log)"), { target: { value: "Lost laptop" } });
    const before = urls.length;
    fireEvent.click(go);
    await waitFor(() => expect(deletes).toEqual([{ url: "/api/admin/engage/sessions/t1", body: { reason: "Lost laptop" } }]));
    await waitFor(() => expect(urls.length).toBeGreaterThan(before + 1));
    expect(screen.queryByRole("heading", { name: "Sign out this browser?" })).toBeNull();
  });
});

describe("Engage audit log: CSV", () => {
  it("downloads the audit log, with the email filter when one is typed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ total: 0, page: 1, pageSize: 50, entries: [] }))));
    render(<EngageAuditTable />);
    await screen.findByText("No Engage changes yet");
    const csv = () => screen.getByRole("link", { name: "Download CSV" }).getAttribute("href");
    expect(csv()).toBe("/api/admin/engage/export?type=audit");
    fireEvent.change(screen.getByRole("textbox", { name: "Filter by user email" }), { target: { value: "ana@" } });
    await waitFor(() => expect(csv()).toBe("/api/admin/engage/export?type=audit&q=ana%40"));
  });
});
