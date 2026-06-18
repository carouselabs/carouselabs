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

  return `⚠️ CRITICAL REFERENCE IMAGE INSTRUCTION:
The image attached is a STYLE REFERENCE ONLY.
DO NOT recreate this image.
DO NOT copy the subjects, people, scene, or content of this image.

When using the reference image for style, describe ONLY broad stylistic qualities in general terms:
- Overall mood/tone (e.g. 'warm and editorial', 'bold and modern', 'minimalist and clean')
- General color family (e.g. 'warm earth tones', 'cool blues and purples') — NOT exact hex codes or exact color placement
- General illustration approach (e.g. 'flat design', 'photographic', 'hand-drawn style') — NOT exact character poses or exact scene composition
- Typography feel (e.g. 'bold sans-serif headlines') — NOT exact font matching

DO NOT describe:
- Specific character poses, positions, or actions from the reference
- Specific objects or scene elements and their exact placement
- Specific text layout positions

The new image should feel like it's from the same 'brand style' or 'design system' as the reference, but be a COMPLETELY DIFFERENT composition built around the actual caption content provided (refinedHook, deepDive, caption). Think of it as 'same design language, totally different scene' rather than 'recreate this image with new text'.

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
- If a reference is provided, capture only its general design language (broad mood, general color family, illustration approach, typography feel) — do NOT copy its exact colors, composition, layout, scene, or content
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
- Include specific hex color codes for EVERY color in the NEW design (choose colors that sit within the reference's general color family, but do NOT copy the reference's exact palette or color placement)
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
