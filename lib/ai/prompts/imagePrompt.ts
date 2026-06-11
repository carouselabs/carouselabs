export function buildImagePrompt(
  refinedHook: string,
  deepDive: string,
  caption: string,
  size: string,
  userInstruction?: string,
): string {
  const userInstructionBlock = userInstruction
    ? `\nUser's specific instruction for this regeneration: ${userInstruction}\n`
    : ""

  const sizeBlock =
    size === "1:1"
      ? `User selected 1:1 Square format.\nSquare 1:1 ratio (1080x1080px). Optimize ALL composition for perfect square. Balance elements symmetrically.`
      : `User selected 4:5 Portrait format.\nPortrait 4:5 ratio (1080x1350px). Optimize ALL composition for tall portrait. Keep key elements centered. Text placement must work in portrait orientation.`

  return `⚠️ CRITICAL REFERENCE IMAGE INSTRUCTION:
The image attached is a STYLE REFERENCE ONLY.
DO NOT recreate this image.
DO NOT copy the subjects, people, scene, or content of this image.
ONLY extract these style elements:
- Color palette (extract hex codes)
- Typography style (font type, weight, size hierarchy)
- Overall mood and aesthetic
- Lighting style
- Composition approach
- Visual texture and rendering style

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

Using the selected LinkedIn post idea, detailed post breakdown, user niche, tone, audience, writing style, and any uploaded references, generate content based on the user's selected output type.

Generate:
1. A high-performing LinkedIn caption optimized for engagement
2. A detailed AI image prompt for creating a single visual that explains/supports the post

The visual prompt must:
- Clearly represent the post's core message
- Match LinkedIn viral content aesthetics
- Be highly detailed and visually descriptive
- Include composition, subject, lighting, mood, style, colors, typography placement, and visual hierarchy
- Make the visual instantly understandable and scroll-stopping
- Ensure the image visually communicates the hook, core message, and CTA clearly
- Match the user's uploaded visual template, screenshot, inspiration image, or design style if provided (extract STYLE ONLY — color palette, typography, mood, aesthetic — do NOT copy image content)
- Adapt the design direction according to the uploaded reference and user requirements
- Be optimized for high CTR and stopping scroll on LinkedIn
- Feel modern, premium, clean, and attention-grabbing
- Explain the idea visually in one image

IMPORTANT: This is a SINGLE standalone image post, NOT a carousel slide.
Do NOT include any 'swipe' text, 'swipe to see', next slide teasers, or any text suggesting there are more slides.
This image must work as a complete, standalone visual on its own.
No arrows pointing right, no 'next' indicators, no swipe prompts.

CRITICAL IMAGE PROMPT REQUIREMENTS:
- Minimum 400 words
- Include exact hex color codes for EVERY color
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
