// lib/emailArt.tsx
// Paints the art for an AI-written email (lib/emailDesign.ts), new for every
// email, in the same hand-painted style as the built-in ones:
//   - the hero: a gouache still life from gpt-image-2 (the object on the
//     right), then its headline set on the left in Fraunces, the accent in
//     violet italics. The bare painting is kept too, so a new headline needs
//     no new painting.
//   - stickers: one painted die-cut sticker per feature row. gpt-image-2 can't
//     paint on a transparent background, so it paints on flat cream and the
//     cream is cut away here (a flood fill from the edges, so cream inside
//     the sticker's white border stays).
// Everything is saved to R2 under email-art/ and loaded from there by inboxes.
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import OpenAI from "openai"
import sharp from "sharp"
import { ImageResponse } from "next/og"
import { uploadToR2 } from "@/lib/r2"
import { fitSize, readFontMetrics } from "@/lib/fontMetrics"
import { ART_FOLDER, isOurArt } from "@/lib/emailArtCheck"

export { artProblem, isOurArt } from "@/lib/emailArtCheck"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 170_000, maxRetries: 1 })

const STYLE =
  "A hand-painted gouache illustration for a premium brand email. Warm, tactile and editorial: visible brush strokes, " +
  "soft paper grain, gentle natural daylight and soft shadows. Limited palette: lilac, deep violet, soft apricot, " +
  "sunflower yellow and warm cream. The background is warm cream paper with faint painted texture and a few soft lilac " +
  "and apricot colour washes near the edges of the frame."
const HERO_LAYOUT =
  " Composition: wide landscape. The subject sits in the right third of the frame, fully visible with breathing room. " +
  "The left two-thirds is calm, empty cream paper reserved for a headline, with nothing in it. " +
  "No text, letters, numbers, logos, watermarks, signatures or UI anywhere."
const STICKER =
  "A single die-cut sticker of SUBJECT, hand-painted gouache style for a premium brand: lilac, deep violet, soft apricot, " +
  "sunflower yellow and cream, visible brush texture and a thick white sticker border. Centered, isolated, on a plain " +
  "flat warm cream background with no shadow and nothing else. No text, letters or numbers."


function artName(kind: string, ext: string) {
  const month = new Date().toISOString().slice(0, 7)
  return `${ART_FOLDER}/${month}/${randomUUID()}-${kind}.${ext}`
}

async function paint(prompt: string, size: "1600x960" | "1024x1024", quality: "high" | "medium"): Promise<Buffer> {
  const res = await openai.images.generate({ model: "gpt-image-2", prompt, n: 1, size, quality })
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error("The image model returned no picture")
  return Buffer.from(b64, "base64")
}

/** Paints the hero's still life (no headline yet) and saves it. */
export async function paintHeroScene(scene: string): Promise<string> {
  const raw = await paint(`${STYLE} The subject: ${scene}.${HERO_LAYOUT}`, "1600x960", "high")
  // Re-encoding drops the image model's metadata (C2PA etc.), as elsewhere in the app.
  const jpeg = await sharp(raw).resize(1200, 720, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer()
  return uploadToR2(jpeg.toString("base64"), artName("painting", "jpg"), "image/jpeg")
}

// The display cut of Fraunces the built-in heroes use (assets/fonts, OFL).
const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Fraunces-Display-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Fraunces-Display-Italic.ttf")),
])

const HEADLINE = { left: 88, width: 560, max: 92, min: 56, letterSpacingEm: -0.022 }

/** Sets the headline into a saved painting and saves the result: the email's hero. */
export async function setHeadline(paintingUrl: string, lead: string, accent: string): Promise<string> {
  if (!isOurArt(paintingUrl)) throw new Error("That painting isn't one of ours")
  const [regular, italic] = await fonts
  const res = await fetch(paintingUrl)
  if (!res.ok) throw new Error("Couldn't load the painting")
  const painting = Buffer.from(await res.arrayBuffer()).toString("base64")

  const size = fitSize(
    [
      { metrics: readFontMetrics(regular), text: lead },
      { metrics: readFontMetrics(italic), text: accent },
    ],
    HEADLINE,
  )
  const image = new ImageResponse(
    (
      <div style={{ display: "flex", width: 1200, height: 720, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page */}
        <img src={`data:image/jpeg;base64,${painting}`} width={1200} height={720} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        <div
          style={{
            position: "absolute",
            left: HEADLINE.left,
            top: 0,
            bottom: 0,
            width: HEADLINE.width,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontFamily: "Fraunces",
            fontSize: size,
            lineHeight: 1.02,
            letterSpacing: `${HEADLINE.letterSpacingEm}em`,
            color: "#211F1C",
          }}
        >
          <span>{lead}</span>
          <span style={{ fontStyle: "italic", color: "#5B21B6" }}>{accent}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 720,
      fonts: [
        { name: "Fraunces", data: regular, style: "normal", weight: 400 },
        { name: "Fraunces", data: italic, style: "italic", weight: 400 },
      ],
    },
  )
  const png = Buffer.from(await image.arrayBuffer())
  const jpeg = await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer()
  return uploadToR2(jpeg.toString("base64"), artName("hero", "jpg"), "image/jpeg")
}

// Cream paper and its soft shadow: warm (red above blue by 8–40), not white.
const isCream = (r: number, g: number, b: number) => r - b >= 8 && r - b <= 40 && g >= b - 2 && g <= r + 2 && b < 246 && r > 170

/** Cuts the flat cream background out of a painted sticker (keeps cream inside its white border). */
export async function cutOutSticker(painted: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(painted).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const background = new Uint8Array(w * h)
  const stack: number[] = []
  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (background[p] || !isCream(data[p * 3], data[p * 3 + 1], data[p * 3 + 2])) return
    background[p] = 1
    stack.push(p)
  }
  for (let x = 0; x < w; x++) {
    visit(x, 0)
    visit(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    visit(0, y)
    visit(w - 1, y)
  }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w
    const y = (p - x) / w
    visit(x + 1, y)
    visit(x - 1, y)
    visit(x, y + 1)
    visit(x, y - 1)
  }
  const rgba = Buffer.alloc(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    rgba[p * 4] = data[p * 3]
    rgba[p * 4 + 1] = data[p * 3 + 1]
    rgba[p * 4 + 2] = data[p * 3 + 2]
    if (background[p]) continue
    // Soften the cut edge a little.
    const x = p % w
    const edge = (x > 0 && background[p - 1]) || (x < w - 1 && background[p + 1]) || (p >= w && background[p - w]) || (p < w * (h - 1) && background[p + w])
    rgba[p * 4 + 3] = edge ? 170 : 255
  }
  const cut = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
  const trimmed = await sharp(cut).trim({ threshold: 1 }).toBuffer()
  return sharp(trimmed)
    .resize(108, 108, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** Paints one sticker ("a paper airplane"), cuts it out and saves it. */
export async function paintSticker(idea: string): Promise<string> {
  const painted = await paint(STICKER.replace("SUBJECT", idea), "1024x1024", "medium")
  const png = await cutOutSticker(painted)
  return uploadToR2(png.toString("base64"), artName("sticker", "png"), "image/png")
}
