// lib/creatorCtaPaint.ts — My CTA in the generation routes (lib/creatorCta.ts):
// reading the `cta` a request sends (checked, the CTA proven to be the
// creator's own, the placement words moderated) and what the image model
// gets with a picture that carries the CTA: the creator's photo and/or the
// CarouseLabs logo as extra attached images, and a note saying what each
// attached image is for. Everything happens before any credits are charged.
import type OpenAI from "openai"
import { toFile, type Uploadable } from "openai"
import { moderateStyleText } from "@/lib/styleDescriptionCheck"
import { allowedTextNote, attachmentsNote, parseCtaChoice, type Attachment, type CtaCardData, type CtaChoice, type CtaFormat } from "@/lib/creatorCta"
import { CtaError, ctaForGeneration, loadCarouselabsLogo, loadCtaPhoto } from "@/lib/creatorCtaStore"

export type RequestCta = { choice: CtaChoice; card: CtaCardData | null; photoUrl: string | null }

export const UNSAFE_PLACE_MESSAGE = "That placement can't be used. Just say where the CTA goes and how big it is."

/** The request's `cta`, checked: null when none was sent. Throws CtaError when it can't be used. */
export async function readRequestCta(
  userId: string,
  raw: unknown,
  format: CtaFormat,
  moderate: (text: string) => Promise<boolean | null> = moderateStyleText,
): Promise<RequestCta | null> {
  if (raw === undefined || raw === null) return null
  const parsed = parseCtaChoice(raw, format)
  if (!parsed.ok) throw new CtaError(parsed.error)
  if (parsed.choice.describe && (await moderate(parsed.choice.describe)) === true) throw new CtaError(UNSAFE_PLACE_MESSAGE)
  const { card, photoUrl } = await ctaForGeneration(userId, parsed.choice)
  return { choice: parsed.choice, card, photoUrl }
}

type ImageEditor = { images: { edit: (params: OpenAI.Images.ImageEditParamsNonStreaming) => Promise<OpenAI.Images.ImagesResponse> } }

/**
 * images.edit, asking the model to keep the creator's face when the photo is
 * attached. Should the model ever refuse that setting, the same picture is
 * made without it rather than failing.
 */
export async function paintWithCta(client: ImageEditor, params: Omit<OpenAI.Images.ImageEditParamsNonStreaming, "image">, painting: PaintingInputs) {
  const request = { ...params, image: painting.files, ...(painting.keepFace ? { input_fidelity: "high" as const } : {}) }
  try {
    return await client.images.edit(request)
  } catch (err) {
    if (!painting.keepFace || !/input_fidelity/i.test(err instanceof Error ? err.message : String(err))) throw err
    console.warn("[cta] input_fidelity refused, painting without it")
    return client.images.edit({ ...params, image: painting.files })
  }
}

export type PaintingInputs = {
  // Every image to attach, in order (the style reference first).
  files: Uploadable[]
  // Said after the prompt: what each attached image is, and the text allowed.
  note: string
  // The creator's face must survive: ask the model to keep input features closely.
  keepFace: boolean
}

/**
 * What goes to the image model with one picture: its style reference (if
 * any), the creator's photo when it shows their CTA, and the CarouseLabs
 * logo when it's the CarouseLabs slide.
 */
export async function paintingInputs(input: {
  userId: string
  style: { data: string; mediaType: string } | null
  photoUrl: string | null
  photo: boolean
  logo: boolean
}): Promise<PaintingInputs> {
  const order: Attachment[] = []
  const files: Uploadable[] = []
  if (input.style) {
    order.push("style")
    files.push(
      await toFile(Buffer.from(input.style.data.replace(/^data:image\/\w+;base64,/, ""), "base64"), input.style.mediaType === "image/png" ? "reference.png" : "reference.jpg", {
        type: input.style.mediaType || "image/jpeg",
      }),
    )
  }
  const photo = input.photo && input.photoUrl
  if (photo) {
    order.push("photo")
    files.push(await toFile(await loadCtaPhoto(input.userId, input.photoUrl!), "creator-photo.png", { type: "image/png" }))
  }
  if (input.logo) {
    let logo: Buffer
    try {
      logo = await loadCarouselabsLogo()
    } catch {
      throw new CtaError("The CarouseLabs slide couldn't be prepared just now. Try again.", 502)
    }
    order.push("logo")
    files.push(await toFile(logo, "carouselabs-logo.png", { type: "image/png" }))
  }
  // With only a style reference, the route's own reference wording covers it.
  const extra = order.some((a) => a !== "style")
  const note = extra ? [attachmentsNote(order), allowedTextNote({ photo: !!photo, logo: input.logo })].filter(Boolean).join("\n") : ""
  return { files, note, keepFace: !!photo }
}
