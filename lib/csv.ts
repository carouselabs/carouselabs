// lib/csv.ts — minimal RFC4180-ish CSV parser (quoted fields, embedded
// commas/newlines, "" escaped quotes, \r\n or \n line endings). No library
// dependency for something this bounded; used client-side by the Bulk
// Upload panel to turn a pasted/uploaded CSV into row objects before sending
// them to app/api/content-hub/bulk-upload.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }
    if (char === '"') {
      inQuotes = true
      i++
      continue
    }
    if (char === ",") {
      row.push(field)
      field = ""
      i++
      continue
    }
    if (char === "\r") {
      i++
      continue
    }
    if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i++
      continue
    }
    field += char
    i++
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop fully-blank lines (a trailing newline at EOF otherwise produces a
  // spurious single-empty-string row).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""))
}

export interface BulkUploadRow {
  caption: string
  imageUrl: string
  platform: string
  scheduledFor: string // ISO datetime string, or the literal "queue"
}

// Header-driven (case-insensitive, order-independent) so column order in the
// user's CSV doesn't matter. `platform` is the only required column.
export function csvToBulkRows(text: string): { rows: BulkUploadRow[] } | { error: string } {
  const table = parseCsv(text)
  if (table.length === 0) return { error: "That file is empty" }

  const header = table[0].map((h) => h.trim().toLowerCase())
  const idx = {
    caption: header.indexOf("caption"),
    imageUrl: header.indexOf("imageurl"),
    platform: header.indexOf("platform"),
    scheduledFor: header.indexOf("scheduledfor"),
  }
  if (idx.platform === -1) {
    return { error: "The CSV must have a 'platform' column (caption, imageUrl, scheduledFor are optional)" }
  }

  const dataRows = table.slice(1).filter((r) => r.some((cell) => cell.trim() !== ""))
  if (dataRows.length === 0) return { error: "No data rows found below the header" }

  const rows: BulkUploadRow[] = dataRows.map((r) => ({
    caption: idx.caption >= 0 ? (r[idx.caption] ?? "").trim() : "",
    imageUrl: idx.imageUrl >= 0 ? (r[idx.imageUrl] ?? "").trim() : "",
    platform: idx.platform >= 0 ? (r[idx.platform] ?? "").trim().toLowerCase() : "",
    scheduledFor: idx.scheduledFor >= 0 && (r[idx.scheduledFor] ?? "").trim() ? r[idx.scheduledFor].trim() : "queue",
  }))

  return { rows }
}

export const EXAMPLE_CSV = `caption,imageUrl,platform,scheduledFor
"Excited to share our latest update!",,linkedin,queue
"Check out this new feature we just shipped.",https://example.com/screenshot.png,linkedin,2026-01-15T09:00:00Z
"Behind the scenes at our team offsite",,instagram,queue
`
