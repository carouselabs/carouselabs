// lib/styleLooks.ts
// The 48 ready-made looks people can pick after "Skip, generate without
// reference" (Image + Caption and Carousel). Each look's sample picture is sent
// exactly like an uploaded style reference (lib/lookReference.ts), so it sets
// the colors, type and illustration style while the post's own content and
// structure stay theirs. The pictures live in public/images/looks: a reference
// copy (819x1024 JPEG, the size the upload compressor makes) and a thumbnail.

export const LOOK_CATEGORIES = [
  "Minimal",
  "Bold",
  "Dark & Tech",
  "Playful",
  "Illustrated",
  "Photo",
  "Retro & Print",
  "Premium",
] as const

export type LookCategory = (typeof LOOK_CATEGORIES)[number]

export interface StyleLook {
  id: string
  name: string
  category: LookCategory
}

export const STYLE_LOOKS: readonly StyleLook[] = [
  { id: "clean-editorial", name: "Clean Editorial", category: "Minimal" },
  { id: "bold-poster", name: "Bold Poster", category: "Bold" },
  { id: "dark-premium", name: "Dark Premium", category: "Dark & Tech" },
  { id: "soft-3d", name: "Soft 3D", category: "Playful" },
  { id: "whiteboard", name: "Hand-drawn Whiteboard", category: "Illustrated" },
  { id: "corporate-flat", name: "Corporate Flat", category: "Minimal" },
  { id: "retro-print", name: "Retro Print", category: "Retro & Print" },
  { id: "neo-brutalist", name: "Neo-Brutalist", category: "Bold" },
  { id: "gradient-tech", name: "Gradient Tech", category: "Dark & Tech" },
  { id: "notebook-minimal", name: "Notebook Minimal", category: "Minimal" },
  { id: "paper-collage", name: "Paper Collage", category: "Retro & Print" },
  { id: "isometric", name: "Isometric", category: "Illustrated" },
  { id: "pastel-pop", name: "Pastel Pop", category: "Playful" },
  { id: "blueprint", name: "Blueprint", category: "Dark & Tech" },
  { id: "luxury-gold", name: "Luxury Gold", category: "Premium" },
  { id: "photo-bold-text", name: "Photo + Bold Text", category: "Photo" },
  { id: "swiss-grid", name: "Swiss Grid", category: "Minimal" },
  { id: "newspaper", name: "Newspaper", category: "Retro & Print" },
  { id: "big-number", name: "Big Number Stat", category: "Minimal" },
  { id: "quote-card", name: "Quote Card", category: "Minimal" },
  { id: "magazine-cover", name: "Magazine Cover", category: "Photo" },
  { id: "watercolor", name: "Watercolor", category: "Illustrated" },
  { id: "ink-brush", name: "Ink Brush", category: "Illustrated" },
  { id: "line-art", name: "Line Art", category: "Illustrated" },
  { id: "comic-book", name: "Comic Book", category: "Playful" },
  { id: "pixel-art", name: "Pixel Art", category: "Playful" },
  { id: "flat-characters", name: "Flat Characters", category: "Illustrated" },
  { id: "chalkboard", name: "Chalkboard", category: "Illustrated" },
  { id: "terminal-code", name: "Terminal / Code", category: "Dark & Tech" },
  { id: "neon-sign", name: "Neon Sign", category: "Dark & Tech" },
  { id: "synthwave", name: "Synthwave", category: "Dark & Tech" },
  { id: "sticky-notes", name: "Sticky Notes", category: "Playful" },
  { id: "y2k-chrome", name: "Y2K Chrome", category: "Playful" },
  { id: "bauhaus", name: "Bauhaus", category: "Bold" },
  { id: "risograph", name: "Risograph", category: "Retro & Print" },
  { id: "sticker-pack", name: "Sticker Pack", category: "Playful" },
  { id: "botanical-earthy", name: "Botanical Earthy", category: "Premium" },
  { id: "marble-elegant", name: "Marble Elegant", category: "Premium" },
  { id: "japanese-minimal", name: "Japanese Minimal", category: "Minimal" },
  { id: "scandinavian-soft", name: "Scandinavian Soft", category: "Minimal" },
  { id: "data-dashboard", name: "Data Dashboard", category: "Dark & Tech" },
  { id: "duotone-photo", name: "Duotone Photo", category: "Photo" },
  { id: "movie-poster", name: "Movie Poster", category: "Photo" },
  { id: "device-mockup", name: "Device Mockup", category: "Photo" },
  { id: "hand-lettering", name: "Hand Lettering", category: "Illustrated" },
  { id: "paper-fold", name: "Paper Fold", category: "Retro & Print" },
  { id: "kraft-stamp", name: "Kraft & Stamp", category: "Retro & Print" },
  { id: "one-color-bold", name: "One-Color Bold", category: "Bold" },
]

export function lookById(id: string | null | undefined): StyleLook | null {
  return STYLE_LOOKS.find((l) => l.id === id) ?? null
}

/** The picture sent as the style reference. */
export const lookImagePath = (id: string) => `/images/looks/${id}.jpg`

/** The small picture shown in the picker. */
export const lookThumbPath = (id: string) => `/images/looks/thumbs/${id}.jpg`
