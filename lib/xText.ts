// lib/xText.ts — X's own way of counting a post's length, so replies written
// for CarouseLabs Engage for X fit X's box exactly. Used by the server
// (app/api/ext/x/*) and by the X extension's panel (its counter), which
// imports this same file.
//
// X counts "weighted" characters (the rules of its open-source twitter-text
// library, v3 configuration): most Latin letters, digits and common
// punctuation count 1; everything else (CJK, emoji, ...) counts 2; a whole
// emoji, even one built from several code points (a family, a flag, a skin
// tone), counts 2 once; every link counts 23 whatever its real length. A
// standard account can post 280.

export const X_MAX_LENGTH = 280

// A standard account posts 280; X Premium accounts can post far longer, but a
// reply past a few hundred characters reads as a post, not a reply. The
// settings let a Premium user raise their limit up to this.
export const X_PREMIUM_REPLY_LENGTH = 1000

// Code point ranges that count 1 (weight 100 on X's scale of 100 per char).
const LIGHT_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
]

// What X counts as a link: http(s) URLs, and bare domains with a common
// top-level domain (x.com, carouselabs.com/pricing, www.example.co.uk).
const URL_PATTERN =
  /\bhttps?:\/\/[^\s<>"]+|\b(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|org|net|io|ai|co|app|dev|me|in|uk|us|xyz|info|biz|tv|gg|so|ly)(?:\/[^\s<>"]*)?/gi
export const X_LINK_LENGTH = 23

const PICTOGRAPHIC = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

function codePointWeight(codePoint: number): number {
  return LIGHT_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to) ? 1 : 2
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null

function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text)
}

// The length X shows for `text`.
export function xLength(text: string): number {
  const normalized = text.normalize("NFC")
  let length = 0
  let last = 0
  for (const match of normalized.matchAll(URL_PATTERN)) {
    length += plainLength(normalized.slice(last, match.index))
    length += X_LINK_LENGTH
    last = (match.index ?? 0) + match[0].length
  }
  return length + plainLength(normalized.slice(last))
}

function plainLength(text: string): number {
  let length = 0
  for (const cluster of graphemes(text)) {
    if (PICTOGRAPHIC.test(cluster)) {
      length += 2
      continue
    }
    for (const char of cluster) length += codePointWeight(char.codePointAt(0)!)
  }
  return length
}

// Whether `text` fits a post of `max` (280 for a standard account).
export function fitsX(text: string, max = X_MAX_LENGTH): boolean {
  return xLength(text) <= max
}
