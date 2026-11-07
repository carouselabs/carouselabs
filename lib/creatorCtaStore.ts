// lib/creatorCtaStore.ts — saving and loading My CTA (lib/creatorCta.ts):
// the creator's photo (CtaProfile) and up to 3 saved CTAs (CtaCard), and what
// a generation needs from them: the chosen CTA, checked to be theirs, and the
// photo's bytes for the image model. Before scripts/my-cta.sql has run the
// tables aren't there: reading says so (ready: false) and saving explains.
import { randomUUID } from "node:crypto"
import sharp from "sharp"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { ownedR2Key } from "@/lib/postInput"
import { EMAIL_IMAGES } from "@/emails/theme"
import { MAX_CTAS, ctaCardInputSchema, drawsCreatorCta, type CtaCardData, type CtaCardInput, type CtaChoice } from "@/lib/creatorCta"

export class CtaError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

export const CTA_SQL_MISSING = "My CTA isn't switched on yet. It will be ready shortly."
export const CTA_FOLDER = "cta"

async function orMissing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (err) {
    if (isEngageSchemaMissing(err)) throw new CtaError(CTA_SQL_MISSING, 503)
    throw err
  }
}

const toCard = (c: { id: string; label: string; name: string; headline: string | null; line: string; extra: string | null; isDefault: boolean }): CtaCardData => ({
  id: c.id,
  label: c.label,
  name: c.name,
  headline: c.headline,
  line: c.line,
  extra: c.extra,
  isDefault: c.isDefault,
})

export type MyCta = {
  // false until scripts/my-cta.sql has run.
  ready: boolean
  photoUrl: string | null
  cards: CtaCardData[]
  // Where a photo can come from besides an upload.
  photoSources: { linkedin: boolean; startPage: boolean }
  // To fill a new CTA in.
  profile: { name: string; headline: string }
}

/** Everything Settings → My CTA and the create flow show. */
export async function getMyCta(user: { id: string; profile?: { name: string | null; headline: string | null } | null }): Promise<MyCta> {
  const [linkedin, startPage] = await Promise.all([
    db.linkedInAccount.findUnique({ where: { userId: user.id }, select: { pictureUrl: true } }).catch(() => null),
    db.startPage.findUnique({ where: { userId: user.id }, select: { avatarUrl: true } }).catch(() => null),
  ])
  const base = {
    photoSources: { linkedin: !!linkedin?.pictureUrl, startPage: !!startPage?.avatarUrl },
    profile: { name: user.profile?.name?.trim() ?? "", headline: user.profile?.headline?.trim() ?? "" },
  }
  try {
    const [photo, cards] = await Promise.all([
      db.ctaProfile.findUnique({ where: { userId: user.id }, select: { photoUrl: true } }),
      db.ctaCard.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    ])
    return { ready: true, photoUrl: photo?.photoUrl ?? null, cards: cards.map(toCard), ...base }
  } catch (err) {
    if (isEngageSchemaMissing(err)) return { ready: false, photoUrl: null, cards: [], ...base }
    throw err
  }
}

function cardData(input: CtaCardInput) {
  const parsed = ctaCardInputSchema.safeParse(input)
  if (!parsed.success) throw new CtaError(parsed.error.issues[0]?.message ?? "Check the CTA's words")
  const d = parsed.data
  return { label: d.label, name: d.name, headline: d.headline || null, line: d.line, extra: d.extra || null, isDefault: d.isDefault }
}

/** Saves a new CTA (up to MAX_CTAS); the first one is the default. */
export async function createCta(userId: string, input: CtaCardInput): Promise<CtaCardData> {
  const data = cardData(input)
  return orMissing(async () => {
    const count = await db.ctaCard.count({ where: { userId } })
    if (count >= MAX_CTAS) throw new CtaError(`You can keep up to ${MAX_CTAS} CTAs. Delete one to add another.`)
    const isDefault = count === 0 || data.isDefault === true
    if (isDefault) await db.ctaCard.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
    const card = await db.ctaCard.create({ data: { ...data, userId, isDefault } })
    return toCard(card)
  })
}

export async function updateCta(userId: string, id: string, input: CtaCardInput): Promise<CtaCardData> {
  const data = cardData(input)
  return orMissing(async () => {
    const before = await db.ctaCard.findFirst({ where: { id, userId }, select: { isDefault: true } })
    if (!before) throw new CtaError("That CTA isn't there any more", 404)
    // The default can be moved to another CTA, never taken away from all of them.
    const isDefault = before.isDefault || data.isDefault === true
    if (isDefault && !before.isDefault) await db.ctaCard.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
    const card = await db.ctaCard.update({ where: { id }, data: { ...data, isDefault } })
    return toCard(card)
  })
}

/** Deletes a CTA; when it was the default, the oldest one left becomes it. */
export async function deleteCta(userId: string, id: string): Promise<void> {
  await orMissing(async () => {
    const card = await db.ctaCard.findFirst({ where: { id, userId }, select: { isDefault: true } })
    if (!card) throw new CtaError("That CTA isn't there any more", 404)
    await db.ctaCard.delete({ where: { id } })
    if (card.isDefault) {
      const next = await db.ctaCard.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true } })
      if (next) await db.ctaCard.update({ where: { id: next.id }, data: { isDefault: true } })
    }
  })
}

// ── The photo ───────────────────────────────────────────────────────────

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024
const PHOTO_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "gif"])

/** A square, upright JPEG of the photo, ready to save. */
export async function preparePhoto(input: Buffer): Promise<Buffer> {
  if (input.length > PHOTO_MAX_BYTES) throw new CtaError("That photo is over 8 MB. Use a smaller one.", 413)
  let format: string | undefined
  try {
    format = (await sharp(input).metadata()).format
  } catch {
    format = undefined
  }
  if (!format || !PHOTO_FORMATS.has(format)) throw new CtaError("That file isn't a photo we can read. Use a JPG, PNG or WebP.")
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize(640, 640, { fit: "cover", position: "attention" })
    .flatten({ background: "#FFFFFF" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
}

/** Saves the creator's photo ("this is me") for every CTA. */
export async function setCtaPhoto(userId: string, input: Buffer): Promise<string> {
  const jpeg = await preparePhoto(input)
  // Checked before uploading, so nothing is stored while the tables aren't there.
  await orMissing(() => db.ctaProfile.findUnique({ where: { userId }, select: { userId: true } }))
  const url = await uploadToR2(jpeg.toString("base64"), `${CTA_FOLDER}/${userId}/${randomUUID()}.jpg`, "image/jpeg")
  await orMissing(() => db.ctaProfile.upsert({ where: { userId }, create: { userId, photoUrl: url }, update: { photoUrl: url } }))
  return url
}

// The server only fetches from LinkedIn's picture servers or our own storage:
// a Start Page photo address is whatever was saved there, so it's never
// fetched from anywhere else.
export function importableHost(url: string, source: "linkedin" | "startPage"): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== "https:" || u.username || u.password) return false
    if (source === "linkedin") return u.hostname === "media.licdn.com" || u.hostname.endsWith(".licdn.com")
    const base = process.env.CLOUDFLARE_R2_PUBLIC_URL
    return !!base && u.origin === new URL(base).origin
  } catch {
    return false
  }
}

/** Uses the photo from their LinkedIn connection or their Start Page. */
export async function importCtaPhoto(userId: string, source: "linkedin" | "startPage"): Promise<string> {
  const url =
    source === "linkedin"
      ? (await db.linkedInAccount.findUnique({ where: { userId }, select: { pictureUrl: true } }))?.pictureUrl
      : (await db.startPage.findUnique({ where: { userId }, select: { avatarUrl: true } }))?.avatarUrl
  if (!url || !/^https:\/\//.test(url)) throw new CtaError(source === "linkedin" ? "Your LinkedIn connection has no photo. Upload one instead." : "Your Start Page has no photo. Upload one instead.", 404)
  if (!importableHost(url, source)) throw new CtaError("That photo can't be copied. Upload it instead.")
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "error" })
  } catch {
    throw new CtaError("Couldn't get that photo just now. Upload one instead.", 502)
  }
  if (!res.ok) throw new CtaError(source === "linkedin" ? "LinkedIn's photo link has expired. Reconnect LinkedIn, or upload a photo." : "Couldn't get that photo. Upload one instead.", 502)
  return setCtaPhoto(userId, Buffer.from(await res.arrayBuffer()))
}

export async function removeCtaPhoto(userId: string): Promise<void> {
  await orMissing(() => db.ctaProfile.updateMany({ where: { userId }, data: { photoUrl: null } }))
}

// ── What a generation needs ─────────────────────────────────────────────

export type GenerationCta = { card: CtaCardData | null; photoUrl: string | null }

/**
 * The chosen CTA and photo for a generation, checked to be this creator's
 * own. A choice that draws no CTA needs neither (so it works before the SQL
 * has run).
 */
export async function ctaForGeneration(userId: string, choice: CtaChoice): Promise<GenerationCta> {
  if (!drawsCreatorCta(choice) || !choice.ctaId) return { card: null, photoUrl: null }
  const [card, photo] = await orMissing(() =>
    Promise.all([
      db.ctaCard.findFirst({ where: { id: choice.ctaId!, userId } }),
      db.ctaProfile.findUnique({ where: { userId }, select: { photoUrl: true } }),
    ]),
  )
  if (!card) throw new CtaError("That CTA isn't there any more. Pick another one.", 404)
  if (!photo?.photoUrl) throw new CtaError("Add your photo in My CTA first: it goes on your CTA.")
  return { card: toCard(card), photoUrl: photo.photoUrl }
}

/** The photo's bytes for the image model (only a photo saved here, by this creator). */
export async function loadCtaPhoto(userId: string, url: string): Promise<Buffer> {
  if (!ownedR2Key(url, userId, [CTA_FOLDER])) throw new CtaError("Your CTA photo can't be used. Upload it again in My CTA.")
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new CtaError("Your CTA photo couldn't be loaded. Upload it again in My CTA.", 502)
  return sharp(Buffer.from(await res.arrayBuffer())).resize(512, 512, { fit: "cover" }).png().toBuffer()
}

let logo: Promise<Buffer> | null = null

/** The CarouseLabs logo for the image model: the email logo, bigger, on white. */
export function loadCarouselabsLogo(): Promise<Buffer> {
  logo ??= (async () => {
    const res = await fetch(`${EMAIL_IMAGES}/logo.png`, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`logo ${res.status}`)
    return sharp(Buffer.from(await res.arrayBuffer()))
      .resize({ width: 1008 })
      .extend({ top: 60, bottom: 60, left: 60, right: 60, background: "#FFFFFF" })
      .flatten({ background: "#FFFFFF" })
      .png()
      .toBuffer()
  })().catch((err) => {
    logo = null
    throw err
  })
  return logo
}
