// lib/adminCreations.ts
// Shared shape of /admin/posts' feed (app/api/admin/posts): everything users
// make, from both sources — website posts (Post: carousels, images,
// thumbnails, captions, custom posts) and the LinkedIn extension's
// generations (CommentHistory). Types and labels only, so the client gallery
// can import it too.

export type AdminCreation = {
  source: "post" | "extension"
  id: string
  userId: string
  email: string
  // A PostFormat for posts, a CommentHistory kind for the extension.
  type: string
  typeLabel: string
  title: string
  // The caption, the extension's generated text, or a thumbnail's brief.
  text: string | null
  // Extension only: the LinkedIn post or thread it was written for.
  context: string | null
  images: string[]
  status: string | null
  // Extension only: the tone/profile it used.
  profileName: string | null
  // Extension only: the LinkedIn post it was written for.
  linkUrl: string | null
  credits: number | null
  createdAt: string
}

// Where each source's feed stopped: the last item of that source already
// sent, as (createdAt, id). A source none of whose items were sent yet keeps
// null, so the next page starts it from the top.
export type AdminCreationsCursor = {
  pa: string | null
  pi: string | null
  ea: string | null
  ei: string | null
}

export type AdminCreationsResponse = {
  // Only on the first page (no cursor): the count matching the filters.
  total: number | null
  items: AdminCreation[]
  next: AdminCreationsCursor | null
}

export const POST_FORMAT_LABELS: Record<string, string> = {
  CAROUSEL: "Carousel",
  SINGLE_IMAGE: "Image",
  THUMBNAIL: "Thumbnail",
  TEXT_ONLY: "Caption",
  CUSTOM: "Custom post",
}

export const EXTENSION_KIND_LABELS: Record<string, string> = {
  comment: "Comment",
  reply: "Reply",
  connection_note: "Connection note",
  message: "Message",
}

// The type filter's values: a PostFormat, "EXTENSION" for every extension
// kind, or "ext:<kind>" for one of them.
export const EXTENSION_FILTER = "EXTENSION"
export const EXTENSION_KIND_PREFIX = "ext:"
