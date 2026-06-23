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
    ? `USER NICHE / INDUSTRY: ${niche}\nGround every slide's content and imagery in this niche.\n\n`
    : ""

  const sizeBlock =
    size === "1:1"
      ? `User selected 1:1 Square format.\nSquare 1:1 ratio (1080x1080px). ALL slides must be optimized for square format.`
      : `User selected 4:5 Portrait format.\nPortrait 4:5 ratio (1080x1350px). ALL slides must be optimized for portrait orientation.`

  const referenceLeadBlock = hasReference
    ? `⚠️ CRITICAL REFERENCE IMAGE INSTRUCTION:
The attached image is a STYLE REFERENCE ONLY — treat it as a mood board, NOT a template.
DO NOT recreate this image. DO NOT copy its subjects, people, scene, objects, composition, or content.

From the reference, capture ONLY broad stylistic qualities, described in GENERAL terms:
- Overall mood/tone (e.g. 'warm and editorial', 'bold and modern', 'minimalist and clean')
- General color family (e.g. 'warm earth tones', 'cool blues and purples') — choose NEW hex codes that sit within this family; do NOT copy the reference's exact palette or exact color placement
- General illustration approach (e.g. 'flat design', 'photographic', 'hand-drawn / watercolor') — NOT exact character poses or exact scene composition
- Typography feel (e.g. 'bold sans-serif headlines') — NOT exact font matching

DO NOT describe, for ANY slide:
- Specific character poses, positions, or actions taken from the reference
- Specific objects or scene elements and their exact placement from the reference
- Specific text layout positions copied from the reference

Apply this general design language CONSISTENTLY across ALL slides so the carousel reads as one cohesive set from the same 'brand style' / 'design system' as the reference — but every slide must be a COMPLETELY DIFFERENT, ORIGINAL composition built around the actual post content (refinedHook, deepDive, talking points). Think 'same design language, totally different scenes' — never 'recreate the reference with new text'.

`
    : `No reference image was provided. Use a clean, modern social media carousel aesthetic — consistent background, typography, color palette, and highlight treatment across all slides so they look like one cohesive set.

`

  // The hook slide is the most visually important and the most prone to copying
  // the reference too literally — only warn about it when a reference exists.
  const hookReferenceWarning = hasReference
    ? `

⚠️ EXTRA WARNING FOR THE HOOK SLIDE (Slide 1): This is the slide most likely to accidentally recreate the reference image too closely, because it's the most visually important slide. You MUST treat the reference image as nothing more than a mood board for color palette and illustration style. The hook slide's actual visual content (people, objects, scene, composition, pose) must be 100% original and built from the breakdown's refinedHook and deepDive — NOT from the reference image's scene. If you find yourself describing a scene similar to the reference image, STOP and rewrite it to depict the content's actual topic instead.`
    : ""

  const talkingPointsList = Array.isArray(keyTalkingPoints)
    ? keyTalkingPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")
    : String(keyTalkingPoints)
  const endingStr = toStr(strongEndingLine)

  return `${referenceLeadBlock}${nicheBlock}Here is the LinkedIn heading of my posting:
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

Each slide prompt must be minimum 200 words with exact hex color codes for every color.

CRITICAL SLIDE ROLE ENGINEERING:

Slide 1 — THE HOOK SLIDE (stop-scroll):
- Single most important slide for engagement; engineered to stop the scroll
- Must use a bold, scroll-stopping hook with maximum visual contrast
- Minimal text — one short headline, no body copy
- High-contrast typography, oversized hook line, strong color block
- Must communicate the post's core promise in under 2 seconds of viewing
- No icons, no decorations that compete with the hook — maximize impact${hookReferenceWarning}

Slides 2 to N-1 — THE BODY SLIDES:
- Carry the value: each body slide covers exactly ONE talking point from the list above
- Use the ACTUAL words, concepts, and specifics from the breakdown — not paraphrased generics
- Strong visual hierarchy: headline + supporting visual + minimal body copy
- Maintain consistent grid, palette, and typography across all body slides
- Each slide must end in a way that pulls the user to swipe to the next one

Final Slide — THE CTA SLIDE:
- Engineered specifically as the call-to-action slide
- Must use "${endingStr}" as the saveable takeaway line
- Must contain a strong, clear CTA encouraging comments, saves, shares, or profile visits
- Visually distinct from body slides (inverted color block or accent shape)
- CTA must feel earned by the value delivered in the body slides — not generic

The CTA slide should focus on:
- A strong call to action (comment, save, share)
- A saveable one-line takeaway quote
- An engagement question
Do NOT include any social media handles, usernames, or @ mentions anywhere in the slide.

Each slide prompt must include:
- Slide objective/message (tied to the specific content above)
- Headline/text for the slide
- Slide role (hook / body / cta) — explicitly labeled
- Visual composition
- Design direction
- Subject placement
- Typography style
- Colors and mood (with exact hex codes)
- Visual storytelling flow
- Icon/graphic suggestions
- Transition logic between slides

CRITICAL VISUAL REQUIREMENT:
Each slide must contain ACTUAL VISUAL IMAGERY — not just text on a background.

Every slide prompt must describe:
1. A MAIN VISUAL SCENE or ILLUSTRATION that takes up 40-60% of the slide space — this could be:
   - An illustrated character, person, or scene relevant to the slide content
   - A detailed environment or setting that represents the concept
   - A visual metaphor brought to life as an actual scene/illustration
   - Abstract but visually rich artwork that represents the idea

2. The illustration style must match the reference image — if reference shows watercolor illustration style, describe watercolor illustrated characters and scenes. If reference shows photographic style, describe photographic scenes. If reference shows flat design illustrations, describe flat design characters.

3. Text overlays on top of or beside the visual scene — the text does not float on a plain background.

4. The visual scene must TELL THE STORY of that specific slide's content visually — a viewer should understand the slide message from the image alone, even without reading the text.

EXAMPLE — Instead of:
'Background is cream #F5F3EE with the headline text centered'

Write:
'A detailed watercolor illustration of a founder sitting at a laptop, looking concerned, while giant platform logos loom in the background above them like shadowy giants. The illustration uses warm amber and navy tones matching the reference style. The headline text overlays the upper portion of this scene in bold black typography with yellow highlight accents.'

CRITICAL SLIDE PROMPT REQUIREMENTS:
- Each individual slide prompt must be minimum 200 words
- Be extremely detailed and descriptive for each slide
- Include exact hex color codes for EVERY color mentioned (e.g. deep purple #7C3AED, off-white #F0F0FA)
- Describe the exact composition — what elements are in foreground, background, left side, right side, center
- Describe typography in detail — font weight (bold/light/medium), size, color with hex code, exact placement on slide
- Describe lighting and shadows
- Describe every visual element, icon, shape, line, graphic
- Describe the mood and energy of the slide
- Make each prompt detailed enough that any AI image generator can create the perfect slide

CRITICAL SIZE REQUIREMENT:
${sizeBlock}
STRICTLY follow this ratio across all slides.
${userInstructionBlock}

Rules:
- Caption and visuals must feel connected
- All slides must share consistent grid, palette, typography
- Avoid generic or cluttered slides
- Every slide must feel premium, modern, viral-ready

CRITICAL JSON ESCAPING: any double-quote character that appears WITHIN a string value (e.g. quoting a phrase like "AI doesn't work for us", denoting inches like 5", or hex codes in parentheses) MUST be properly escaped as \" — this is mandatory for valid JSON output. Do NOT include raw line breaks inside a string value; keep each value on a single logical line. Double-check escaping before outputting.

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
