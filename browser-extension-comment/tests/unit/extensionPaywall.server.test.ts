// @vitest-environment node
// The backend's paywall (lib/extAccess.ts) and its Lemon Squeezy routing
// (lib/extensionBilling.ts + app/api/webhooks/lemonsqueezy), run against an
// in-memory stand-in for Prisma. Mocks are addressed by relative path: the
// backend's own "@/…" imports resolve to the same files (vitest.config.ts).
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Sub = { userId: string; lsSubscriptionId: string; status: string; endsAt: Date | null; customerPortalUrl?: string | null };

const state = vi.hoisted(() => ({
  enforced: true,
  users: new Map<string, { id: string; email: string; extensionTrialUsed: number }>(),
  extSubs: [] as Sub[],
}));

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  extensionSubscription: { findUnique: vi.fn(), upsert: vi.fn() },
  subscription: { update: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  processedWebhookEvent: { create: vi.fn(), delete: vi.fn() },
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/commentCredits", () => ({
  get COMMENT_CREDITS_ENFORCED() {
    return state.enforced;
  },
}));
vi.mock("../../../lib/lemonsqueezy", () => ({ planForVariantId: () => "PRO", creditsForPlan: () => 300 }));
vi.mock("../../../lib/email", () => ({
  sendUpgradedToProEmail: vi.fn(),
  sendSubscriptionCancelledEmail: vi.fn(),
  sendMonthlyResetEmail: vi.fn(),
  sendTopUpEmail: vi.fn(),
}));
const referral = vi.hoisted(() => ({ createCommissionForPayment: vi.fn(async () => "created") }));
vi.mock("../../../lib/referral", () => referral);

import { reserveExtGeneration } from "../../../lib/extAccess";
import { POST as lemonSqueezyWebhook } from "../../../app/api/webhooks/lemonsqueezy/route";

beforeEach(() => {
  state.enforced = true;
  state.users = new Map([["u1", { id: "u1", email: "buyer@example.com", extensionTrialUsed: 0 }]]);
  state.extSubs = [];

  db.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => state.users.get(where.id) ?? null);
  db.user.findFirst.mockImplementation(async ({ where }: { where: { email: string } }) =>
    [...state.users.values()].find((u) => u.email === where.email) ?? null,
  );
  // Mirrors Prisma's conditional updateMany: only rows matching the guard change.
  db.user.updateMany.mockImplementation(
    async ({ where, data }: { where: { id: string; extensionTrialUsed: { lt?: number; gt?: number } }; data: { extensionTrialUsed: { increment?: number; decrement?: number } } }) => {
      const user = state.users.get(where.id);
      const used = user?.extensionTrialUsed ?? 0;
      const { lt, gt } = where.extensionTrialUsed;
      if (!user || (lt !== undefined && !(used < lt)) || (gt !== undefined && !(used > gt))) return { count: 0 };
      user.extensionTrialUsed += (data.extensionTrialUsed.increment ?? 0) - (data.extensionTrialUsed.decrement ?? 0);
      return { count: 1 };
    },
  );
  db.extensionSubscription.findUnique.mockImplementation(
    async ({ where }: { where: { userId?: string; lsSubscriptionId?: string } }) =>
      state.extSubs.find((s) => (where.userId ? s.userId === where.userId : s.lsSubscriptionId === where.lsSubscriptionId)) ?? null,
  );
  db.extensionSubscription.upsert.mockImplementation(async ({ where, create, update }: { where: { userId: string }; create: Sub; update: Partial<Sub> }) => {
    const existing = state.extSubs.find((s) => s.userId === where.userId);
    if (existing) Object.assign(existing, update);
    else state.extSubs.push({ ...create });
  });
  db.subscription.update.mockResolvedValue({});
  db.subscription.findUnique.mockResolvedValue({ plan: "FREE", creditsUsed: 0, creditsTotal: 0, upgradeScheduled: false });
  db.processedWebhookEvent.create.mockResolvedValue({});
  db.processedWebhookEvent.delete.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("free generations", () => {
  it("counts down from 10 and then blocks with a subscription prompt", async () => {
    const remaining: (number | null)[] = [];
    for (let i = 0; i < 10; i += 1) {
      const gate = await reserveExtGeneration("u1");
      expect(gate.ok).toBe(true);
      if (gate.ok) remaining.push(gate.freeRemaining);
    }
    expect(remaining).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

    const blocked = await reserveExtGeneration("u1");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(402);
      expect(await blocked.response.json()).toMatchObject({ requiresSubscription: true });
    }
    expect(state.users.get("u1")!.extensionTrialUsed).toBe(10);
  });

  it("gives the free use back when the generation fails", async () => {
    const gate = await reserveExtGeneration("u1");
    expect(state.users.get("u1")!.extensionTrialUsed).toBe(1);
    if (gate.ok) await gate.release();
    expect(state.users.get("u1")!.extensionTrialUsed).toBe(0);
  });

  it("never lets two racing requests share the last free use", async () => {
    state.users.get("u1")!.extensionTrialUsed = 9;
    const [a, b] = await Promise.all([reserveExtGeneration("u1"), reserveExtGeneration("u1")]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(state.users.get("u1")!.extensionTrialUsed).toBe(10);
  });

  it("is unlimited with an active subscription, and doesn't touch the free count", async () => {
    state.users.get("u1")!.extensionTrialUsed = 10;
    state.extSubs.push({ userId: "u1", lsSubscriptionId: "s1", status: "active", endsAt: null });
    const gate = await reserveExtGeneration("u1");
    expect(gate).toMatchObject({ ok: true, freeRemaining: null });
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("falls back to the free count once a cancelled subscription has ended", async () => {
    state.users.get("u1")!.extensionTrialUsed = 10;
    state.extSubs.push({ userId: "u1", lsSubscriptionId: "s1", status: "cancelled", endsAt: new Date(Date.now() - 1000) });
    expect((await reserveExtGeneration("u1")).ok).toBe(false);
  });

  it("is switched off entirely while COMMENT_CREDITS_ENFORCED is false", async () => {
    state.enforced = false;
    state.users.get("u1")!.extensionTrialUsed = 10;
    expect(await reserveExtGeneration("u1")).toMatchObject({ ok: true, freeRemaining: null });
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });
});

const SECRET = "test-webhook-secret";

function webhook(body: unknown): Request {
  const raw = JSON.stringify(body);
  const signature = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "x-signature": signature },
    body: raw,
  });
}

const subscriptionEvent = (eventName: string, id: string, attributes: Record<string, unknown>, customData?: Record<string, unknown>) => ({
  meta: { event_name: eventName, custom_data: customData },
  data: { id, type: "subscriptions", attributes: { user_email: "buyer@example.com", ...attributes } },
});

describe("Lemon Squeezy webhook routing", () => {
  beforeEach(() => {
    vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("LEMONSQUEEZY_EXTENSION_VARIANT_ID", "555");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records an extension purchase on the extension table, never as a web plan", async () => {
    const res = await lemonSqueezyWebhook(
      webhook(
        subscriptionEvent(
          "subscription_created",
          "s1",
          { status: "active", variant_id: 555, customer_id: 7, renews_at: "2026-10-26T00:00:00Z", urls: { customer_portal: "https://portal" } },
          { user_id: "u1", kind: "extension" },
        ),
      ),
    );
    expect(res.status).toBe(200);
    expect(state.extSubs).toEqual([
      expect.objectContaining({ userId: "u1", lsSubscriptionId: "s1", status: "active", customerPortalUrl: "https://portal" }),
    ]);
    expect(db.subscription.update).not.toHaveBeenCalled();
    // The buyer is found by the id stamped at checkout, not by the email.
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("keeps an extension renewal invoice away from the web plan's credit reset", async () => {
    state.extSubs.push({ userId: "u1", lsSubscriptionId: "42", status: "active", endsAt: null });
    const res = await lemonSqueezyWebhook(
      webhook({
        meta: { event_name: "subscription_payment_success" },
        data: { id: "inv_1", type: "subscription-invoices", attributes: { subscription_id: 42, user_email: "buyer@example.com", subtotal: 1500 } },
      }),
    );
    expect(res.status).toBe(200);
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("pays the referrer 8% of each extension payment, keyed by the invoice", async () => {
    state.extSubs.push({ userId: "u1", lsSubscriptionId: "42", status: "active", endsAt: null });
    await lemonSqueezyWebhook(
      webhook({
        meta: { event_name: "subscription_payment_success" },
        data: { id: "inv_7", type: "subscription-invoices", attributes: { subscription_id: 42, subtotal: 1500, total: 1620 } },
      }),
    );
    expect(referral.createCommissionForPayment).toHaveBeenCalledWith({
      referredUserId: "u1",
      sourceOrderId: "inv_7",
      // Pre-tax subtotal, like the web plans.
      subtotalCents: 1500,
      sourceEvent: "subscription_payment_success",
    });
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("pays it on the first payment too, before the subscription is stored", async () => {
    await lemonSqueezyWebhook(
      webhook({
        meta: { event_name: "subscription_payment_success", custom_data: { user_id: "u1", kind: "extension" } },
        data: { id: "inv_1", type: "subscription-invoices", attributes: { subscription_id: 99, subtotal: 1500 } },
      }),
    );
    expect(referral.createCommissionForPayment).toHaveBeenCalledWith(expect.objectContaining({ referredUserId: "u1", sourceOrderId: "inv_1" }));
  });

  it("expiring the extension subscription leaves the web plan alone", async () => {
    state.extSubs.push({ userId: "u1", lsSubscriptionId: "s1", status: "cancelled", endsAt: null });
    await lemonSqueezyWebhook(webhook(subscriptionEvent("subscription_expired", "s1", { status: "expired", variant_id: 555 })));
    expect(state.extSubs[0].status).toBe("expired");
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("ignores a late event for an older extension subscription", async () => {
    state.extSubs.push({ userId: "u1", lsSubscriptionId: "s2", status: "active", endsAt: null });
    await lemonSqueezyWebhook(
      webhook(subscriptionEvent("subscription_expired", "s1", { status: "expired", variant_id: 555 }, { user_id: "u1", kind: "extension" })),
    );
    expect(state.extSubs).toEqual([expect.objectContaining({ lsSubscriptionId: "s2", status: "active" })]);
  });

  it("doesn't grant anything when the buyer can't be identified", async () => {
    await lemonSqueezyWebhook(
      webhook(subscriptionEvent("subscription_created", "s9", { status: "active", variant_id: 555 }, { user_id: "nobody", kind: "extension" })),
    );
    expect(db.extensionSubscription.upsert).not.toHaveBeenCalled();
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("still sends web-plan events down the web path", async () => {
    await lemonSqueezyWebhook(webhook(subscriptionEvent("subscription_created", "w1", { status: "active", variant_id: 111 })));
    expect(db.subscription.update).toHaveBeenCalledTimes(1);
    expect(db.extensionSubscription.upsert).not.toHaveBeenCalled();
  });
});
