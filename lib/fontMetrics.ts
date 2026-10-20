// lib/fontMetrics.ts
// How wide a line of text is in a TrueType font, read straight from the font
// file (its character map and glyph widths; kerning ignored). Used to size
// the headline painted into an AI-written email's picture so each line fits
// beside the painting's object (lib/emailArt.tsx).

export interface FontMetrics {
  unitsPerEm: number
  advance(char: string): number
}

export function readFontMetrics(font: Uint8Array): FontMetrics {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength)
  const tables = new Map<string, number>()
  const numTables = view.getUint16(4)
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16
    const tag = String.fromCharCode(...font.subarray(record, record + 4))
    tables.set(tag, view.getUint32(record + 8))
  }
  const need = (tag: string) => {
    const offset = tables.get(tag)
    if (offset === undefined) throw new Error(`Font has no ${tag} table`)
    return offset
  }

  const unitsPerEm = view.getUint16(need("head") + 18)
  const numberOfHMetrics = view.getUint16(need("hhea") + 34)
  const hmtx = need("hmtx")
  const advanceOfGlyph = (glyph: number) => view.getUint16(hmtx + 4 * Math.min(glyph, numberOfHMetrics - 1))

  // The Unicode character map (format 4: the Basic Multilingual Plane).
  const cmap = need("cmap")
  let format4 = -1
  for (let i = 0; i < view.getUint16(cmap + 2); i++) {
    const record = cmap + 4 + i * 8
    const platform = view.getUint16(record)
    const encoding = view.getUint16(record + 2)
    const sub = cmap + view.getUint32(record + 4)
    if (view.getUint16(sub) === 4 && ((platform === 3 && encoding === 1) || platform === 0)) {
      format4 = sub
      break
    }
  }
  if (format4 < 0) throw new Error("Font has no Unicode character map")
  const segCount = view.getUint16(format4 + 6) / 2
  const endCodes = format4 + 14
  const startCodes = endCodes + segCount * 2 + 2
  const idDeltas = startCodes + segCount * 2
  const idRangeOffsets = idDeltas + segCount * 2

  const glyphOf = (code: number): number => {
    for (let s = 0; s < segCount; s++) {
      if (view.getUint16(endCodes + s * 2) < code) continue
      const start = view.getUint16(startCodes + s * 2)
      if (start > code) return 0
      const delta = view.getInt16(idDeltas + s * 2)
      const rangeOffsetAt = idRangeOffsets + s * 2
      const rangeOffset = view.getUint16(rangeOffsetAt)
      if (rangeOffset === 0) return (code + delta) & 0xffff
      const glyph = view.getUint16(rangeOffsetAt + rangeOffset + (code - start) * 2)
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff
    }
    return 0
  }

  return { unitsPerEm, advance: (char) => advanceOfGlyph(glyphOf(char.codePointAt(0) ?? 0)) }
}

/** Width in pixels of `text` at `size`, with letter spacing in em (e.g. -0.02). */
export function textWidth(metrics: FontMetrics, text: string, size: number, letterSpacingEm = 0): number {
  const chars = [...text]
  const units = chars.reduce((sum, ch) => sum + metrics.advance(ch), 0)
  return (units / metrics.unitsPerEm) * size + letterSpacingEm * size * Math.max(0, chars.length - 1)
}

/**
 * The biggest size (stepping down from `max`) at which every line fits in
 * `width`; `min` if none does (the line then wraps).
 */
export function fitSize(
  lines: { metrics: FontMetrics; text: string }[],
  { width, max, min, step = 2, letterSpacingEm = 0 }: { width: number; max: number; min: number; step?: number; letterSpacingEm?: number },
): number {
  for (let size = max; size >= min; size -= step) {
    if (lines.every((l) => textWidth(l.metrics, l.text, size, letterSpacingEm) <= width)) return size
  }
  return min
}
