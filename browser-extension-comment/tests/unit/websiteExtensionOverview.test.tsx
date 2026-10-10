// The website's Extension overviews (components/extension/ExtensionOverview,
// a server component in the Next.js project): one per extension, each with
// its own plan, install steps, activity and browsers. The database and the
// access summary are stood in for.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";

const state = vi.hoisted(() => ({
  access: {} as Record<string, unknown>,
  tokens: [] as { device: string | null }[],
  kindsAsked: [] as string[][],
  counts: [] as { kind: string; _count: { _all: number } }[],
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/extension", useRouter: () => ({ refresh: () => {} }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../../../lib/db", () => ({
  db: {
    commentHistory: {
      groupBy: vi.fn(async (args: { where: { kind: { in: string[] } } }) => {
        state.kindsAsked.push(args.where.kind.in);
        return state.counts.filter((c) => args.where.kind.in.includes(c.kind));
      }),
    },
    extensionToken: { findMany: vi.fn(async () => state.tokens) },
  },
}));
vi.mock("../../../lib/extAccess", () => ({
  extAccessSummary: vi.fn(async (_userId: string, platform = "linkedin") => state.access[platform]),
}));

import { ExtensionOverview } from "../../../components/extension/ExtensionOverview";
import {
  EXTENSION_CHECKOUT_PATH,
  X_EXTENSION_CHECKOUT_PATH,
  X_EXTENSION_STORE_URL,
} from "../../../lib/plans";

const FREE = { access: "free", freeUsed: 0, freeLimit: 10, status: null, renewsAt: null, endsAt: null, manageUrl: null, source: "free", grantEndsAt: null, suspended: false };
const PAID = { ...FREE, access: "unlimited", status: "active", renewsAt: "2026-11-10T10:34:27.000Z", source: "subscription" };

const show = async (platform: "linkedin" | "x") =>
  render(await ExtensionOverview({ platform, user: { id: "u1", email: "me@site.co" } }));

beforeEach(() => {
  state.kindsAsked = [];
  state.counts = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          devices: state.tokens.map((t, i) => ({ id: `d${i}`, device: t.device, lastUsedAt: "2026-10-10T10:00:00Z", createdAt: "2026-10-10T10:00:00Z" })),
        }),
      ),
    ),
  );
});
afterEach(cleanup);

describe("website — Engage for X overview", () => {
  it("paid for X with only LinkedIn's extension installed: opens on X's install steps", async () => {
    state.access = { x: PAID, linkedin: FREE };
    state.tokens = [{ device: "Chrome on Windows" }];
    state.counts = [{ kind: "x_reply", _count: { _all: 37 } }, { kind: "comment", _count: { _all: 99 } }];
    const { container } = await show("x");

    expect(screen.getByText(/Active — renews/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Plan & payments/ }).getAttribute("href")).toBe("/extension/x/billing");

    expect(container.querySelector("details")!.open).toBe(true);
    expect(screen.getByText("Install CarouseLabs Engage for X")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open in Chrome Web Store/ }).getAttribute("href")).toBe(X_EXTENSION_STORE_URL);
    expect(screen.getByText(/plan is active/)).toBeTruthy();

    // X's own activity only.
    expect(state.kindsAsked).toEqual([["x_reply", "x_message"]]);
    expect(screen.getByRole("link", { name: /See history/ }).getAttribute("href")).toBe("/extension/x/history");
    expect(screen.getByText("37")).toBeTruthy();
    expect(screen.queryByText("99")).toBeNull();

    // LinkedIn's, sold separately.
    const other = screen.getByText("CarouseLabs Engage for LinkedIn").closest("div.rounded-2xl") as HTMLElement;
    expect(within(other).getByRole("link", { name: /Get unlimited — \$15\/month/ }).getAttribute("href")).toBe(EXTENSION_CHECKOUT_PATH);
    expect(within(other).getByRole("link", { name: /Install & set up/ }).getAttribute("href")).toBe("/extension");

    // LinkedIn's sign-in isn't X's.
    expect(await screen.findByText(/Not signed in on any browser yet/)).toBeTruthy();
  });
});

describe("website — Engage for LinkedIn overview", () => {
  it("installed: steps folded away; the X card offers X's own checkout", async () => {
    state.access = { linkedin: PAID, x: FREE };
    state.tokens = [{ device: "Chrome on Windows" }, { device: "X extension · Chrome on Windows" }];
    const { container } = await show("linkedin");

    expect(container.querySelector("details")!.open).toBe(false);
    expect(screen.getByText("Signed in on 1 browser.")).toBeTruthy();
    expect(state.kindsAsked).toEqual([["comment", "reply", "connection_note", "message"]]);

    const other = screen.getByText("CarouseLabs Engage for X").closest("div.rounded-2xl") as HTMLElement;
    expect(within(other).getByRole("link", { name: /Get unlimited — \$15\/month/ }).getAttribute("href")).toBe(X_EXTENSION_CHECKOUT_PATH);
    expect(within(other).getByRole("link", { name: /Install & set up/ }).getAttribute("href")).toBe("/extension/x");

    await waitFor(() => expect(screen.getByText("Chrome on Windows")).toBeTruthy());
    expect(screen.queryByText(/X extension/)).toBeNull();
  });
});
