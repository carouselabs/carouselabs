// app/(marketing)/thumbnails/best-cross-link.ts
// Topical slug -> /thumbnails slug mappings used to cross-link /best ranking
// pages to genuinely related /thumbnails pages. Only pages that actually
// discuss reference-image-driven visual generation get an entry — most /best
// slugs are LinkedIn caption/scheduling/branding rankings with no real
// connection to YouTube thumbnails, and intentionally have no mapping here
// (same light-touch approach as app/(marketing)/answers/cross-link.ts).

export const BEST_TO_THUMBNAIL_SLUGS: Record<string, string[]> = {
  "best-ai-image-generators-for-social-media": [
    "ai-youtube-thumbnail-generator-from-reference",
    "ai-thumbnail-generator-vs-canva",
  ],
  "best-carousel-tools-with-brand-kit": ["clone-youtube-thumbnail-style-ai"],
}
