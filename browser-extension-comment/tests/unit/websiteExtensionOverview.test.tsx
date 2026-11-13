// The website's Engage → Home (components/extension/ExtensionOverview, a
// server component in the Next.js project): one per extension, each with its
// own plan, its own activity, setting up until it's done, and the other
// extensions sold separately. The database and the access summary are stood
// in for.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const state = vi.hoisted(() => ({
  access: {} as Record<string, unknown>,
  tokens: [] as { device: string | null }[],
  kindsAsked: [] as string[][],
  counts: [] as { kind: string; _count: { _all: number } }[],
  latest: [] as Record<string, unknown>[],
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
      findMany: vi.fn(async () => state.latest),
    },
    extensionToken: { findMany: vi.fn(async () => state.tokens) },
    $queryRaw: vi.fn(async () => []),
  },
}));
vi.mock("../../../lib/extAccess", () => ({
  extAccessSummary: vi.fn(async (_userId: string, platform = "linkedin") => state.access[platform]),
}));

import { ExtensionOverview } from "../../../components/extension/ExtensionOverview";
import { EXTENSION_CHECKOUT_PATH, EXTENSION_STORE_URL, X_EXTENSION_STORE_URL } from "../../../lib/plans";

const PRICE = { cents: 1500, standardCents: 1500, special: false, endsAt: null, introMonths: null };
const FREE = { access: "free", freeUsed: 0, freeLimit: 10, status: null, renewsAt: null, endsAt: null, manageUrl: null, source: "free", grantEndsAt: null, suspended: false, price: PRICE };
const PAID = { ...FREE, access: "unlimited", status: "active", renewsAt: "2026-11-10T10:34:27.000Z", source: "subscription" };

const show = async (platform: "linkedin" | "x") =>
  render(await ExtensionOverview({ platform, user: { id: "u1", email: "me@site.co" } }));

beforeEach(() => {
  state.kindsAsked = [];
  state.counts = [];
  state.latest = [];
});
afterEach(cleanup);

describe("website — Engage for X home", () => {
  it("paid for X with only LinkedIn's extension installed: starts with adding X's", async () => {
    state.access = { x: PAID, linkedin: FREE };
    state.tokens = [{ device: "Chrome on Windows" }];
    state.counts = [{ kind: "x_reply", _count: { _all: 37 } }, { kind: "comment", _count: { _all: 99 } }];
    await show("x");

    expect(screen.getAllByText(/Active — renews/).length).toBeGreaterThan(0);
    // Not signed in on X yet: the first thing is X's own store page.
    expect(screen.getAllByRole("link", { name: /Add to Chrome/ })[0].getAttribute("href")).toBe(X_EXTENSION_STORE_URL);
    expect(screen.getByText("Finish setting up")).toBeTruthy();
    expect(screen.getByText("0 of 3 done")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Plan & setup/ })[0].getAttribute("href")).toBe("/extension/x/billing");

    // X's own activity only.
    expect(state.kindsAsked).toEqual([["x_reply", "x_message"]]);
    expect(screen.getAllByRole("link", { name: /See all activity/ })[0].getAttribute("href")).toBe("/extension/x/history");
    expect(screen.getByText("37")).toBeTruthy();
    expect(screen.queryByText("99")).toBeNull();
    expect(screen.getByText("Nothing written yet.")).toBeTruthy();

    // LinkedIn's, sold separately.
    const more = screen.getByRole("region", { name: /More from Engage/ });
    expect(within(more).getByText("Engage for LinkedIn")).toBeTruthy();
    expect(within(more).getByRole("link", { name: "Go to LinkedIn" }).getAttribute("href")).toBe("/extension");
  });
});

describe("website — Engage for LinkedIn home", () => {
  it("installed and writing: no setup card, the latest listed, the X card links to X", async () => {
    state.access = { linkedin: { ...FREE, freeUsed: 3 }, x: FREE };
    state.tokens = [{ device: "Chrome on Windows" }, { device: "X extension · Chrome on Windows" }];
    state.latest = [
      { id: "h1", kind: "comment", postAuthor: "Maya", postSnippet: "A post", comment: "My comment", action: "INSERTED", profileName: "Founder", createdAt: new Date() },
    ];
    await show("linkedin");

    expect(screen.queryByText("Finish setting up")).toBeNull();
    expect(state.kindsAsked).toEqual([["comment", "reply", "connection_note", "message"]]);
    expect(screen.getAllByRole("link", { name: /Open LinkedIn/ })[0].getAttribute("href")).toBe("https://www.linkedin.com/feed/");
    expect(screen.getAllByRole("link", { name: /Get unlimited — \$15\/month/ })[0].getAttribute("href")).toBe(EXTENSION_CHECKOUT_PATH);
    expect(screen.getByText("7 of 10 free generations left")).toBeTruthy();

    // Their own latest comment in the hero, and in the Latest list.
    expect(screen.getByText("Your latest comment")).toBeTruthy();
    expect(screen.getByText("My comment")).toBeTruthy();
    expect(screen.getByText("On Maya's post")).toBeTruthy();
    expect(screen.getByText("Inserted")).toBeTruthy();

    const more = screen.getByRole("region", { name: /More from Engage/ });
    expect(within(more).getByRole("link", { name: "Go to X" }).getAttribute("href")).toBe("/extension/x");
    expect(EXTENSION_STORE_URL).toBeTruthy();
  });
});
