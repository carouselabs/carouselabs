// lib/savedCommentsCsv.ts — saved comments in and out of a spreadsheet (the
// website's Engage → Saved comments: Import CSV / Export CSV). Read and
// written in the browser; the import route (app/api/ext/saved-comments/
// import) checks every row again.
//
// Columns, by header name (any order, any case): "body" (or "comment" /
// "text") is the only one needed; "title" (or "name"), "tags" (separated by
// commas, semicolons or |), "remind" / "remindOn" (own, any, off, or the
// words the page uses) and "favorite" (yes / true / 1) are optional.
import type { RemindOn, SavedCommentForClient } from "@/lib/engageSavedComments"

// RFC 4180: quoted fields may hold commas, quotes ("") and line breaks.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const source = text.replace(/^﻿/, "")
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }
  if (field !== "" || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""))
}

export interface CsvItem {
  title?: string
  body: string
  tags?: string[]
  remindOn?: RemindOn
  favorite?: boolean
}

const HEADERS = {
  body: ["body", "comment", "text"],
  title: ["title", "name"],
  tags: ["tags", "tag"],
  remind: ["remind", "remindon", "reminder"],
  favorite: ["favorite", "favourite", "star", "starred"],
}

function remindOf(value: string): RemindOn | undefined {
  const v = value.trim().toLowerCase()
  if (!v) return undefined
  if (["own", "my own posts", "own posts", "mine"].includes(v)) return "own"
  if (["any", "every post", "all", "all posts"].includes(v)) return "any"
  if (["off", "never", "no", "none"].includes(v)) return "off"
  return undefined
}

// The rows a file holds, ready for the import route. A file without a
// header naming the comment column is refused with a reason.
export function itemsFromCsv(text: string): { ok: true; items: CsvItem[] } | { ok: false; error: string } {
  const rows = parseCsv(text)
  if (rows.length < 2) return { ok: false, error: "The file has no rows under its header." }
  const header = rows[0].map((cell) => cell.trim().toLowerCase().replace(/[\s_-]+/g, ""))
  const column = (names: string[]) => header.findIndex((cell) => names.includes(cell))
  const body = column(HEADERS.body)
  if (body === -1) return { ok: false, error: 'The file needs a column named "body" (or "comment") holding each comment.' }
  const title = column(HEADERS.title)
  const tags = column(HEADERS.tags)
  const remind = column(HEADERS.remind)
  const favorite = column(HEADERS.favorite)
  const cell = (cells: string[], index: number) => (index === -1 ? "" : (cells[index] ?? ""))

  const items = rows.slice(1).map((cells) => {
    const item: CsvItem = { body: cell(cells, body) }
    if (cell(cells, title).trim()) item.title = cell(cells, title).trim()
    const tagList = cell(cells, tags).split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
    if (tagList.length) item.tags = tagList
    const remindOn = remindOf(cell(cells, remind))
    if (remindOn) item.remindOn = remindOn
    if (["yes", "true", "1", "y"].includes(cell(cells, favorite).trim().toLowerCase())) item.favorite = true
    return item
  })
  return { ok: true, items }
}

const quote = (value: string) => (/[",\r\n]/.test(value) || /^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

// Every saved comment as a spreadsheet; importing the file gives the same
// list back.
export function savedCommentsToCsv(list: SavedCommentForClient[]): string {
  const header = ["title", "body", "tags", "remind", "favorite", "times used", "last used"]
  const lines = list.map((c) =>
    [
      c.title,
      c.body,
      c.tags.join("; "),
      c.remindOn,
      c.favorite ? "yes" : "no",
      String(c.useCount),
      c.lastUsedAt ? c.lastUsedAt.slice(0, 10) : "",
    ]
      .map(quote)
      .join(","),
  )
  return [header.join(","), ...lines].join("\r\n") + "\r\n"
}
