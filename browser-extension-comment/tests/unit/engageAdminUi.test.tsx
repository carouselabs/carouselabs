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
