// lib/engage/videoInput.ts — a watched video as the comment route receives it.
//
// The panel has the video watched once (app/api/ext/video, lib/engage/
// postVideo.ts): ten stills spread through it and what's said in it,
// as text. It keeps that and sends it with the post to /api/ext/generate, so
// Regenerate doesn't pay to watch the same video again. Here those fields are
// checked like any other part of the post the panel sends: only JPEG stills,
// at most FRAME_COUNT, each small, and a transcript of bounded length.
//
// No ffmpeg or OpenAI in this file: the comment route imports it, and stays
// as light as it was.
import type { PostImage } from "@/lib/ai/commentModel"

export const FRAME_COUNT = 10
// A still is 512px on its long side, well under this.
export const MAX_FRAME_BYTES = 300 * 1024
export const MAX_TRANSCRIPT_CHARS = 6_000
// How the post's video is addressed: LinkedIn's own servers, never a
// streaming playlist (only a whole file can be read).
const MAX_URL_CHARS = 4_096

export function isPostVideoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_URL_CHARS) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      (url.hostname === "licdn.com" || url.hostname.endsWith(".licdn.com")) &&
      !/\.(m3u8|mpd)$/i.test(url.pathname)
    )
  } catch {
    return false
  }
}

export function isJpeg(bytes: Buffer): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

// The stills from a request body, as base64 JPEGs. Anything else is dropped.
export function videoFramesFrom(value: unknown): PostImage[] {
  if (!Array.isArray(value)) return []
  const maxChars = Math.ceil(MAX_FRAME_BYTES / 3) * 4
  return value.slice(0, FRAME_COUNT).flatMap((item): PostImage[] => {
    if (typeof item !== "string" || item.length < 8 || item.length > maxChars || !BASE64.test(item)) return []
    return isJpeg(Buffer.from(item.slice(0, 8), "base64")) ? [{ mediaType: "image/jpeg", data: item }] : []
  })
}

// One line of plain text, cut at a word near the cap.
export function cleanTranscript(value: unknown): string {
  if (typeof value !== "string") return ""
  const text = value.replace(/\s+/g, " ").trim()
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text
  const cut = text.slice(0, MAX_TRANSCRIPT_CHARS)
  const space = cut.lastIndexOf(" ")
  return `${space > MAX_TRANSCRIPT_CHARS - 200 ? cut.slice(0, space) : cut}…`
}

// What's said in the video, for the model: inside its own element, which the
// note (lib/engage/postImages.ts mediaNote) says is data, like the post.
export function videoSpeechBlock(transcript: string): string {
  if (!transcript) return ""
  const text = transcript.replace(/<\/?\s*video_speech\s*>/gi, " ")
  return `<video_speech>\n${text}\n</video_speech>`
}
