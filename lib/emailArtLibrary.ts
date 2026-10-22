// lib/emailArtLibrary.ts — the AI email writer's saved art (EmailArt): every
// bare painting and sticker it paints is kept with what it shows, so a later
// email reuses it instead of paying the image model again. The writer is shown
// the library and suggests saved art when it fits (lib/ai/emailWriter.ts);
// the admin can also pick from it in the writer. Until
// scripts/email-art-library.sql has been run there's no library: nothing is
// saved and the writer simply paints new art.
import { db } from "@/lib/db"
import { isOurArt } from "@/lib/emailArtCheck"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

export type ArtKind = "picture" | "sticker"

export interface SavedArt {
  id: string
  kind: ArtKind
  url: string
  // What it shows: the scene of a picture, the idea of a sticker.
  description: string
  createdAt: Date
}

// What the writer is shown, newest first: enough to choose from, small enough
// to keep every request cheap.
export const WRITER_LIBRARY_LIMIT: Record<ArtKind, number> = { picture: 60, sticker: 120 }

const select = { id: true, kind: true, url: true, description: true, createdAt: true } as const

export async function listArt(kind: ArtKind, limit = 200): Promise<SavedArt[]> {
  try {
    const rows = await db.emailArt.findMany({ where: { kind }, orderBy: { createdAt: "desc" }, take: limit, select })
    return rows as SavedArt[]
  } catch (err) {
    if (isEngageSchemaMissing(err)) return []
    throw err
  }
}

// The library as the writer sees it. Never throws: no library means new art.
export async function writerLibrary(): Promise<{ pictures: SavedArt[]; stickers: SavedArt[] }> {
  try {
    const [pictures, stickers] = await Promise.all([
      listArt("picture", WRITER_LIBRARY_LIMIT.picture),
      listArt("sticker", WRITER_LIBRARY_LIMIT.sticker),
    ])
    return { pictures, stickers }
  } catch (err) {
    console.error("[emailArtLibrary] couldn't load saved art:", err instanceof Error ? err.message : err)
    return { pictures: [], stickers: [] }
  }
}

// A freshly painted picture or sticker joins the library. Only our own art,
// and never more than once. Never throws: painting must not fail over it.
export async function saveArt(kind: ArtKind, url: string, description: string, createdBy?: string): Promise<void> {
  if (!isOurArt(url)) return
  try {
    await db.emailArt.upsert({
      where: { url },
      create: { kind, url, description: description.trim(), createdBy },
      update: {},
    })
  } catch (err) {
    if (!isEngageSchemaMissing(err)) console.error("[emailArtLibrary] couldn't save art:", err instanceof Error ? err.message : err)
  }
}

// Out of the library. The file stays: emails already sent still show it.
export async function removeArt(id: string): Promise<boolean> {
  const { count } = await db.emailArt.deleteMany({ where: { id } })
  return count > 0
}
