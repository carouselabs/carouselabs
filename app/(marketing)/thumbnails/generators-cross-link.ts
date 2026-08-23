// app/(marketing)/thumbnails/generators-cross-link.ts
// Topical slug -> /thumbnails slug mappings used to cross-link /generators
// pages to genuinely related /thumbnails pages. The real connection is
// mechanism, not platform: the Image-category /generators pages are all
// built around "upload a reference image, CarouseLabs matches its style" —
// the exact same idea the Thumbnail tool applies to YouTube specifically.
// Only pages with that genuine match get an entry — the Carousel, Caption,
// Ideas, Free, and Format categories don't share the mechanism and
// intentionally have no mapping here (same light-touch approach as
// app/(marketing)/answers/cross-link.ts).

export const GENERATOR_TO_THUMBNAIL_SLUGS: Record<string, string[]> = {
  "ai-image-generator-for-linkedin": ["ai-youtube-thumbnail-generator-from-reference"],
  "linkedin-post-image-generator": ["ai-youtube-thumbnail-generator-from-reference"],
  "social-media-image-generator": [
    "ai-youtube-thumbnail-generator-from-reference",
    "ai-thumbnail-generator-for-youtube-2026",
  ],
  "instagram-post-generator": ["clone-youtube-thumbnail-style-ai"],
  "linkedin-infographic-generator": ["best-youtube-thumbnail-size-1280x720"],
}
