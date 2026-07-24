// lib/ai/prompts/ownIdeaImagePrompt.ts
// Stage 2 of the own-idea Image + Caption pipeline: turns the Stage 1
// Presentation Structure Decision + post content into a detailed AI image
// prompt. Own-idea only — trending ideas keep using lib/ai/prompts/imagePrompt.ts.

export function buildOwnIdeaImagePromptSystemMessage(): string {
  return `A reference image may be provided. It defines the VISUAL DESIGN SYSTEM for this image ONLY. Treat it as a visual style guide, never as content to recreate.

EXTRACT ONLY THESE FROM THE REFERENCE (with exact hex codes you observe):
- Illustration technique: name it precisely (watercolor and ink, flat vector, 3D render, photographic, paper collage, line art, gradient-mesh digital, editorial cartoon, etc.) — identify what you actually see, don't guess generically.
- Texture and finish: paper grain, brush bleed, flat clean edges, noise, glossy, matte — whatever is actually present.
- Color palette: list the 5-8 dominant hex codes you can identify from the reference and reuse ONLY these (plus logical tints/shades of them). Pay close attention to MULTIPLE SHADES of the same color family if present — if the reference has both a light and a darker version of a color, identify and use BOTH shades distinctly with separate hex codes. Do NOT simplify multiple shades into one, and do NOT substitute a lighter shade with white/cream just because it's light. Count and name EVERY distinct shade you observe, however subtle.
- Typography treatment: font weight, serif/sans-serif, headline highlight style, letter spacing, casing.
- Composition density: % text vs % illustration.
- Lighting style: warm/cool temperature, light source count, soft/hard shadows, glow effects.

DO NOT EXTRACT OR REUSE:
- The actual subject, characters, objects, or scene shown in the reference.
- Any text or words visible in the reference.
- The literal story the reference image tells.
- The reference image layout or information structure.

If no reference image is provided, invent a premium, original editorial color palette and design system from scratch that matches the content topic and niche, and state the exact hex codes you're inventing.

The image must look like it came from the same design system as the reference (when one is provided) — same technique, same palette, same typography treatment, same lighting logic — while depicting a 100% ORIGINAL scene built from THIS post's content.

A Presentation Structure Decision has also been provided. Unlike the reference image, which controls ONLY the visual appearance, the Presentation Structure Decision controls ONLY how the information should be organized inside the image. Treat it as the architectural blueprint for the design.

Follow the Presentation Structure Decision exactly. Do NOT redesign it. Do NOT simplify it. Do NOT replace it. Do NOT ignore any structural instruction.

The Presentation Structure Decision determines HOW the information is presented.
The Reference Image determines HOW the image visually looks.
The Deep Dive determines WHAT the image communicates.

These three systems are completely independent and must be combined together.

Never allow the visual style to override the Presentation Structure.
Never allow the Presentation Structure to override the extracted Visual Design System.

Generate a detailed AI image prompt for creating a single visual that explains and supports the post.

The visual prompt must:
- Clearly represent the post's core message.
- Strictly follow the supplied Presentation Structure Decision.
- Match premium social media content aesthetics.
- Be highly detailed and visually descriptive.
- Describe the complete composition from the Presentation Structure Decision: section arrangement, reading flow, information hierarchy, grouping, spacing, alignment, visual balance, focal points, typography placement, subject, lighting, mood, rendering style, colors, illustration style, visual hierarchy.
- Make the visual instantly understandable and scroll-stopping.
- Ensure the image visually communicates the hook, core message, and CTA clearly.
- If a reference is provided, reuse its EXACT palette (the exact hex codes identified above, including distinct shades) and exact illustration technique — but depict an ORIGINAL scene built from this post's content, not the reference's literal subject matter.

IMPORTANT: This is a SINGLE standalone image post, NOT a carousel. Do NOT include: Swipe, Swipe to see, Continue, Next slide, Slide indicators, Carousel cues, Right arrows, Multi-slide references.

CRITICAL IMAGE PROMPT REQUIREMENTS:
- Minimum 400 words.
- Include specific hex color codes for EVERY color mentioned.
- Explicitly describe the Presentation Structure Decision throughout the prompt.
- Describe foreground, midground, background, left, center, right.
- Describe section arrangement, reading flow, spacing, grouping, alignment, visual hierarchy.
- Describe typography (font style, weight, placement, hex color).
- Describe lighting (direction, intensity, color).
- Describe mood and aesthetic.
- Make it detailed enough for any AI image generator to execute precisely.

Return ONLY valid JSON, no markdown fences:
{
  "imagePrompt": string
}

FINAL CHECK before returning:
- The imagePrompt must describe an image about the given post's content.
- It must faithfully follow the supplied Presentation Structure Decision.
- It must preserve the extracted (or invented) Visual Design System.
- It must not recreate the reference image's literal content.
- It must generate a completely original scene.
- It must work as a SINGLE standalone image.
- If any of these conditions fail, rewrite the imagePrompt before returning the JSON.`
}

export function buildOwnIdeaImagePromptUserMessage(
  refinedHook: string,
  deepDive: string,
  caption: string,
  presentationStructure: string,
  sizeBlock: string,
  userInstructionBlock: string,
  nicheBlock: string,
): string {
  return `POST HEADING:
${refinedHook}

FULL DEEP DIVE CONTEXT:
${deepDive}

CAPTION (already finalized — use only as tone/content context, do not rewrite or return it):
${caption}

PRESENTATION STRUCTURE DECISION:
${presentationStructure}

${nicheBlock}

CRITICAL SIZE REQUIREMENT:
${sizeBlock}
STRICTLY follow this ratio. Non-negotiable.

${userInstructionBlock}

Generate the image prompt now following all instructions. Return ONLY the JSON object.`
}
