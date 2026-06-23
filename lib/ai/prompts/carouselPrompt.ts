function toStr(val: unknown): string {
  if (Array.isArray(val)) return val.join("\n")
  return String(val ?? "")
}

export function buildCarouselPrompt(
  refinedHook: string,
  deepDive: string,
  caption: string,
  size: string,
  hasReference: boolean,
  keyTalkingPoints: unknown,
  strongEndingLine: unknown,
  userInstruction?: string,
  niche?: string,
): string {
  const userInstructionBlock = userInstruction
    ? `\nUser's specific instruction for this regeneration: ${userInstruction}\n`
    : ""

  const nicheBlock = niche
    ? `USER NICHE / INDUSTRY: ${niche}\nGround every slide's scene, characters, and objects in this niche — not generic stock imagery.\n\n`
    : ""

  const sizeBlock =
    size === "1:1"
      ? `User selected 1:1 Square format.\nSquare 1:1 ratio (1080x1080px). ALL slides must be optimized for square format.`
      : `User selected 4:5 Portrait format.\nPortrait 4:5 ratio (1080x1350px). ALL slides must be optimized for portrait orientation.`

  const styleExtractionBlock = hasReference
    ? `A reference image has been provided. It defines the VISUAL STYLE for this entire carousel ONLY. Treat it as a style guide, never as content to recreate.

EXTRACT ONLY THESE FROM THE REFERENCE (with exact hex codes you observe):
- Illustration technique: name it precisely (watercolor and ink, flat vector, 3D render, photographic, paper collage, line art, gradient-mesh digital, editorial cartoon, etc.) — do not guess generically, identify what you actually see
- Texture and finish: paper grain, brush bleed, flat clean edges, noise, glossy, matte — whatever is actually present
- Color palette: list the 5-8 dominant hex codes you can identify from the reference and reuse ONLY these (plus logical tints/shades of them) across all slides. Pay close attention to MULTIPLE SHADES of the same color family if present — if the reference has both a light blue AND a darker/deeper blue, you must identify and use BOTH shades distinctly (e.g. light blue #93C5FD for backgrounds, dark blue #1E3A8A for accents/text). Do NOT simplify multiple shades into a single generic version, and do NOT substitute a lighter shade with white/cream just because it's light. Count and name EVERY distinct shade you observe, however subtle, each with a specific hex code that matches its lightness/darkness level as closely as possible
- Typography treatment: font weight, whether serif or sans-serif, how headlines are highlighted (marker swipe, color block, underline, none), letter spacing, casing
- Composition ratio: roughly what % of each slide is text vs illustration, and how that's arranged (top-heavy, centered, split)
- Lighting style: warm/cool temperature, single or multiple light sources, soft or hard shadows, any glow effects

DO NOT EXTRACT OR REUSE:
- The actual subject, characters, objects, or scene shown in the reference
- Any text or words visible in the reference
- The literal "story" the reference image tells

Every one of the 7-8 slides below must look like it came from the same design system as the reference — same technique, same palette, same type treatment, same lighting logic — while depicting 100% ORIGINAL scenes built from THIS post's content (topic: ${refinedHook}). If the reference is, say, a flat-vector illustration of a woman at a desk in teal and cream, your slides are flat-vector illustrations in teal and cream depicting whatever THIS post is actually about — never a woman at a desk.

`
    : `No reference image was provided. Invent ONE cohesive, premium illustration system for this entire carousel and apply it identically across all 7-8 slides:
- Pick a specific illustration technique appropriate to the niche (modern flat illustration, editorial watercolor, clean line art, etc.) and name it explicitly
- Define a tight palette of 5-6 hex codes (1 background, 1-2 accent/highlight, 2-3 supporting tones) and reuse only those
- Define one typography system (font weight, highlight treatment, placement rules) and reuse it on every slide
- Define one lighting logic (warm/cool, single source) and reuse it on every slide
State these choices explicitly at the top of the FIRST slide's prompt so they read as a deliberate system, not an accident.

`

  const talkingPointsList = Array.isArray(keyTalkingPoints)
    ? keyTalkingPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")
    : String(keyTalkingPoints)
  const endingStr = toStr(strongEndingLine)

  const slidePromptStructureBlock = `EVERY SLIDE'S "prompt" FIELD MUST BE WRITTEN AS ONE SINGLE-LINE STRING (no raw line breaks — JSON requires this) BUT INTERNALLY STRUCTURED AS THESE LABELED SEGMENTS, SEPARATED BY " || " IN THIS EXACT ORDER:

STYLE: || [the extracted or invented technique, texture, finish — 1-2 sentences, specific not vague]

CANVAS: || [exact ratio from sizeBlock, % of canvas for typography vs illustration]

BACKGROUND: || [base color with hex code, texture/grain description]

TYPOGRAPHY: || [font weight/style; the EXACT headline text for this slide; placement as top X% of canvas; which specific word(s) get a highlight treatment and the exact hex code of that highlight; subtitle text if relevant with hex code]

MAIN ILLUSTRATION: || [the most detailed segment — describe a complete original scene illustrating THIS slide's specific talking point, covering ALL of: (a) CHARACTERS & SETTING — who is in the scene (age, features, key clothing with hex codes, posture, expression, what they're doing) and where it takes place (location, time of day, key background elements and props visible); (b) LIGHTING — primary light source color+hex+direction, secondary source if any, which areas/characters each one hits; (c) KEY OBJECTS & DETAILS — the meaningful objects with their placement and hex colors, plus 2-3 small details a viewer would notice on a second look that reinforce the message; (d) CORE VISUAL MOMENT — the exact split-second being captured, the tension or contrast in it, and what a viewer understands in under 3 seconds before reading any text]

VISUAL HIERARCHY: || [numbered list describing the exact order the eye travels: 1st, 2nd, 3rd, 4th element]

COLOR PALETTE: || [every color used in this slide listed as Name: #HEXCODE, comma separated — background, headline, highlight, every character's skin and clothing, every prop, every light source]

MOOD: || [2-3 sentences naming the EXACT emotional target — never generic words like "powerful" or "emotional," describe specifically what the viewer should feel and why]

This structure is NON-NEGOTIABLE for every slide. Do not collapse it into vague prose — each labeled segment must actually contain the level of detail described.`

  return `${styleExtractionBlock}${nicheBlock}Here is the LinkedIn heading of my posting:
${refinedHook}

Here is the full deep dive context:
${deepDive}

Here is the LinkedIn caption:
${caption}

Here are the key talking points from the breakdown:
${talkingPointsList}

Here is the strong ending line:
${endingStr}

NOW generate 7-8 carousel slides where:
- Slide 1 (HOOK) is based on: ${refinedHook}
- Slides 2-6 (BODY) each cover ONE specific point from the key talking points above — use the ACTUAL content, not generic placeholders
- Final slide (CTA) uses: ${endingStr} as the saveable takeaway

IMPORTANT: Each slide prompt must be directly about the content above. Do NOT create generic slides. Every slide must reference the actual topic, facts, and insights from the breakdown above.

Each slide's "prompt" string must be minimum 150 words once all labeled segments are combined, with exact hex color codes for every color mentioned.

CRITICAL SLIDE ROLE ENGINEERING:

Slide 1 — THE HOOK SLIDE (stop-scroll):
- Single most important slide for engagement; engineered to stop the scroll
- Bold, scroll-stopping headline with maximum visual contrast, minimal supporting text
- High-contrast typography, oversized hook line, strong color block
- Must communicate the post's core promise in under 2 seconds of viewing
- The MAIN ILLUSTRATION here should be the single most visually striking scene in the whole carousel — no competing decoration

Slides 2 to N-1 — THE BODY SLIDES:
- Each body slide covers exactly ONE talking point from the list above, using the actual words/concepts from the breakdown, not paraphrased generics
- Strong visual hierarchy: headline + supporting illustration + minimal body copy
- Maintain the identical palette, typography system, and lighting logic across all body slides — only the scene changes
- Each slide's CORE VISUAL MOMENT should leave a small open thread that makes the viewer want to swipe to the next slide

Final Slide — THE CTA SLIDE:
- Must use "${endingStr}" as the saveable takeaway line in the TYPOGRAPHY segment
- MAIN ILLUSTRATION should depict a resolution/payoff scene — visually distinct energy from the body slides (calmer, warmer, or an inverted color block) while staying in the same style system
- Must contain a strong, clear CTA encouraging comments, saves, shares, or profile visits, written into the TYPOGRAPHY segment
- The CTA must feel earned by the value delivered in the body slides — not generic
Do NOT include any social media handles, usernames, or @ mentions anywhere in the slide.

${slidePromptStructureBlock}

CRITICAL VISUAL REQUIREMENT:
Each slide must contain ACTUAL VISUAL IMAGERY in the MAIN ILLUSTRATION segment — never describe a slide as just "text on a background." A viewer must be able to understand that specific slide's message from the illustration alone, before reading any text.

CRITICAL SIZE REQUIREMENT:
${sizeBlock}
STRICTLY follow this ratio across all slides.
${userInstructionBlock}

Rules:
- Caption and visuals must feel connected
- All slides must share the identical style, palette, typography, and lighting logic established above — only scenes change
- Avoid generic or cluttered slides
- Every slide must feel premium, modern, viral-ready

CRITICAL JSON ESCAPING: any double-quote character that appears WITHIN a string value (e.g. quoting a phrase like "AI doesn't work for us", denoting inches like 5", or hex codes in parentheses) MUST be properly escaped as \" — this is mandatory for valid JSON output. Do NOT include raw line breaks inside any string value — within the "prompt" field, use " || " as the section separator exactly as instructed above, never an actual newline. Double-check escaping before outputting.

Return ONLY valid JSON, no markdown:
{
  "caption": string,
  "slides": [
    {
      "slideNumber": number,
      "role": "hook" | "body" | "cta",
      "headline": string,
      "prompt": string
    }
  ]
}`
}
