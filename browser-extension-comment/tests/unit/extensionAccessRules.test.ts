// The backend's paywall rules (lib/extensionAccessRules.ts, in the Next.js
// project) are pure, so they are tested directly, like messagePrompt.
import { describe, expect, it } from "vitest";
import {
  EXT_FREE_GENERATIONS,
  isExtensionPayload,
  isExtensionSubscriptionActive,
  shouldApplyToStored,
  subscriptionIdOf,
} from "../../../lib/extensionAccessRules";

const NOW = new Date("2026-09-26T12:00:00Z");
const tomorrow = new Date("2026-09-27T12:00:00Z");
const yesterday = new Date("2026-09-25T12:00:00Z");

describe("extension subscription access", () => {
  it("gives 10 free generations", () => {
    expect(EXT_FREE_GENERATIONS).toBe(10);
  });

  it.each(["active", "on_trial", "past_due"])("%s is usable", (status) => {
    expect(isExtensionSubscriptionActive({ status, endsAt: null }, NOW)).toBe(true);
  });

  it.each(["expired", "unpaid", "paused"])("%s is not usable", (status) => {
    expect(isExtensionSubscriptionActive({ status, endsAt: tomorrow }, NOW)).toBe(false);
  });

  it("keeps a cancelled subscription usable until the paid period ends, and not after", () => {
    expect(isExtensionSubscriptionActive({ status: "cancelled", endsAt: tomorrow }, NOW)).toBe(true);
    expect(isExtensionSubscriptionActive({ status: "cancelled", endsAt: yesterday }, NOW)).toBe(false);
    expect(isExtensionSubscriptionActive({ status: "cancelled", endsAt: null }, NOW)).toBe(false);
  });

  it("treats no subscription as not usable", () => {
    expect(isExtensionSubscriptionActive(null, NOW)).toBe(false);
    expect(isExtensionSubscriptionActive(undefined, NOW)).toBe(false);
  });
});

describe("webhook classification", () => {
  const EXT_VARIANT = 555;

  it("reads the subscription id from a subscription event and from an invoice", () => {
    expect(subscriptionIdOf({ meta: { event_name: "subscription_updated" }, data: { id: "sub_1", type: "subscriptions" } })).toBe("sub_1");
    expect(
      subscriptionIdOf({
        meta: { event_name: "subscription_payment_success" },
        data: { id: "inv_9", type: "subscription-invoices", attributes: { subscription_id: 42 } },
      }),
    ).toBe("42");
    // An invoice's own id is never mistaken for the subscription's.
    expect(
      subscriptionIdOf({ meta: { event_name: "subscription_payment_failed" }, data: { id: "inv_9", type: "subscription-invoices" } }),
    ).toBeNull();
    expect(subscriptionIdOf({ meta: { event_name: "order_created" }, data: { id: "ord_1", type: "orders" } })).toBeNull();
  });

  it("recognises the checkout marker and the extension variant", () => {
    expect(isExtensionPayload({ meta: { custom_data: { kind: "extension" } } }, EXT_VARIANT)).toBe(true);
    expect(isExtensionPayload({ data: { attributes: { variant_id: EXT_VARIANT } } }, EXT_VARIANT)).toBe(true);
    expect(isExtensionPayload({ data: { attributes: { first_order_item: { variant_id: EXT_VARIANT } } } }, EXT_VARIANT)).toBe(true);
  });

  it("leaves web-plan and top-up events alone", () => {
    expect(isExtensionPayload({ data: { attributes: { variant_id: 111 } } }, EXT_VARIANT)).toBe(false);
    expect(isExtensionPayload({ meta: { custom_data: { user_id: "u1" } }, data: { attributes: { first_order_item: { variant_id: 222 } } } }, EXT_VARIANT)).toBe(false);
  });

  it("never matches every event when the variant env var is unset", () => {
    expect(isExtensionPayload({ data: { attributes: {} } }, 0)).toBe(false);
    expect(isExtensionPayload({ data: { attributes: { variant_id: 0 } } }, 0)).toBe(false);
    // The checkout marker still works on its own.
    expect(isExtensionPayload({ meta: { custom_data: { kind: "extension" } } }, 0)).toBe(true);
  });
});

describe("out-of-order events", () => {
  it("applies events for the stored subscription, or when nothing is stored", () => {
    expect(shouldApplyToStored(null, "sub_2", "subscription_updated")).toBe(true);
    expect(shouldApplyToStored("sub_2", "sub_2", "subscription_expired")).toBe(true);
  });

  it("ignores a late event about an older subscription", () => {
    expect(shouldApplyToStored("sub_2", "sub_1", "subscription_expired")).toBe(false);
    expect(shouldApplyToStored("sub_2", "sub_1", "subscription_updated")).toBe(false);
  });

  it("lets a new subscription replace the stored one", () => {
    expect(shouldApplyToStored("sub_1", "sub_2", "subscription_created")).toBe(true);
  });
});
