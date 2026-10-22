// lib/ai/emailWriter.ts
// The AI email writer (Admin → Broadcasts → Write with AI): the admin
// describes an email in plain words, Claude writes it as a structured design
// (lib/emailDesign.ts), and each later message revises it. Claude also
// proposes the picture (a still life + its headline) and the stickers; they're
// painted only once the admin approves (lib/emailArt.tsx). It's shown the
// saved art (lib/emailArtLibrary.ts) and reuses a picture or sticker whenever
// one fits, so only what's new costs a painting (lib/emailArtReuse.ts).
//
// It writes only from the real product facts below, which are read from the
// same code the pricing page uses, so they can't go out of date.
import Anthropic from "@anthropic-ai/sdk"
import { APP_URL } from "@/emails/theme"
import { AVAILABLE_VARIABLES } from "@/lib/broadcastRender"
import { carryArt, designStickers, emailDesignSchema, type EmailDesign } from "@/lib/emailDesign"
import { parseJsonObject } from "@/lib/ai/jsonAnswer"
import { applySavedArt, savedPicks, type SavedArtRef } from "@/lib/emailArtReuse"
import {
  CREDIT_COST_LINES,
  EXTENSION_PLAN,
  EXTENSION_STORE_URL,
  PLANS,
  X_EXTENSION_PLAN,
  X_EXTENSION_STORE_URL,
} from "@/lib/plans"

// The most capable model: an admin writes a few of these a week, and the
// copy is what people read.
export const EMAIL_WRITER_MODEL = "claude-opus-5-5"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 110_000, maxRetries: 1 })

export function productFacts(): string {
  const plans = PLANS.map(
    (p) =>
      `- ${p.name}: ${p.price === 0 ? "free" : `$${p.price}${p.priceSuffix}`}, ${p.credits}. ` +
      p.features.map((f) => f.label).join("; "),
  ).join("\n")
  const extension = (plan: typeof EXTENSION_PLAN | typeof X_EXTENSION_PLAN, store: string | null) =>
    `- ${plan.name}: $${plan.price}${plan.priceSuffix}, ${plan.freeGenerations} free generations to try it first, no card needed. ` +
    `${plan.tagline} ${plan.features.join("; ")}. ${plan.note}` +
    (store ? ` Install from the Chrome Web Store: ${store}` : "")
  return `CarouseLabs (${APP_URL}) is an AI social media content studio for creators and professionals.
In the web app: 10 post ideas in one click, shaped by the person's niche and audience; captions; images; 7–8 slide carousels downloadable as a PDF; the Content Hub calendar to plan and schedule posts; voice guidelines so captions sound like the person.

Plans for the web app:
${plans}
Credits: ${CREDIT_COST_LINES.join(" ")}
Extra credits (top-ups) can be bought any time from Billing.

CarouseLabs Engage: two separate Chrome extensions, each its own $15/month plan, bought separately, not included in Free/Pro/Growth:
${extension(EXTENSION_PLAN, EXTENSION_STORE_URL)}
${extension(X_EXTENSION_PLAN, X_EXTENSION_STORE_URL)}

Pages you may link to:
- ${APP_URL}/dashboard (create posts)
- ${APP_URL}/content-hub (plan and schedule)
- ${APP_URL}/settings/billing (plans and top-ups)
- ${APP_URL}/extension (Engage for LinkedIn: install steps and account)
- ${APP_URL}/extension/x (Engage for X)
${[EXTENSION_STORE_URL, X_EXTENSION_STORE_URL].filter(Boolean).map((u) => `- ${u}`).join("\n")}
- https://www.linkedin.com/feed/ and https://x.com/home`
}

const DESIGN_SHAPE = `{
  "version": 1,
  "subject": "…",
  "preview": "…",
  "hero": { "lead": "…", "accent": "…", "scene": "…", "saved": "<a saved picture's id, or leave it out>" },
  "blocks": [
    { "type": "text", "text": "Hi {{firstName}},\\n\\nParagraph… **bold**, *italic*, [link text](https://carouselabs.com/…)" },
    { "type": "heading", "text": "…" },
    { "type": "features", "items": [ { "title": "…", "text": "…", "sticker": { "idea": "a paper airplane" } }, { "title": "…", "text": "…", "sticker": { "idea": "<a saved sticker's description>", "saved": "<its id>" } } ] },
    { "type": "steps", "items": ["…", "…"] },
    { "type": "facts", "items": [["Label", "Value"]] },
    { "type": "button", "label": "…", "href": "https://…" },
    { "type": "note", "text": "small print" }
  ]
}`

// For a personal email to one person (from their admin profile): who they
// are, from their account, so the email gets their situation right.
function personSection(about: { facts: string } | undefined): string {
  if (!about) return ""
  return `

THIS EMAIL GOES TO ONE PERSON
It's a personal email from the CarouseLabs team to the person below, sent only to them. Their account, as of today:
${about.facts}
Use this to get their situation right and to choose what's worth saying (what they haven't tried yet, what fits their plan). Write like a person who knows them, not like a report: never recite numbers back at them, never mention data, tracking or "our records", and don't say anything they'd be surprised we know. You may use their first name directly instead of {{firstName}}.`
}

export type ArtLibrary = { pictures: SavedArtRef[]; stickers: SavedArtRef[] }

// The art already painted for earlier emails. Reusing it costs nothing;
// painting new costs money, so the writer prefers a saved one that fits.
function librarySection(library: ArtLibrary | undefined): string {
  if (!library || (library.pictures.length === 0 && library.stickers.length === 0)) return ""
  const list = (items: SavedArtRef[]) => items.map((a) => `- [${a.id}] ${a.description}`).join("\n") || "(none yet)"
  return `

SAVED ART (painted for earlier emails: reusing one is free, painting a new one costs money)
Pictures (bare paintings; this email's headline is drawn on fresh, so any headline works):
${list(library.pictures)}
Stickers:
${list(library.stickers)}
Reuse whenever one fits well: when a saved picture is a good visual metaphor for this email, set hero.saved to its id and hero.scene to its description exactly; for a feature that a saved sticker suits, give the sticker { "idea": its description exactly, "saved": its id }. Only ids from these lists. Paint new (no "saved") only for what nothing here fits. A sticker idea must still be different from the others in the email.`
}

function systemPrompt(about?: { facts: string }, library?: ArtLibrary): string {
  return `You write emails for CarouseLabs with the admin who runs it. You're the writer at a premium product company: warm, clear, specific and confident. Every email you write is something a person chose to read; respect that.

THE PRODUCT (the only facts you may use):
${productFacts()}

RULES
- Never invent anything: no numbers, prices, discounts, deadlines, results, user counts, testimonials or features that aren't in THE PRODUCT above. If the admin gives a detail (say, a discount code), use exactly what they gave. If an email needs something you don't know, write the best draft without it and ask for it in your reply.
- Plain words and short sentences. No emoji. No hype ("unlock", "supercharge", "elevate", "game-changer", "revolutionize", "seamless", "leverage", "delve", "in today's fast-paced world"), no fake urgency, no ALL CAPS, at most one exclamation mark, avoid dashes as asides.
- "You" for the reader, "we" for CarouseLabs. Open the body with a text block starting "Hi {{firstName}},". Don't sign off: the email already ends with "The CarouseLabs Team".
- One clear call to action: exactly one button block, linking to the most useful page. Links only to the pages listed above.
- Short: about 90–220 words in the blocks unless the admin asks for more.
- Merge fields you may use: ${AVAILABLE_VARIABLES.map((v) => `{{${v.key}}}`).join(", ")}. No others.
- subject: at most 60 characters, sentence case, specific, no emoji. preview: 60–110 characters that adds to the subject instead of repeating it.
- hero.lead and hero.accent: the headline painted into the email's picture, read as one line: lead plain, accent in italics. Each 1–4 words; the accent ends with a full stop. Like "You made the cut." / "Engage is on us.", or "Running low" / "on credits.". No merge fields.
- hero.scene: one tangible object or a tiny still life that is a visual metaphor for the email, in one sentence ("an open tin of brand-new coloured pencils", "a paper airplane snagged on a thin branch"). No people, faces, hands, screens, phones, logos, text, letters or numbers. It's painted in a fixed hand-painted gouache style; don't describe style or colours.
- Stickers only appear in a "features" block (2–4 rows): each sticker idea is one simple object ("a light bulb", "a fountain pen"), all different. Use features only when the email really lists features or benefits.
- When the admin asks for a change, change only that. Keep everything else exactly as it was, including hero.scene and every sticker idea, so the pictures already painted can be kept. Change the scene or a sticker only when asked or when the email's topic changed.${librarySection(library)}${personSection(about)}

ANSWER
Reply with one JSON object and nothing else:
{ "reply": "a short message to the admin", "design": ${DESIGN_SHAPE} }
"reply" is 2–5 plain sentences: what you wrote or changed, then the art plan in this form: "Picture: <scene> (saved, no new painting | new painting), with the headline "<lead> <accent>". Stickers: <ideas, each marked saved or new, or none>." End by asking them to approve the picture and stickers (or say what to change) before anything new is painted. When the draft says some art is already painted and you kept it unchanged, say it stays as painted instead of asking again; ask only about art that's new or changed. If something important is missing, ask that one question too.`
}

export type WriterTurn = { role: "admin" | "writer"; text: string }

export class EmailWriterError extends Error {}

/**
 * Writes or revises the email. `history` is the conversation so far (the
 * writer's turns are its replies), `current` the latest draft (null at first).
 * Painted art is carried over wherever the idea didn't change.
 */
export async function writeEmail(input: {
  history: WriterTurn[]
  request: string
  current: EmailDesign | null
  // A personal email to one person: their account facts (lib/emailRecipientFacts.ts).
  about?: { facts: string }
  // The saved art it may reuse (lib/emailArtLibrary.ts).
  library?: ArtLibrary
}): Promise<{
  reply: string
  design: EmailDesign
}> {
  const messages: Anthropic.MessageParam[] = input.history.slice(-12).map((t) => ({
    role: t.role === "admin" ? "user" : "assistant",
    content: t.text,
  }))
  // The API needs the conversation to start with the admin.
  while (messages.length && messages[0].role !== "user") messages.shift()
  const draft = input.current
    ? `The current draft (keep everything I don't ask to change):\n${JSON.stringify(stripArt(input.current))}\n${paintedNote(input.current)}\n\n`
    : ""
  messages.push({ role: "user", content: `${draft}${input.request}` })

  let lastProblem = ""
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.create({
      model: EMAIL_WRITER_MODEL,
      max_tokens: 6000,
      system: systemPrompt(input.about, input.library),
      messages,
    })
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
    const parsed = parseJsonObject(raw)
    const reply = typeof parsed?.reply === "string" ? parsed.reply.trim() : ""
    const design = emailDesignSchema.safeParse(
      parsed?.design && typeof parsed.design === "object" ? { ...(parsed.design as object), version: 1 } : null,
    )
    if (reply && design.success) {
      // Painted art carries over where the idea stayed; saved art it chose is put in.
      const carried = carryArt(input.current, design.data)
      const withSaved = input.library ? applySavedArt(carried, savedPicks(parsed?.design), input.library) : carried
      return { reply: reply.slice(0, 2000), design: withSaved }
    }
    lastProblem =
      response.stop_reason === "max_tokens"
        ? "Your answer was cut off. Answer again with the complete JSON, keeping the email shorter."
        : `That answer didn't follow the format: ${
            design.success ? "the reply was missing" : design.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          }. Answer again with the complete JSON only.`
    messages.push({ role: "assistant", content: raw || "(no answer)" }, { role: "user", content: lastProblem })
  }
  throw new EmailWriterError("The writer couldn't produce a usable email this time. Try again, or say it differently.")
}

// Which art is already painted, so the writer doesn't ask to approve it again.
function paintedNote(design: EmailDesign): string {
  const stickers = designStickers(design).filter((s) => s.imageUrl).map((s) => `"${s.idea}"`)
  const parts = [design.hero.paintingUrl ? "the picture" : null, stickers.length ? `the stickers ${stickers.join(", ")}` : null].filter(Boolean)
  return parts.length ? `Already painted: ${parts.join(" and ")}.` : "Nothing is painted yet."
}

// The model doesn't need image addresses, only the ideas.
function stripArt(design: EmailDesign): EmailDesign {
  return {
    ...design,
    hero: { lead: design.hero.lead, accent: design.hero.accent, scene: design.hero.scene },
    blocks: design.blocks.map((b) =>
      b.type === "features" ? { ...b, items: b.items.map((i) => ({ ...i, sticker: { idea: i.sticker.idea } })) } : b,
    ),
  }
}
