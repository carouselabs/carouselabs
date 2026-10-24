// lib/emailDesign.ts
// An email written with the AI email writer (Admin → Broadcasts → Write with
// AI), as structured data rather than HTML: subject, preview line, a painted
// hero with its headline, and a short list of blocks. It renders through the
// same layout as every other CarouseLabs email (emails/DesignedEmail.tsx), and
// its links and merge fields are checked here before anything is sent.
// No server-only imports: the admin page validates with it too.
import { z } from "zod"
import { AVAILABLE_VARIABLES } from "@/lib/broadcastRender"
import { EXTENSION_STORE_URL, X_EXTENSION_STORE_URL } from "@/lib/plans"
import { FIELD_KEY_RE } from "@/lib/leadRules"

// Where a button or link may point: the site, the two Chrome Web Store
// listings, and LinkedIn / X themselves.
const LINK_HOSTS = new Set([
  "carouselabs.com",
  "www.carouselabs.com",
  "linkedin.com",
  "www.linkedin.com",
  "x.com",
])
const STORE_URLS = [EXTENSION_STORE_URL, X_EXTENSION_STORE_URL].filter((u): u is string => !!u)

export function isAllowedLink(href: string): boolean {
  if (href === "{{referralLink}}") return true
  if (STORE_URLS.includes(href)) return true
  try {
    const url = new URL(href)
    return url.protocol === "https:" && LINK_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

const VARIABLE_KEYS = new Set<string>(AVAILABLE_VARIABLES.map((v) => v.key))

/** Merge fields a piece of text uses that aren't the standard ones (e.g. {{company}}, a lead's column). */
export function unknownVariables(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((key) => !VARIABLE_KEYS.has(key))
}

/**
 * Merge fields that can't be anything: neither a standard one nor shaped
 * like a lead's column ({{companyName}}, lib/leadRules.ts). Whether the
 * people an email goes to have a lead column is checked when it's sent
 * (lib/campaigns.ts checkMergeFields).
 */
export function invalidVariables(text: string): string[] {
  return unknownVariables(text).filter((key) => !FIELD_KEY_RE.test(key))
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((t) => invalidVariables(t).length === 0, { message: "Uses a merge field that doesn't exist" })

const link = z.string().trim().max(500).refine(isAllowedLink, { message: "Links can only go to carouselabs.com, the Chrome Web Store listings, LinkedIn or X" })

// A painted image the email shows. Filled once it has been painted (the
// server checks it's one of ours before sending).
const imageUrl = z
  .string()
  .max(500)
  .refine((u) => u.startsWith("https://"), { message: "Not an image address" })
  .optional()

export const stickerSchema = z.object({
  // What the sticker shows, in a few words ("a paper airplane").
  idea: z.string().trim().min(2).max(120),
  imageUrl,
})

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: text(1500) }),
  z.object({ type: z.literal("heading"), text: text(90) }),
  z.object({
    type: z.literal("features"),
    items: z.array(z.object({ title: text(70), text: text(260), sticker: stickerSchema })).min(2).max(4),
  }),
  z.object({ type: z.literal("steps"), items: z.array(text(260)).min(2).max(5) }),
  z.object({ type: z.literal("facts"), items: z.array(z.tuple([text(50), text(80)])).min(1).max(6) }),
  z.object({ type: z.literal("button"), label: text(40), href: link }),
  z.object({ type: z.literal("note"), text: text(400) }),
])

export const emailDesignSchema = z.object({
  version: z.literal(1),
  subject: text(120),
  preview: text(160),
  hero: z.object({
    // The headline painted into the picture: plain, then the accent in italics.
    lead: z.string().trim().min(1).max(40),
    accent: z.string().trim().min(1).max(40),
    // What the painting shows, in a sentence ("an open box of new pencils").
    scene: z.string().trim().min(5).max(300),
    // The bare painting (no headline), so a new headline needs no new painting.
    paintingUrl: imageUrl,
    // The painting with the headline set into it: what the email shows.
    imageUrl,
  }),
  blocks: z.array(blockSchema).min(1).max(14),
})

export type EmailDesign = z.infer<typeof emailDesignSchema>
export type EmailDesignBlock = EmailDesign["blocks"][number]
export type DesignSticker = z.infer<typeof stickerSchema>

/** Every sticker the email shows, in order. */
export function designStickers(design: EmailDesign): DesignSticker[] {
  return design.blocks.flatMap((b) => (b.type === "features" ? b.items.map((i) => i.sticker) : []))
}

/** What still has to be painted before the email can go out. */
export function unpaintedArt(design: EmailDesign): { hero: boolean; stickers: number } {
  return { hero: !design.hero.imageUrl, stickers: designStickers(design).filter((s) => !s.imageUrl).length }
}

export function isFullyPainted(design: EmailDesign): boolean {
  const missing = unpaintedArt(design)
  return !missing.hero && missing.stickers === 0
}

/**
 * Carries painted images over from the previous draft wherever the AI kept
 * the same idea, and drops them where it changed it (that needs painting
 * again). A changed headline keeps the painting but needs the headline set
 * again; a changed scene needs a new painting.
 */
export function carryArt(previous: EmailDesign | null, next: EmailDesign): EmailDesign {
  if (!previous) {
    return {
      ...next,
      hero: { ...next.hero, paintingUrl: undefined, imageUrl: undefined },
      blocks: next.blocks.map((b) =>
        b.type === "features" ? { ...b, items: b.items.map((i) => ({ ...i, sticker: { idea: i.sticker.idea } })) } : b,
      ),
    }
  }
  const sameScene = previous.hero.scene === next.hero.scene
  const sameHeadline = previous.hero.lead === next.hero.lead && previous.hero.accent === next.hero.accent
  const paintedStickers = new Map(designStickers(previous).filter((s) => s.imageUrl).map((s) => [s.idea, s.imageUrl!]))
  return {
    ...next,
    hero: {
      ...next.hero,
      paintingUrl: sameScene ? previous.hero.paintingUrl : undefined,
      imageUrl: sameScene && sameHeadline ? previous.hero.imageUrl : undefined,
    },
    blocks: next.blocks.map((b) =>
      b.type === "features"
        ? { ...b, items: b.items.map((i) => ({ ...i, sticker: { idea: i.sticker.idea, imageUrl: paintedStickers.get(i.sticker.idea) } })) }
        : b,
    ),
  }
}

/** The email as plain text: kept as the campaign's body for search and history. */
export function designPlainText(design: EmailDesign): string {
  const lines: string[] = [`${design.hero.lead} ${design.hero.accent}`]
  for (const b of design.blocks) {
    if (b.type === "text" || b.type === "heading" || b.type === "note") lines.push(b.text)
    else if (b.type === "features") lines.push(...b.items.map((i) => `${i.title}: ${i.text}`))
    else if (b.type === "steps") lines.push(...b.items.map((s, n) => `${n + 1}. ${s}`))
    else if (b.type === "facts") lines.push(...b.items.map(([k, v]) => `${k}: ${v}`))
    else if (b.type === "button") lines.push(`${b.label}: ${b.href}`)
  }
  return lines.join("\n\n")
}
