import { z } from "zod"

export const slideSchema = z.object({
  slideNumber: z.number().int().min(1).max(20),
  role: z.enum(["hook", "body", "cta"]),
  headline: z.string().max(2000),
  imageUrl: z.string().url().max(4096),
  prompt: z.string().max(30_000).optional(),
})
export const slidesSchema = z.array(slideSchema).min(1).max(20).refine(
  (slides) => new Set(slides.map((s) => s.slideNumber)).size === slides.length,
  "Slide numbers must be unique",
)
export const draftSchema = z.object({
  caption: z.string().max(100_000),
  slides: slidesSchema.optional(),
  size: z.enum(["4:5", "1:1"]).optional(),
  image: z.object({
    imageUrl: z.string().url().max(4096),
    imagePrompt: z.string().max(30_000),
  }).optional(),
})
export type DraftSlide = z.infer<typeof slideSchema>
export type DraftImage = NonNullable<z.infer<typeof draftSchema>["image"]>
export const slideRole = { hook: "COVER", body: "CONTENT", cta: "CTA" } as const

/** Accept only this owner's uploads on the configured storage origin/path. */
export function ownedR2Key(value: string, userId: string, allowed = ["posts", "carousel", "custom-posts"], publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL): string | null {
  if (!publicBase) return null
  try {
    const base = new URL(publicBase)
    const url = new URL(value)
    if (url.protocol !== "https:" || url.origin !== base.origin || url.username || url.password || url.search || url.hash) return null
    const prefix = base.pathname.replace(/\/$/, "") + "/"
    if (!url.pathname.startsWith(prefix)) return null
    const key = decodeURIComponent(url.pathname.slice(prefix.length))
    if (key.split("/").some((part) => part === "." || part === "..") || key.includes("\\")) return null
    return allowed.some((folder) => key.startsWith(`${folder}/${userId}/`)) ? key : null
  } catch { return null }
}
