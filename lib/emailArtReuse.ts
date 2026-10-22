// lib/emailArtReuse.ts — putting saved art (lib/emailArtLibrary.ts) into an
// email design. The writer answers with the id of a saved picture or sticker
// where one fits ("saved"); here that becomes the saved image itself, with its
// own description, so nothing new is painted. A saved picture still gets this
// email's headline drawn on it, which costs nothing. Pure, so it's tested
// directly.
import { designStickers, type EmailDesign } from "@/lib/emailDesign"

export type SavedArtRef = { id: string; url: string; description: string }

// Which saved art the writer chose, read from its raw answer before the design
// is validated (validation drops the "saved" ids). Stickers are in the order
// designStickers lists them.
export interface SavedPicks {
  picture: string | null
  stickers: (string | null)[]
}

const savedId = (value: unknown): string | null =>
  typeof value === "string" && /^[\w-]{1,64}$/.test(value) ? value : null

export function savedPicks(rawDesign: unknown): SavedPicks {
  const design = (rawDesign ?? {}) as { hero?: { saved?: unknown }; blocks?: unknown }
  const stickers: (string | null)[] = []
  if (Array.isArray(design.blocks)) {
    for (const block of design.blocks as { type?: unknown; items?: unknown }[]) {
      if (block?.type !== "features" || !Array.isArray(block.items)) continue
      for (const item of block.items as { sticker?: { saved?: unknown } }[]) stickers.push(savedId(item?.sticker?.saved))
    }
  }
  return { picture: savedId(design.hero?.saved), stickers }
}

/**
 * Puts the chosen saved art into the design: the picture as its painting
 * (the headline still has to be drawn on, for free) and each chosen sticker
 * as painted. An id that isn't in the library is ignored: that art is
 * painted new as usual.
 */
export function applySavedArt(
  design: EmailDesign,
  picks: SavedPicks,
  library: { pictures: SavedArtRef[]; stickers: SavedArtRef[] },
): EmailDesign {
  const picture = picks.picture ? library.pictures.find((a) => a.id === picks.picture) : undefined
  const stickerById = new Map(library.stickers.map((a) => [a.id, a]))
  let index = 0
  return {
    ...design,
    hero: picture
      ? design.hero.paintingUrl === picture.url
        ? design.hero
        : { ...design.hero, scene: picture.description, paintingUrl: picture.url, imageUrl: undefined }
      : design.hero,
    blocks: design.blocks.map((b) =>
      b.type === "features"
        ? {
            ...b,
            items: b.items.map((item) => {
              const pick = picks.stickers[index++]
              const saved = pick ? stickerById.get(pick) : undefined
              return saved ? { ...item, sticker: { idea: saved.description, imageUrl: saved.url } } : item
            }),
          }
        : b,
    ),
  }
}

// How many of the design's images still cost a painting: a picture with no
// painting, and stickers with no image. A painting waiting for its headline
// costs nothing.
export function paintingsNeeded(design: EmailDesign): { picture: boolean; headline: boolean; stickers: number } {
  return {
    picture: !design.hero.paintingUrl,
    headline: !design.hero.imageUrl,
    stickers: designStickers(design).filter((s) => !s.imageUrl).length,
  }
}

// The writer's paint button: what it will make. "Paint picture & 2 stickers",
// "Paint 1 sticker & add headline", or just "Add headline" (free) when a saved
// picture only needs this email's headline drawn on.
export function artActionLabel(need: { picture: boolean; headline: boolean; stickers: number }): string {
  const parts = [need.picture ? "picture" : null, need.stickers ? `${need.stickers} sticker${need.stickers === 1 ? "" : "s"}` : null].filter(Boolean)
  const paint = parts.length ? `Paint ${parts.join(" & ")}` : ""
  if (!need.headline || need.picture) return paint
  return paint ? `${paint} & add headline` : "Add headline"
}
