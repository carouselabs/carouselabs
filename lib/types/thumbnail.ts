// lib/types/thumbnail.ts
// Shared blueprint shape for the Thumbnail feature (app/api/thumbnail/chat,
// app/api/thumbnail/generate, app/(app)/thumbnail/_client.tsx). Split into a
// precise structural read of the REFERENCE image (referenceComposition) and
// the user-specific content that fills that fixed structure (adaptedContent)
// — the generation route treats referenceComposition as the primary visual
// constraint and only swaps in adaptedContent, rather than redesigning the
// thumbnail from scratch.

export interface ThumbnailMainTextRegion {
  position: string
  size: string
  color: string
}

export interface ThumbnailSecondaryTextRegion {
  position: string | null
  size: string | null
  color: string | null
}

export interface ThumbnailReferenceComposition {
  subjectCount: number
  subjectPosition: string
  subjectScale: string
  background: string
  mainText: ThumbnailMainTextRegion
  secondaryText: ThumbnailSecondaryTextRegion | null
  additionalObjects: string
  compositionRule: string
}

export interface ThumbnailAdaptedContent {
  mainSubjectDescription: string
  mainHeadlineText: string
  secondaryText: string | null
  emotion: string
}

export interface ThumbnailBlueprint {
  referenceComposition: ThumbnailReferenceComposition
  adaptedContent: ThumbnailAdaptedContent
  // Free-form guidance from the chat's final "anything else?" open question
  // (Step 6.5 of the master prompt) — folded into the generation prompt
  // verbatim when present.
  additionalGuidance?: string | null
}
