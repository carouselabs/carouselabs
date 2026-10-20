// lib/emailArtCheck.ts
// Checks on the pictures an AI-written email points at, kept apart from the
// painting code (lib/emailArt.tsx) so campaigns can check without loading
// the image model.

export const ART_FOLDER = "email-art"

/** True for a picture lib/emailArt.tsx saved (what a design may point at). */
export function isOurArt(url: string | undefined): boolean {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL
  return !!url && !!base && url.startsWith(`${base}/${ART_FOLDER}/`)
}

/**
 * Whether a design's pictures can be sent: every one is ours (saved by this
 * module) and, when `painted` is asked for, nothing is still waiting to be
 * painted. Returns what's wrong, or null.
 */
export function artProblem(
  design: { hero: { imageUrl?: string; paintingUrl?: string }; blocks: { type: string; items?: unknown }[] },
  { painted }: { painted: boolean },
): string | null {
  const stickers = design.blocks.flatMap((b) =>
    b.type === "features" && Array.isArray(b.items) ? (b.items as { sticker: { imageUrl?: string } }[]).map((i) => i.sticker) : [],
  )
  const urls = [design.hero.imageUrl, design.hero.paintingUrl, ...stickers.map((s) => s.imageUrl)].filter((u): u is string => !!u)
  if (urls.some((u) => !isOurArt(u))) return "This email points at a picture that isn't one of ours."
  if (painted && (!design.hero.imageUrl || stickers.some((s) => !s.imageUrl))) {
    return "Paint the picture and stickers first."
  }
  return null
}
