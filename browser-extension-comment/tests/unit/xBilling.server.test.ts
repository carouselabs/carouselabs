// @vitest-environment node
// CarouseLabs Engage for X sold separately from the LinkedIn extension: its
// own Lemon Squeezy product (webhooks filed under XSubscription), its own 10
// free generations ("User".xTrialUsed), admin grants for LinkedIn, X or
// both, and the panel's plan and checkout following the extension that
// asks (its sign-in token). Prisma is an in-memory stand-in.
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Sub = { userId: string; lsSubscriptionId: string; status: string; endsAt: Date | null; renewsAt?: Date | null; customerPortalUrl?: string | null };
type UserRow = { id: string; email: string; extensionTrialUsed: number; xTrialUsed: number; suspendedAt: null; deletedAt: null; defaultCommentProfileId: null; defaultConnectionProfileId: null; defaultMessageProfileId: null; defaultLanguage: null };

const state = vi.hoisted(() => ({
  users: new Map<string, UserRow>(),
  linkedinSubs: [] as Sub[],
  xSubs: [] as Sub[],
  grants: [] as Array<Record<string, unknown>>,
  tokens: [] as Array<{ id: string; userId: string; device: string | null; tokenHash: string }>,
}));

const table = (rows: () => Sub[]) => ({
  findUnique: vi.fn(async ({ where }: { where: { userId?: string; lsSubscriptionId?: string } }) =>
    rows().find((s) => (where.userId ? s.userId === where.userId : s.lsSubscriptionId === where.lsSubscriptionId)) ?? null),
  upsert: vi.fn(async ({ where, create, update }: { where: { userId: string }; create: Sub; update: Partial<Sub> }) => {
    const existing = rows().find((s) => s.userId === where.userId);
    if (existing) Object.assign(existing, update);
    else rows().push({ ...create });
    return {};
  }),
});

const db = vi.hoisted(() => ({}) as Record<string, unknown>);

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/commentCredits", () => ({ COMMENT_CREDITS_ENFORCED: true }));
vi.mock("../../../lib/lemonsqueezy", () => ({ planForVariantId: () => "PRO", creditsForPlan: () => 300 }));
vi.mock("../../../lib/email", () => ({
  sendUpgradedToProEmail: vi.fn(),
  sendSubscriptionCancelledEmail: vi.fn(),
  sendMonthlyResetEmail: vi.fn(),
  sendTopUpEmail: vi.fn(),
}));
const referral = vi.hoisted(() => ({ createCommissionForPayment: vi.fn(async () => "created") }));
vi.mock("../../../lib/referral", () => referral);
vi.mock("../../../lib/engage/usage", () => ({ reserveUsage: vi.fn(async () => ({ ok: true, release: async () => {} })) }));

import { extensionPlatformOfPayload } from "../../../lib/extensionAccessRules";
import { computeEngageAccess } from "../../../lib/engage/accessRules";
import { reserveEngageGeneration } from "../../../lib/engage/gate";
import { extensionCheckoutFor } from "../../../lib/extensionCheckout";
import { hashCommentExtensionToken } from "../../../lib/extensionCommentAuth";
import { clearGlobalSettingsCache } from "../../../lib/engage/settings";
import { POST as lemonSqueezyWebhook } from "../../../app/api/webhooks/lemonsqueezy/route";
import { GET as meGET } from "../../../app/api/ext/me/route";
import { GET as checkoutGET } from "../../../app/api/ext/checkout/route";

const X_VARIANT = 2202499;
const X_CHECKOUT = "https://carouselabs.lemonsqueezy.com/checkout/buy/e1f7d284-11e7-4110-abf8-9a8afba3bdda";
const LINKEDIN_TOKEN = "cl_cmt_linkedin";
const X_TOKEN = "cl_cmt_xext";

beforeEach(() => {
  state.users = new Map([
    ["u1", { id: "u1", email: "buyer@example.com", extensionTrialUsed: 0, xTrialUsed: 0, suspendedAt: null, deletedAt: null, defaultCommentProfileId: null, defaultConnectionProfileId: null, defaultMessageProfileId: null, defaultLanguage: null }],
  ]);
  state.linkedinSubs = [];
  state.xSubs = [];
  state.grants = [];
  state.tokens = [
    { id: "t1", userId: "u1", device: "Chrome on Windows", tokenHash: hashCommentExtensionToken(LINKEDIN_TOKEN) },
    { id: "t2", userId: "u1", device: "X extension · Chrome on Windows", tokenHash: hashCommentExtensionToken(X_TOKEN) },
  ];
  clearGlobalSettingsCache();
  Object.assign(db, {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const u = state.users.get(where.id);
        if (!u) return null;
        return {
          ...u,
          engageControl: null,
          extensionSubscription: state.linkedinSubs.find((s) => s.userId === u.id) ?? null,
          xSubscription: state.xSubs.find((s) => s.userId === u.id) ?? null,
        };
      }),
      findFirst: vi.fn(async () => null),
      // Prisma's guarded updateMany, for either counter.
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown> & { id: string }; data: Record<string, { increment?: number; decrement?: number }> }) => {
        const u = state.users.get(where.id) as unknown as Record<string, number> | undefined;
        const field = Object.keys(data)[0];
        const guard = where[field] as { lt?: number; gt?: number };
        if (!u || (guard.lt !== undefined && !(u[field] < guard.lt)) || (guard.gt !== undefined && !(u[field] > guard.gt))) return { count: 0 };
        u[field] += (data[field].increment ?? 0) - (data[field].decrement ?? 0);
        return { count: 1 };
      }),
    },
    extensionSubscription: table(() => state.linkedinSubs),
    xSubscription: table(() => state.xSubs),
    engageAccessGrant: { findMany: vi.fn(async () => state.grants), updateMany: vi.fn(async () => ({ count: 0 })) },
    engageSetting: { findMany: vi.fn(async () => []) },
    extensionToken: {
      findFirst: vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
        const t = state.tokens.find((x) => x.tokenHash === where.tokenHash);
        return t ? { ...t, user: state.users.get(t.userId) } : null;
      }),
      update: vi.fn(async () => ({})),
    },
    subscription: { findUnique: vi.fn(async () => ({ plan: "FREE" })), update: vi.fn() },
    commentHistory: { count: vi.fn(async () => 0) },
    processedWebhookEvent: { create: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) },
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ── Which product a payment is for ─────────────────────────────────────

describe("which extension a webhook is about", () => {
  const variants = { linkedin: 555, x: X_VARIANT };
  it("the checkout's marker first, then the product's variant", () => {
    expect(extensionPlatformOfPayload({ meta: { custom_data: { kind: "x_extension" } } }, variants)).toBe("x");
    expect(extensionPlatformOfPayload({ meta: { custom_data: { kind: "extension" } } }, variants)).toBe("linkedin");
    expect(extensionPlatformOfPayload({ data: { attributes: { variant_id: X_VARIANT } } }, variants)).toBe("x");
    expect(extensionPlatformOfPayload({ data: { attributes: { first_order_item: { variant_id: X_VARIANT } } } }, variants)).toBe("x");
    expect(extensionPlatformOfPayload({ data: { attributes: { variant_id: 555 } } }, variants)).toBe("linkedin");
    expect(extensionPlatformOfPayload({ data: { attributes: { variant_id: 111 } } }, variants)).toBeNull();
    expect(extensionPlatformOfPayload({ meta: { custom_data: { kind: "extension" } }, data: { attributes: { variant_id: X_VARIANT } } }, variants)).toBe("linkedin");
  });
});

// ── Access per extension ───────────────────────────────────────────────

const base = { now: new Date("2026-10-04T12:00:00Z"), paywallEnforced: true, accountSuspendedAt: null, control: null, grants: [] };
const grant = (platform: string | undefined) => ({
  id: "g", startsAt: new Date("2026-10-01T00:00:00Z"), endsAt: null, revokedAt: null, reason: "partner", grantedBy: "owner", createdAt: new Date("2026-10-01T00:00:00Z"), platform,
});

describe("access, per extension", () => {
  it("paying for LinkedIn doesn't unlock X, and the reverse", () => {
    const linkedinOnly = computeEngageAccess({ ...base, subscription: { status: "active", endsAt: null }, xSubscription: null, freeUsed: 10, xFreeUsed: 3 });
    expect(linkedinOnly.platforms.linkedin).toMatchObject({ access: "unlimited", source: "subscription", freeRemaining: null });
    expect(linkedinOnly.platforms.x).toMatchObject({ access: "free", source: "free", freeUsed: 3, freeRemaining: 7 });
    // The top-level fields stay LinkedIn's, as before.
    expect(linkedinOnly).toMatchObject({ access: "unlimited", source: "subscription" });

    const xOnly = computeEngageAccess({ ...base, subscription: null, xSubscription: { status: "active", endsAt: null }, freeUsed: 4, xFreeUsed: 10 });
    expect(xOnly.platforms.x).toMatchObject({ access: "unlimited", source: "subscription" });
    expect(xOnly.platforms.linkedin).toMatchObject({ access: "free", freeRemaining: 6 });
  });

  it("each extension has its own free generations; an admin's number applies to each", () => {
    const a = computeEngageAccess({ ...base, control: { features: {}, limits: {}, freeGenerations: 20, suspendedAt: null, suspendReason: null }, subscription: null, xSubscription: null, freeUsed: 12, xFreeUsed: 20 });
    expect(a.platforms.linkedin.freeRemaining).toBe(8);
    expect(a.platforms.x.freeRemaining).toBe(0);
  });

  it("a grant unlocks the extension it names; one with no extension (given before) unlocks both", () => {
    const only = (platform: string | undefined) =>
      computeEngageAccess({ ...base, grants: [grant(platform)], subscription: null, xSubscription: null, freeUsed: 0, xFreeUsed: 0 }).platforms;
    expect(only("x")).toMatchObject({ x: { source: "grant" }, linkedin: { source: "free" } });
    expect(only("linkedin")).toMatchObject({ x: { source: "free" }, linkedin: { source: "grant" } });
    expect(only("both")).toMatchObject({ x: { source: "grant" }, linkedin: { source: "grant" } });
    expect(only(undefined)).toMatchObject({ x: { source: "grant" }, linkedin: { source: "grant" } });
  });
});

// ── The gate ───────────────────────────────────────────────────────────

describe("each generation counts against its own extension", () => {
  it("X replies use X's free generations, LinkedIn's comments LinkedIn's", async () => {
    const x = await reserveEngageGeneration("u1", "x_replies");
    expect(x).toMatchObject({ ok: true, freeRemaining: 9 });
    expect(state.users.get("u1")).toMatchObject({ xTrialUsed: 1, extensionTrialUsed: 0 });
    const li = await reserveEngageGeneration("u1", "comments");
    expect(li).toMatchObject({ ok: true, freeRemaining: 9 });
    expect(state.users.get("u1")).toMatchObject({ xTrialUsed: 1, extensionTrialUsed: 1 });
    // Shorter/Longer on X is X's.
    await reserveEngageGeneration("u1", "x_rewrites");
    expect(state.users.get("u1")!.xTrialUsed).toBe(2);
  });

  it("paying for LinkedIn still asks an X user to buy X once X's free ones are used", async () => {
    state.linkedinSubs.push({ userId: "u1", lsSubscriptionId: "li1", status: "active", endsAt: null });
    state.users.get("u1")!.xTrialUsed = 10;
    expect(await reserveEngageGeneration("u1", "comments")).toMatchObject({ ok: true, freeRemaining: null });
    const blocked = await reserveEngageGeneration("u1", "x_replies");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(402);
      expect(await blocked.response.json()).toMatchObject({ requiresSubscription: true, error: expect.stringContaining("CarouseLabs Engage for X") });
    }
  });

  it("an X subscription makes X unlimited and leaves LinkedIn on its free generations", async () => {
    state.xSubs.push({ userId: "u1", lsSubscriptionId: "x1", status: "active", endsAt: null });
    state.users.get("u1")!.extensionTrialUsed = 10;
    expect(await reserveEngageGeneration("u1", "x_messages")).toMatchObject({ ok: true, freeRemaining: null });
    expect((await reserveEngageGeneration("u1", "messages")).ok).toBe(false);
  });

  it("a failed generation gives the X free use back", async () => {
    const gate = await reserveEngageGeneration("u1", "x_replies");
    expect(state.users.get("u1")!.xTrialUsed).toBe(1);
    if (gate.ok) await gate.release();
    expect(state.users.get("u1")!.xTrialUsed).toBe(0);
  });
});

// ── Webhooks ───────────────────────────────────────────────────────────

const SECRET = "test-webhook-secret";
function webhook(body: unknown): Request {
  const raw = JSON.stringify(body);
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "x-signature": crypto.createHmac("sha256", SECRET).update(raw).digest("hex") },
    body: raw,
  });
}
const subscriptionEvent = (eventName: string, id: string, attributes: Record<string, unknown>, customData?: Record<string, unknown>) => ({
  meta: { event_name: eventName, custom_data: customData },
  data: { id, type: "subscriptions", attributes: { user_email: "buyer@example.com", ...attributes } },
});

describe("Lemon Squeezy webhooks for X", () => {
  beforeEach(() => {
    vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("LEMONSQUEEZY_EXTENSION_VARIANT_ID", "555");
  });

  it("an X purchase is filed as the X subscription, never LinkedIn's or a web plan", async () => {
    const res = await lemonSqueezyWebhook(
      webhook(subscriptionEvent("subscription_created", "x1", { status: "active", variant_id: X_VARIANT, urls: { customer_portal: "https://portal/x" } }, { user_id: "u1", kind: "x_extension" })),
    );
    expect(res.status).toBe(200);
    expect(state.xSubs).toEqual([expect.objectContaining({ userId: "u1", lsSubscriptionId: "x1", status: "active", customerPortalUrl: "https://portal/x" })]);
    expect(state.linkedinSubs).toEqual([]);
    expect((db.subscription as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled();
  });

  it("the X product's variant alone is enough, without the checkout marker", async () => {
    await lemonSqueezyWebhook(webhook(subscriptionEvent("subscription_created", "x2", { status: "active", variant_id: X_VARIANT }, { user_id: "u1" })));
    expect(state.xSubs.map((s) => s.lsSubscriptionId)).toEqual(["x2"]);
  });

  it("a LinkedIn purchase still goes to LinkedIn's, and both can be held at once", async () => {
    state.xSubs.push({ userId: "u1", lsSubscriptionId: "x1", status: "active", endsAt: null });
    await lemonSqueezyWebhook(webhook(subscriptionEvent("subscription_created", "li1", { status: "active", variant_id: 555 }, { user_id: "u1", kind: "extension" })));
    expect(state.linkedinSubs.map((s) => s.lsSubscriptionId)).toEqual(["li1"]);
    expect(state.xSubs.map((s) => s.lsSubscriptionId)).toEqual(["x1"]);
  });

  it("an X cancellation (no marker, no variant) finds its subscription in the X table", async () => {
    state.xSubs.push({ userId: "u1", lsSubscriptionId: "x1", status: "active", endsAt: null });
    state.linkedinSubs.push({ userId: "u1", lsSubscriptionId: "li1", status: "active", endsAt: null });
    await lemonSqueezyWebhook(webhook(subscriptionEvent("subscription_cancelled", "x1", { status: "cancelled", ends_at: "2026-11-04T00:00:00Z" })));
    expect(state.xSubs[0]).toMatchObject({ status: "cancelled" });
    expect(state.linkedinSubs[0]).toMatchObject({ status: "active" });
  });

  it("an X renewal pays the referrer, found through the X subscription", async () => {
    state.xSubs.push({ userId: "u1", lsSubscriptionId: "77", status: "active", endsAt: null });
    const res = await lemonSqueezyWebhook(
      webhook({ meta: { event_name: "subscription_payment_success" }, data: { id: "inv_x", type: "subscription-invoices", attributes: { subscription_id: 77, subtotal: 1500 } } }),
    );
    expect(res.status).toBe(200);
    expect(referral.createCommissionForPayment).toHaveBeenCalledWith(expect.objectContaining({ referredUserId: "u1", sourceOrderId: "inv_x", subtotalCents: 1500 }));
    expect((db.subscription as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled();
  });
});

// ── The panel and the website ──────────────────────────────────────────

const ext = (path: string, token: string) => new Request(`https://carouselabs.com${path}`, { headers: { Authorization: `Bearer ${token}` } });

describe("the panel's plan and checkout follow the extension that asks", () => {
  it("/api/ext/me: the X extension sees X's plan, the LinkedIn extension LinkedIn's", async () => {
    state.linkedinSubs.push({ userId: "u1", lsSubscriptionId: "li1", status: "active", endsAt: null, customerPortalUrl: "https://portal/li" });
    state.users.get("u1")!.xTrialUsed = 4;
    const x = await (await meGET(ext("/api/ext/me", X_TOKEN))).json();
    expect(x.extension).toMatchObject({ access: "free", freeUsed: 4, freeLimit: 10, source: "free", manageUrl: null });
    const li = await (await meGET(ext("/api/ext/me", LINKEDIN_TOKEN))).json();
    expect(li.extension).toMatchObject({ access: "unlimited", source: "subscription", manageUrl: "https://portal/li" });
  });

  it("/api/ext/checkout: the X extension gets X's checkout, stamped so the webhook files it under X", async () => {
    const res = await (await checkoutGET(ext("/api/ext/checkout", X_TOKEN))).json();
    const url = new URL(res.url);
    expect(`${url.origin}${url.pathname}`).toBe(X_CHECKOUT);
    expect(url.searchParams.get("checkout[custom][user_id]")).toBe("u1");
    expect(url.searchParams.get("checkout[custom][kind]")).toBe("x_extension");
    expect(url.searchParams.get("checkout[email]")).toBe("buyer@example.com");
  });

  it("LinkedIn's checkout is unchanged; paying for one doesn't stop buying the other", async () => {
    vi.stubEnv("LEMONSQUEEZY_EXTENSION_CHECKOUT_URL", "https://carouselabs.lemonsqueezy.com/checkout/buy/linkedin");
    state.xSubs.push({ userId: "u1", lsSubscriptionId: "x1", status: "active", endsAt: null, customerPortalUrl: "https://portal/x" });
    const li = await (await checkoutGET(ext("/api/ext/checkout", LINKEDIN_TOKEN))).json();
    expect(new URL(li.url).searchParams.get("checkout[custom][kind]")).toBe("extension");
    expect(li.url).toContain("/checkout/buy/linkedin");
    // Already paying for X: the X panel is sent to manage it, not to buy twice.
    expect(await (await checkoutGET(ext("/api/ext/checkout", X_TOKEN))).json()).toEqual({ alreadySubscribed: true, manageUrl: "https://portal/x" });
  });

  it("the X checkout link can be overridden by LEMONSQUEEZY_X_CHECKOUT_URL", async () => {
    vi.stubEnv("LEMONSQUEEZY_X_CHECKOUT_URL", "https://carouselabs.lemonsqueezy.com/checkout/buy/other");
    const c = await extensionCheckoutFor({ id: "u1", email: "buyer@example.com" }, "x");
    expect(c.kind === "checkout" && c.url).toContain("/checkout/buy/other");
  });
});
