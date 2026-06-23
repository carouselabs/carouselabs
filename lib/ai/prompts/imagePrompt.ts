export function buildImagePrompt(
  refinedHook: string,
  deepDive: string,
  caption: string,
  size: string,
  userInstruction?: string,
  niche?: string,
): string {
  const userInstructionBlock = userInstruction
    ? `\nUser's specific instruction for this regeneration: ${userInstruction}\n`
    : ""

  const nicheBlock = niche
    ? `\nUSER NICHE / INDUSTRY: ${niche}\nGround the visual, subject matter, and any on-image copy in this niche.\n`
    : ""

  const sizeBlock =
    size === "1:1"
      ? `User selected 1:1 Square format.\nSquare 1:1 ratio (1080x1080px). Optimize ALL composition for perfect square. Balance elements symmetrically.`
      : `User selected 4:5 Portrait format.\nPortrait 4:5 ratio (1080x1350px). Optimize ALL composition for tall portrait. Keep key elements centered. Text placement must work in portrait orientation.`

  return `A reference image has been provided. It defines the VISUAL STYLE for this image ONLY. Treat it as a style guide, never as content to recreate.

EXTRACT ONLY THESE FROM THE REFERENCE (with exact hex codes you observe):
- Illustration technique: name it precisely (watercolor and ink, flat vector, 3D render, photographic, paper collage, line art, gradient-mesh digital, editorial cartoon, etc.) — identify what you actually see, don't guess generically
- Texture and finish: paper grain, brush bleed, flat clean edges, noise, glossy, matte — whatever is actually present
- Color palette: list the 5-8 dominant hex codes you can identify from the reference and reuse ONLY these (plus logical tints/shades of them). Pay close attention to MULTIPLE SHADES of the same color family if present — if the reference has both a light and a darker version of a color, identify and use BOTH shades distinctly with separate hex codes. Do NOT simplify multiple shades into one, and do NOT substitute a lighter shade with white/cream just because it's light. Count and name EVERY distinct shade you observe, however subtle.
- Typography treatment: font weight, serif/sans-serif, headline highlight style, letter spacing, casing
- Composition ratio: % text vs % illustration, arrangement
- Lighting style: warm/cool temperature, light source count, soft/hard shadows, glow effects

DO NOT EXTRACT OR REUSE:
- The actual subject, characters, objects, or scene shown in the reference
- Any text or words visible in the reference
- The literal 'story' the reference image tells

The image must look like it came from the same design system as the reference — same technique, same palette, same type treatment, same lighting logic — while depicting a 100% ORIGINAL scene built from THIS post's content (topic: ${refinedHook}). If the reference is, say, a flat-vector illustration of a woman at a desk in teal and cream, your image is a flat-vector illustration in teal and cream depicting whatever THIS post is actually about — never a woman at a desk.

The image prompt you generate must be about this LinkedIn post:

POST HEADING: ${refinedHook}

FULL DEEP DIVE CONTEXT:
${deepDive}

CAPTION:
${caption}

---

Here is the LinkedIn heading:
${refinedHook}

Here is the LinkedIn detailed breakdown:
${deepDive}

Here is the LinkedIn caption:
${caption}

${nicheBlock}Using the selected LinkedIn post idea, detailed post breakdown, user niche, tone, audience, writing style, and any uploaded references, generate content based on the user's selected output type.

Generate:
1. A high-performing caption optimized for social media engagement across platforms (LinkedIn, Instagram, Twitter/X)
2. A detailed AI image prompt for creating a single visual that explains/supports the post

The visual prompt must:
- Clearly represent the post's core message
- Match viral social media content aesthetics across platforms (LinkedIn, Instagram, Twitter/X)
- Be highly detailed and visually descriptive
- Include composition, subject, lighting, mood, style, colors, typography placement, and visual hierarchy
- Make the visual instantly understandable and scroll-stopping
- Ensure the image visually communicates the hook, core message, and CTA clearly
- If a reference is provided, reuse its EXACT palette (the exact hex codes identified above, including distinct shades) and exact illustration technique — but depict an ORIGINAL scene built from this post's content, not the reference's literal subject matter
- Adapt the design direction according to the uploaded reference and user requirements
- Be optimized for high CTR and stopping scroll across social media platforms (LinkedIn, Instagram, Twitter/X)
- Feel modern, premium, clean, and attention-grabbing
- Explain the idea visually in one image

IMPORTANT: This is a SINGLE standalone image post, NOT a carousel slide.
Do NOT include any 'swipe' text, 'swipe to see', next slide teasers, or any text suggesting there are more slides.
This image must work as a complete, standalone visual on its own.
No arrows pointing right, no 'next' indicators, no swipe prompts.

CRITICAL IMAGE PROMPT REQUIREMENTS:
- Minimum 400 words
- Include specific hex color codes for EVERY color — reuse the reference's EXACT hex codes identified above, not approximations, including any distinct shades within the same color family
- Describe composition in detail (foreground, background, left, right, center)
- Describe lighting (direction, intensity, color)
- Describe typography (font style, weight, placement, hex color)
- Describe mood and aesthetic
- Make it detailed enough for any AI image generator

CRITICAL SIZE REQUIREMENT:
${sizeBlock}
STRICTLY follow this ratio. Non-negotiable.
${userInstructionBlock}

Return ONLY valid JSON, no markdown:
{
  "caption": string,
  "imagePrompt": string (FINAL CHECK: Your imagePrompt must describe an image about '${refinedHook}' topic. If your prompt looks like it would recreate the reference image instead of being about this topic, rewrite it completely.)
}`
}
