// app/(marketing)/best/generators-cross-link.ts
// Reverse of the CATEGORY_TO_BEST_SLUG map in
// app/(marketing)/generators/[slug]/page.tsx — surfaces 1-2 genuinely
// relevant /generators tools on the /best ranking page that generators of
// that category already point to, so the link is reciprocal instead of
// one-directional. Only the categories with a clean best-slug match get an
// entry; the rest intentionally render no cross-link (same light-touch
// approach as app/(marketing)/answers/cross-link.ts).

export const BEST_TO_GENERATOR_SLUGS: Record<string, string[]> = {
  "best-ai-tools-for-linkedin-carousels": ["linkedin-carousel-maker", "ai-carousel-generator"],
  "best-ai-caption-generators": ["ai-caption-generator", "linkedin-caption-generator"],
  "best-ai-image-generators-for-social-media": ["ai-image-generator-for-linkedin", "linkedin-post-image-generator"],
  "best-linkedin-content-tools-2026": ["linkedin-post-ideas-generator", "ai-content-idea-generator"],
  "best-free-linkedin-carousel-tools": ["free-linkedin-carousel-maker", "free-ai-caption-generator"],
  "best-linkedin-carousel-generators": ["linkedin-carousel-template", "carousel-slide-generator"],
}
