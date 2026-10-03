// lib/engage/csv.ts — CSV downloads from the Engage admin. Text cells that
// start with = + - @ (or a tab / carriage return) are prefixed with ' so a
// spreadsheet never runs them as formulas: an email or a note is data.
// Numbers are written as they are, so -3 stays a number.
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  let s = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
}

// Starts with a byte-order mark so Excel reads it as UTF-8 (names with
// accents, emoji in notes).
export function csvResponse(filename: string, csv: string): Response {
  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  })
}
