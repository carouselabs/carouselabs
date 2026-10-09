// lib/engage/audience.ts
// Who counts as a user of each Engage extension, for email audiences
// (broadcasts, scheduled emails, sequences): someone who signed in to that
// extension, or generated anything with it. The same rule as the admin's
// Engage users list (USES in lib/engage/adminQueries.ts), so a broadcast to
// "Engage for X users" reaches the people that list shows for X.
import type { Prisma } from "@prisma/client"
import { X_DEVICE_PREFIX, type EngagePlatform } from "@/lib/engage/features"
import { kindsFor } from "@/lib/extensionHistory"

// A sign-in belongs to the X extension when its device label says so
// (X_DEVICE_PREFIX); every other one, including unlabelled ones, to LinkedIn.
function tokenOf(platform: EngagePlatform): Prisma.ExtensionTokenWhereInput {
  return platform === "x"
    ? { device: { startsWith: X_DEVICE_PREFIX } }
    : { OR: [{ device: null }, { NOT: { device: { startsWith: X_DEVICE_PREFIX } } }] }
}

export function usesEngageWhere(platform: EngagePlatform): Prisma.UserWhereInput {
  return {
    OR: [
      { extensionTokens: { some: tokenOf(platform) } },
      { commentHistory: { some: { kind: { in: [...kindsFor(platform)] } } } },
    ],
  }
}

// The audience values (lib/segments.ts) for each extension's users.
export const ENGAGE_SEGMENTS: Record<string, EngagePlatform> = {
  engage_linkedin: "linkedin",
  engage_x: "x",
}
