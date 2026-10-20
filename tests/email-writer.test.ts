// The AI email writer (Admin → Broadcasts → Write with AI): the email format
// and its safety rules (lib/emailDesign.ts), keeping or dropping painted art
// as the email changes, rendering and personalizing (lib/emailDesignRender.ts),
// the art checks and the sticker cut-out (lib/emailArt*.ts), headline sizing
// (lib/fontMetrics.ts), and the writer's answer handling (lib/ai/emailWriter.ts).
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const anthropic = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: anthropic.create }
  },
}))

import { carryArt, designPlainText, emailDesignSchema, isAllowedLink, isFullyPainted, unknownVariables, unpaintedArt, type EmailDesign } from "@/lib/emailDesign"
import { personalizeDesignedEmail, renderDesignedEmail } from "@/lib/emailDesignRender"
import { artProblem } from "@/lib/emailArtCheck"
import { fitSize, readFontMetrics, textWidth } from "@/lib/fontMetrics"
import { EmailWriterError, productFacts, writeEmail } from "@/lib/ai/emailWriter"
import { EXTENSION_STORE_URL, PRO_PLAN } from "@/lib/plans"

const R2 = "https://art.example.test"
const art = (name: string) => `${R2}/email-art/2026-10/${name}`

function design(overrides: Partial<EmailDesign> = {}): EmailDesign {
  return {
    version: 1,
    subject: "Three quick ways to use Engage today",
    preview: "Start with one comment. Engage writes it in your voice, and you stay in control.",
    hero: { lead: "Your first comment", accent: "takes a minute.", scene: "two paper cups joined by a taut string" },
    blocks: [
      { type: "text", text: "Hi {{firstName}},\n\nHere are **three** quick wins. See [your plan](https://carouselabs.com/settings/billing)." },
      {
        type: "features",
        items: [
          { title: "Comment in your voice", text: "Let Engage draft it.", sticker: { idea: "a fountain pen" } },
          { title: "Add a connection note", text: "A short, personal note.", sticker: { idea: "a sealed envelope" } },
        ],
      },
      { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
      { type: "note", text: "Nothing is ever posted for you." },
    ],
    ...overrides,
  }
}

function painted(d: EmailDesign = design()): EmailDesign {
  return {
    ...d,
    hero: { ...d.hero, paintingUrl: art("p.jpg"), imageUrl: art("h.jpg") },
    blocks: d.blocks.map((b) =>
      b.type === "features" ? { ...b, items: b.items.map((i, n) => ({ ...i, sticker: { ...i.sticker, imageUrl: art(`s${n}.png`) } })) } : b,
    ),
  }
}

beforeEach(() => vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", R2))
afterEach(() => vi.unstubAllEnvs())

describe("the email format's safety rules", () => {
  it("links only to the site, the two Chrome Web Store listings, LinkedIn and X", () => {
    expect(isAllowedLink("https://carouselabs.com/extension")).toBe(true)
    expect(isAllowedLink(EXTENSION_STORE_URL!)).toBe(true)
    expect(isAllowedLink("https://www.linkedin.com/feed/")).toBe(true)
    expect(isAllowedLink("{{referralLink}}")).toBe(true)
    expect(isAllowedLink("https://evil.example.com/")).toBe(false)
    expect(isAllowedLink("http://carouselabs.com/")).toBe(false)
    expect(isAllowedLink("javascript:alert(1)")).toBe(false)
    const bad = design({ blocks: [{ type: "button", label: "Go", href: "https://evil.example.com/" }] })
    expect(emailDesignSchema.safeParse(bad).success).toBe(false)
  })

  it("allows only the merge fields that exist", () => {
    expect(unknownVariables("Hi {{firstName}}, you have {{creditsRemaining}}")).toEqual([])
    expect(unknownVariables("Hi {{company}}")).toEqual(["company"])
    const bad = design({ blocks: [{ type: "text", text: "Hi {{company}}" }] })
    expect(emailDesignSchema.safeParse(bad).success).toBe(false)
    expect(emailDesignSchema.safeParse(design()).success).toBe(true)
  })

  it("knows what's still to paint", () => {
    expect(unpaintedArt(design())).toEqual({ hero: true, stickers: 2 })
    expect(isFullyPainted(design())).toBe(false)
    expect(isFullyPainted(painted())).toBe(true)
  })

  it("keeps a plain-text copy for the campaign's history", () => {
    const text = designPlainText(design())
    expect(text).toContain("Your first comment takes a minute.")
    expect(text).toContain("Comment in your voice: Let Engage draft it.")
    expect(text).toContain("Open LinkedIn: https://www.linkedin.com/feed/")
  })
})

describe("keeping painted art as the email changes", () => {
  it("a first draft starts with nothing painted, whatever the model sent", () => {
    const next = carryArt(null, painted())
    expect(unpaintedArt(next)).toEqual({ hero: true, stickers: 2 })
    expect(next.hero.paintingUrl).toBeUndefined()
  })

  it("keeps the picture and stickers when only the words change", () => {
    const before = painted()
    const next = carryArt(before, { ...design(), subject: "A shorter subject" })
    expect(next.hero.imageUrl).toBe(art("h.jpg"))
    expect(isFullyPainted(next)).toBe(true)
  })

  it("a new headline keeps the painting but needs the headline set again", () => {
    const next = carryArt(painted(), design({ hero: { ...design().hero, accent: "takes a moment." } }))
    expect(next.hero.paintingUrl).toBe(art("p.jpg"))
    expect(next.hero.imageUrl).toBeUndefined()
  })

  it("a new scene needs a new painting; a changed sticker idea needs that sticker painted", () => {
    const changed = design()
    changed.hero = { ...changed.hero, scene: "an open tin of new pencils" }
    const features = changed.blocks[1] as Extract<EmailDesign["blocks"][number], { type: "features" }>
    features.items[1] = { ...features.items[1], sticker: { idea: "a paper airplane" } }
    const next = carryArt(painted(), changed)
    expect(next.hero.paintingUrl).toBeUndefined()
    expect(next.hero.imageUrl).toBeUndefined()
    expect(unpaintedArt(next)).toEqual({ hero: true, stickers: 1 })
  })
})

describe("art checks", () => {
  it("refuses pictures that aren't ours, and unpainted art when sending", () => {
    expect(artProblem(painted(), { painted: true })).toBeNull()
    expect(artProblem(design(), { painted: false })).toBeNull()
    expect(artProblem(design(), { painted: true })).toMatch(/Paint the picture/)
    const foreign = painted()
    foreign.hero = { ...foreign.hero, imageUrl: "https://elsewhere.example.com/x.jpg" }
    expect(artProblem(foreign, { painted: false })).toMatch(/isn't one of ours/)
  })
})

describe("rendering and personalizing", () => {
  it("shows its own picture, stickers, button and formatting in the email layout", async () => {
    const html = await renderDesignedEmail(painted())
    expect(html).toContain(`src="${art("h.jpg")}"`)
    expect(html).toContain(`src="${art("s0.png")}"`)
    expect(html).toContain('alt="Your first comment takes a minute."')
    expect(html).toContain('href="https://www.linkedin.com/feed/"')
    expect(html).toContain("<strong")
    expect(html).toContain('href="https://carouselabs.com/settings/billing"')
    expect(html).toContain("The CarouseLabs Team")
    expect(html).toContain("{{firstName}}")
  })

  it("a link to somewhere not allowed stays plain text", async () => {
    const html = await renderDesignedEmail(design({ blocks: [{ type: "text", text: "See [this](https://evil.example.com/x)." }] }))
    expect(html).not.toContain("evil.example.com/x\"")
    expect(html).toContain("[this](https://evil.example.com/x)")
  })

  it("the preview shows placeholders for art not painted yet", async () => {
    const html = await renderDesignedEmail(design(), { preview: true })
    expect(html).toContain("data:image/svg+xml;base64,")
  })

  it("fills each person's name in safely, and greets someone without an account as 'there'", () => {
    const html = "<p>Hi {{firstName}},</p>"
    const tricky = personalizeDesignedEmail(html, "For {{firstName}}", { firstName: '<img src=x onerror="alert(1)">' })
    expect(tricky.html).toContain("Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt;,")
    expect(tricky.html).not.toContain("<img")
    expect(tricky.subject).toBe('For <img src=x onerror="alert(1)">')
    expect(personalizeDesignedEmail(html, "Hi", undefined).html).toBe("<p>Hi there,</p>")
  })
})

describe("headline sizing", () => {
  const font = (name: string) => readFontMetrics(fs.readFileSync(path.join(process.cwd(), "assets/fonts", name)))
  const regular = font("Fraunces-Display-Regular.ttf")
  const italic = font("Fraunces-Display-Italic.ttf")

  it("reads real widths from the font", () => {
    expect(regular.unitsPerEm).toBeGreaterThan(0)
    expect(textWidth(regular, "WW", 100)).toBeGreaterThan(textWidth(regular, "ii", 100))
    expect(textWidth(regular, "Hello", 50) * 2).toBeCloseTo(textWidth(regular, "Hello", 100), 5)
  })

  it("picks the biggest size at which both lines fit, smaller for longer lines", () => {
    const short = fitSize([{ metrics: regular, text: "We've" }, { metrics: italic, text: "replied." }], { width: 560, max: 92, min: 56 })
    const long = fitSize(
      [{ metrics: regular, text: "Your first comment" }, { metrics: italic, text: "takes a minute." }],
      { width: 560, max: 92, min: 56 },
    )
    expect(short).toBe(92)
    expect(long).toBeLessThan(92)
    expect(textWidth(regular, "Your first comment", long)).toBeLessThanOrEqual(560)
  })
})

describe("cutting out a sticker", () => {
  it("removes the cream around the sticker but keeps cream inside its white border", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test")
    const sharp = (await import("sharp")).default
    const { cutOutSticker } = await import("@/lib/emailArt")
    // 200x200 cream; a round sticker: white border ring, violet inside, a cream patch in the middle.
    const W = 200
    const px = Buffer.alloc(W * W * 3)
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3
        const d = Math.hypot(x - 100, y - 100)
        const inBorder = d <= 60
        const inSticker = d <= 50
        const inPatch = Math.abs(x - 100) < 10 && Math.abs(y - 100) < 10
        const [r, g, b] = inPatch ? [254, 248, 234] : inSticker ? [120, 80, 200] : inBorder ? [255, 255, 255] : [254, 248, 234]
        px[i] = r
        px[i + 1] = g
        px[i + 2] = b
      }
    }
    const input = await sharp(px, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer()
    const out = await cutOutSticker(input)
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    expect(info.channels).toBe(4)
    const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]
    expect(info.width).toBe(112)
    // The corner of the sticker's box is outside the circle: cut away.
    expect(alpha(8, 8)).toBe(0)
    // The violet and the cream patch inside the border stay.
    expect(alpha(56, 30)).toBe(255)
    expect(alpha(56, 56)).toBe(255)
  })
})

describe("the writer", () => {
  const answer = (body: unknown, stop = "end_turn") => ({ content: [{ type: "text", text: typeof body === "string" ? body : JSON.stringify(body) }], stop_reason: stop })

  beforeEach(() => anthropic.create.mockReset())

  it("writes from the real product facts", () => {
    const facts = productFacts()
    expect(facts).toContain(`$${PRO_PLAN.price}`)
    expect(facts).toContain(EXTENSION_STORE_URL!)
    expect(facts).toContain("Caption Only = 5 credits")
  })

  it("returns the reply and the design, with nothing painted on a first draft", async () => {
    anthropic.create.mockResolvedValueOnce(answer({ reply: "Here's a draft. Picture: …", design: painted() }))
    const result = await writeEmail({ history: [], request: "Nudge quiet Engage users", current: null })
    expect(result.reply).toMatch(/Here's a draft/)
    expect(result.design.subject).toBe(design().subject)
    expect(isFullyPainted(result.design)).toBe(false)
    const call = anthropic.create.mock.calls[0][0]
    expect(call.model).toBe("claude-opus-5-5")
    expect(call.messages.at(-1).content).toBe("Nudge quiet Engage users")
  })

  it("on a revision, sends the current draft and what's painted, and keeps the painted art", async () => {
    anthropic.create.mockResolvedValueOnce(answer({ reply: "Shorter now.", design: { ...design(), subject: "Shorter" } }))
    const result = await writeEmail({ history: [{ role: "admin", text: "Nudge" }, { role: "writer", text: "Draft" }], request: "Shorter", current: painted() })
    const last = anthropic.create.mock.calls[0][0].messages.at(-1).content as string
    expect(last).toContain("Already painted: the picture and the stickers")
    expect(last).not.toContain(R2)
    expect(result.design.hero.imageUrl).toBe(art("h.jpg"))
  })

  it("asks once more when the answer breaks a rule, saying what was wrong", async () => {
    const bad = design({ blocks: [{ type: "button", label: "Go", href: "https://evil.example.com/" }] })
    anthropic.create.mockResolvedValueOnce(answer({ reply: "Draft", design: bad })).mockResolvedValueOnce(answer({ reply: "Fixed", design: design() }))
    const result = await writeEmail({ history: [], request: "Write it", current: null })
    expect(result.reply).toBe("Fixed")
    const retry = anthropic.create.mock.calls[1][0].messages.at(-1).content as string
    expect(retry).toMatch(/didn't follow the format/)
    expect(retry).toMatch(/Links can only go to/)
  })

  it("gives up with a clear message after two unusable answers", async () => {
    anthropic.create.mockResolvedValue(answer("Sorry, I can't do JSON today."))
    await expect(writeEmail({ history: [], request: "Write it", current: null })).rejects.toBeInstanceOf(EmailWriterError)
    expect(anthropic.create).toHaveBeenCalledTimes(2)
  })
})
