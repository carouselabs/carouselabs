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
  };

  it("says a feature is paused for everyone, not just off for this person", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(detail))));
    render(<EngageUserDetail userId="u1" />);
    expect(await screen.findAllByText("Paused for everyone")).toHaveLength(2);
    // Off for this person only still reads "Off".
    expect(screen.getAllByText("Off").length).toBeGreaterThan(0);
  });
});
