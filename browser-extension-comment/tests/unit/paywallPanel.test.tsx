// The side panel's half of the paywall: the shared access store
// (src/lib/extensionAccess.ts), the unlock card, checkout, and the Account
// screen's plan row. The server decides access; these check the panel shows
// that decision and routes the user to the right place.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ExtensionAccess } from "@/lib/api";
import { ApiError } from "@/lib/api";
import {
  getExtensionAccess,
  isPaywalled,
  noteFreeRemaining,
  notePaywallError,
  setExtensionAccess,
} from "@/lib/extensionAccess";
import { FreeGenerationsNote, UnlockCard } from "@/sidepanel/components/UnlockCard";
import { AccountScreen } from "@/sidepanel/components/screens/AccountScreen";
import { chromeMock } from "../setup/chrome";

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
});

const access = (over: Partial<ExtensionAccess> = {}): ExtensionAccess => ({
  access: "free",
  freeUsed: 0,
  freeLimit: 10,
  status: null,
  renewsAt: null,
  endsAt: null,
  manageUrl: null,
  ...over,
});

function server(routes: Record<string, { status: number; body: unknown }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const route = Object.entries(routes).find(([path]) => url.endsWith(path));
    const { status, body } = route?.[1] ?? { status: 404, body: { error: "not found" } };
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("access store", () => {
  it("counts down from each generation's freeRemaining", () => {
    setExtensionAccess(access({ freeUsed: 2 }));
    noteFreeRemaining(4);
    expect(getExtensionAccess()?.freeUsed).toBe(6);
    expect(isPaywalled(getExtensionAccess())).toBe(false);
    noteFreeRemaining(0);
    expect(isPaywalled(getExtensionAccess())).toBe(true);
  });

  it("never paywalls an unlimited or testing account, or one still loading", () => {
    expect(isPaywalled(null)).toBe(false);
    expect(isPaywalled(access({ access: "unlimited", freeUsed: 10 }))).toBe(false);
    expect(isPaywalled(access({ access: "testing", freeUsed: 10 }))).toBe(false);
  });

  it("treats only the paywall's own 402 as the paywall", () => {
    setExtensionAccess(access({ freeUsed: 3 }));
    expect(notePaywallError(new ApiError(402, "Out of credits"))).toBe(false);
    expect(notePaywallError(new ApiError(429, "cooldown", { cooldown: true }))).toBe(false);
    expect(isPaywalled(getExtensionAccess())).toBe(false);

    expect(notePaywallError(new ApiError(402, "Used up", { requiresSubscription: true }))).toBe(true);
    expect(isPaywalled(getExtensionAccess())).toBe(true);
  });

  it("carries the error body on ApiError, so the flag above can be read", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({ "/api/ext/generate": { status: 402, body: { error: "Used up", requiresSubscription: true } } });
    const { apiFetch } = await import("@/lib/api");
    const err = await apiFetch("/api/ext/generate").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).data.requiresSubscription).toBe(true);
    expect((err as ApiError).message).toBe("Used up");
  });
});

describe("unlock card", () => {
  it("opens the server-built checkout link in a new tab", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    const checkoutUrl = "https://carouselabs.lemonsqueezy.com/buy/x?checkout%5Bcustom%5D%5Buser_id%5D=u1";
    server({ "/api/ext/checkout": { status: 200, body: { url: checkoutUrl } } });
    setExtensionAccess(access({ freeUsed: 10 }));
    render(<UnlockCard />);

    expect(screen.getByText(/used your 10 free generations/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /get unlimited — \$15\/month/i }));
    await waitFor(() => expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: checkoutUrl }));
  });

  it("shows checkout being unavailable instead of failing silently", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({ "/api/ext/checkout": { status: 503, body: { error: "Checkout isn't available right now." } } });
    setExtensionAccess(access({ freeUsed: 10 }));
    render(<UnlockCard />);
    fireEvent.click(screen.getByRole("button", { name: /get unlimited/i }));
    expect(await screen.findByText("Checkout isn't available right now.")).toBeTruthy();
    expect(chromeMock().tabs.create).not.toHaveBeenCalled();
  });

  it("unlocks after Refresh once the purchase has landed", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({ "/api/ext/me": { status: 200, body: { extension: access({ access: "unlimited", freeUsed: 10 }) } } });
    setExtensionAccess(access({ freeUsed: 10 }));
    render(<UnlockCard />);
    fireEvent.click(screen.getByRole("button", { name: /already subscribed\? refresh/i }));
    await waitFor(() => expect(getExtensionAccess()?.access).toBe("unlimited"));
  });

  it("shows the free count only while some are left", () => {
    setExtensionAccess(access({ freeUsed: 3 }));
    const { rerender } = render(<FreeGenerationsNote />);
    expect(screen.getByText(/7 of 10 free generations left/)).toBeTruthy();

    setExtensionAccess(access({ access: "unlimited" }));
    rerender(<FreeGenerationsNote />);
    expect(screen.queryByText(/free generations left/)).toBeNull();
  });
});

describe("Account screen plan", () => {
  const me = (extension: ExtensionAccess) => ({ email: "a@b.co", plan: "FREE", commentsThisMonth: 0, commentsToday: 0, extension });

  it("offers the $15/month plan to a free account", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({ "/api/ext/me": { status: 200, body: me(access({ freeUsed: 4 })) } });
    render(<AccountScreen />);
    expect(await screen.findByText("Free — 6 of 10 left")).toBeTruthy();
    expect(screen.getByRole("button", { name: /get unlimited — \$15\/month/i })).toBeTruthy();
  });

  it("offers Manage subscription, opening the Lemon Squeezy portal, to a subscriber", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    const ext = access({ access: "unlimited", status: "active", renewsAt: "2026-10-26T00:00:00Z", manageUrl: "https://portal.example/p" });
    server({ "/api/ext/me": { status: 200, body: me(ext) } });
    render(<AccountScreen />);
    expect(await screen.findByText("Unlimited")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /get unlimited/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /manage subscription/i }));
    expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "https://portal.example/p" });
  });

  it("says when a cancelled subscription runs out", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    const ext = access({ access: "unlimited", status: "cancelled", endsAt: "2026-10-26T12:00:00Z" });
    server({ "/api/ext/me": { status: 200, body: me(ext) } });
    render(<AccountScreen />);
    expect(await screen.findByText(/^Unlimited until /)).toBeTruthy();
  });

  it("forgets the account's plan on sign out", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({
      "/api/ext/me": { status: 200, body: me(access({ freeUsed: 10 })) },
      "/api/ext/auth/signout": { status: 200, body: { ok: true } },
    });
    render(<AccountScreen />);
    await screen.findByText("Free — 0 of 10 left");
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(getExtensionAccess()).toBeNull());
  });
});
