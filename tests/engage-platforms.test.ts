// The Engage extensions are told apart by per-extension tables, never by
// "X, otherwise LinkedIn" (lib/engage/features.ts): LinkedIn is the original,
// so only what no newer extension claims is LinkedIn's. These pin that down
// for the extensions there are, so the tables keep answering the way the
// two-way checks they replaced did.
import { describe, expect, it } from "vitest"
import { Prisma } from "@prisma/client"
import {
  NEWER_FEATURES,
  NEWER_PLATFORMS,
  PLATFORM_KINDS,
  deviceName,
  featureOfUsageKind,
  parseEngagePlatform,
  platformOfUsageKind,
  tokenPlatform,
} from "@/lib/engage/features"
import { GRANT_COVERS, grantPlatformsFor } from "@/lib/engage/grants"
import { grantCovers, featuresFor } from "@/lib/engage/accessRules"
import { featureSql, featureWhere, tokenSql, tokenWhere, TOKEN_PLATFORM_SQL } from "@/lib/engage/platformQueries"
import { requestPlatform } from "@/lib/engage/settingsRules"
import { platformOfOrigin, CONTENT_SCRIPT_ORIGINS } from "@/lib/contentScriptOrigins"
import { kindsFor, MESSAGE_HISTORY_KINDS } from "@/lib/extensionHistory"
import { extensionPlatformOfPayload } from "@/lib/extensionAccessRules"
import {
  ENGAGE_EXTENSIONS,
  ENGAGE_PLATFORMS as WEBSITE_PLATFORMS,
  platformOfPath,
  otherPlatforms,
} from "@/components/extension/engageExtensions"

const grant = (platform?: string) => ({
  id: "g",
  startsAt: new Date(0),
  endsAt: null,
  revokedAt: null,
  reason: "",
  grantedBy: "admin",
  createdAt: new Date(0),
  platform,
})

describe("which extension something belongs to", () => {
  it("a sign-in: labelled ones are the newer extension's, everything else LinkedIn's", () => {
    expect(tokenPlatform("X extension · Chrome on Mac")).toBe("x")
    expect(tokenPlatform("Reddit extension · Edge on Windows")).toBe("reddit")
    expect(tokenPlatform("Chrome on Mac OS X")).toBe("linkedin")
    expect(tokenPlatform(null)).toBe("linkedin")
    expect(deviceName("X extension · Chrome on Mac")).toBe("Chrome on Mac")
    expect(deviceName("Reddit extension · Edge on Windows")).toBe("Edge on Windows")
    expect(deviceName("Chrome on Windows")).toBe("Chrome on Windows")
    expect(deviceName(null)).toBeNull()
  })

  it("a ?platform= value: a known extension, else LinkedIn", () => {
    expect(parseEngagePlatform("x")).toBe("x")
    expect(parseEngagePlatform("reddit")).toBe("reddit")
    expect(parseEngagePlatform("linkedin")).toBe("linkedin")
    for (const v of [null, undefined, "", "X", "Reddit", "toString", 3]) expect(parseEngagePlatform(v)).toBe("linkedin")
  })

  it("a usage kind: tools follow their extension's feature", () => {
    expect(platformOfUsageKind("x_rewrites")).toBe("x")
    expect(platformOfUsageKind("x_tests")).toBe("x")
    expect(platformOfUsageKind("rewrites")).toBe("linkedin")
    expect(platformOfUsageKind("messages")).toBe("linkedin")
    expect(featureOfUsageKind("tests")).toBe("comments")
    expect(featureOfUsageKind("x_tests")).toBe("x_replies")
    expect(featuresFor("rewrites")).toEqual(["comments", "replies"])
    expect(featuresFor("x_rewrites")).toEqual(["x_replies"])
    expect(PLATFORM_KINDS.x).toEqual({ rewrites: "x_rewrites", tests: "x_tests", messages: "x_messages" })
    expect(platformOfUsageKind("reddit_comments")).toBe("reddit")
    expect(platformOfUsageKind("reddit_rewrites")).toBe("reddit")
    expect(platformOfUsageKind("reddit_tests")).toBe("reddit")
    expect(featuresFor("reddit_tests")).toEqual(["reddit_comments"])
    expect(PLATFORM_KINDS.reddit).toEqual({ rewrites: "reddit_rewrites", tests: "reddit_tests", messages: "reddit_messages" })
  })

  it("a request: by its route, its page, or its history kinds", () => {
    expect(requestPlatform("/api/ext/x/reply")).toBe("x")
    expect(requestPlatform("/api/ext/reddit/comment")).toBe("reddit")
    expect(requestPlatform("/api/ext/redditx/comment")).toBe("linkedin")
    expect(requestPlatform("/api/ext/generate")).toBe("linkedin")
    expect(requestPlatform("/api/ext/xyz/reply")).toBe("linkedin")
    expect(platformOfOrigin("https://x.com")).toBe("x")
    expect(platformOfOrigin("https://www.reddit.com")).toBe("reddit")
    expect(platformOfOrigin("https://old.reddit.com")).toBeNull()
    expect(platformOfOrigin("https://www.linkedin.com")).toBe("linkedin")
    expect(platformOfOrigin("https://evil.example")).toBeNull()
    expect(platformOfOrigin(null)).toBeNull()
    expect(CONTENT_SCRIPT_ORIGINS).toEqual(["https://www.linkedin.com", "https://x.com", "https://www.reddit.com"])
    expect(kindsFor("x")).toEqual(["x_reply", "x_message"])
    expect(kindsFor("reddit")).toEqual(["reddit_comment", "reddit_message"])
    expect(MESSAGE_HISTORY_KINDS).toEqual({ linkedin: "message", x: "x_message", reddit: "reddit_message" })
  })

  it("a website page: below a launched extension's own base, else LinkedIn's", () => {
    expect(platformOfPath("/extension/x")).toBe("x")
    expect(platformOfPath("/extension/x/history")).toBe("x")
    expect(platformOfPath("/extension/xyz")).toBe("linkedin")
    expect(platformOfPath("/extension/history")).toBe("linkedin")
    // Reddit has no website pages until it launches: none of the website's
    // menus or "Also on" cards offer it yet.
    expect(ENGAGE_EXTENSIONS.reddit.launched).toBe(false)
    expect(WEBSITE_PLATFORMS).toEqual(["linkedin", "x"])
    expect(otherPlatforms("x")).toEqual(["linkedin"])
    expect(otherPlatforms("linkedin")).toEqual(["x"])
  })

  it("a payment: by its product's variant", () => {
    const variants = { linkedin: 11, x: 22, reddit: 44 }
    const event = (variant_id: number) => ({ data: { attributes: { variant_id } } })
    expect(extensionPlatformOfPayload(event(22), variants)).toBe("x")
    expect(extensionPlatformOfPayload(event(11), variants)).toBe("linkedin")
    expect(extensionPlatformOfPayload(event(44), variants)).toBe("reddit")
    expect(extensionPlatformOfPayload(event(33), variants)).toBeNull()
    // An unset variant (0) never matches a payload without one.
    expect(extensionPlatformOfPayload({ data: { attributes: {} } }, { linkedin: 0, x: 22, reddit: 0 })).toBeNull()
  })
})

describe("admin grants", () => {
  it('"both" is LinkedIn + X, as when it was given, and nothing added later', () => {
    expect(GRANT_COVERS.both).toEqual(["linkedin", "x"])
    expect(grantCovers(grant("both"), "linkedin")).toBe(true)
    expect(grantCovers(grant("both"), "x")).toBe(true)
    expect(grantCovers(grant(undefined), "x")).toBe(true)
    expect(grantCovers(grant("x"), "linkedin")).toBe(false)
    expect(grantCovers(grant("linkedin"), "x")).toBe(false)
    expect(grantPlatformsFor("linkedin")).toEqual(["both", "linkedin"])
    expect(grantPlatformsFor("x")).toEqual(["both", "x"])
  })

  it('"both" and older grants never unlock Reddit; a Reddit grant only Reddit', () => {
    expect(grantCovers(grant("both"), "reddit")).toBe(false)
    expect(grantCovers(grant(undefined), "reddit")).toBe(false)
    expect(grantCovers(grant("linkedin"), "reddit")).toBe(false)
    expect(grantCovers(grant("reddit"), "reddit")).toBe(true)
    expect(grantCovers(grant("reddit"), "linkedin")).toBe(false)
    expect(grantCovers(grant("reddit"), "x")).toBe(false)
    expect(grantPlatformsFor("reddit")).toEqual(["reddit"])
  })
})

describe("database filters", () => {
  it("LinkedIn's sign-ins are the unlabelled ones and anything no newer extension claims", () => {
    expect(tokenWhere("x")).toEqual({ device: { startsWith: "X extension" } })
    expect(tokenWhere("reddit")).toEqual({ device: { startsWith: "Reddit extension" } })
    expect(tokenWhere("linkedin")).toEqual({
      OR: [
        { device: null },
        { NOT: { OR: [{ device: { startsWith: "X extension" } }, { device: { startsWith: "Reddit extension" } }] } },
      ],
    })
    expect(tokenSql("x").values).toEqual(["X extension%"])
    expect(tokenSql("reddit").values).toEqual(["Reddit extension%"])
    expect(tokenSql("linkedin").sql).toMatch(/^\(t\.device IS NULL OR NOT \(t\.device LIKE \? OR t\.device LIKE \?\)\)$/)
    expect(tokenSql("linkedin").values).toEqual(["X extension%", "Reddit extension%"])
    expect(TOKEN_PLATFORM_SQL.sql).toBe(
      "CASE WHEN t.device LIKE ? THEN 'x' WHEN t.device LIKE ? THEN 'reddit' ELSE 'linkedin' END",
    )
  })

  it("LinkedIn's errors and AI calls are those of no newer extension's features", () => {
    const newer = ["x_replies", "x_messages", "reddit_comments", "reddit_messages"]
    expect(NEWER_PLATFORMS).toEqual(["x", "reddit"])
    expect(NEWER_FEATURES).toEqual(newer)
    expect(featureWhere("x")).toEqual({ feature: { in: ["x_replies", "x_messages"] } })
    expect(featureWhere("reddit")).toEqual({ feature: { in: ["reddit_comments", "reddit_messages"] } })
    expect(featureWhere("linkedin")).toEqual({ feature: { notIn: newer } })
    const sql = featureSql("linkedin", Prisma.sql`c.feature`)
    expect(sql.sql).toBe("AND c.feature NOT IN (?,?,?,?)")
    expect(sql.values).toEqual(newer)
  })
})
