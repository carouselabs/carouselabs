import crypto from "node:crypto"

export function signBillingIdentity(userId: string, variantId: string): string {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) throw new Error("Billing signing secret missing")
  return crypto.createHmac("sha256", secret).update(JSON.stringify(["checkout-v1", userId, variantId])).digest("hex")
}

export function verifyBillingIdentity(userId: unknown, variantId: string, signature: unknown): userId is string {
  if (typeof userId !== "string" || !userId || typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return false
  const expected = signBillingIdentity(userId, variantId)
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
}
