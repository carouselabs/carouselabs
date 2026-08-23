import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import { PDFParse } from "pdf-parse"
import mammoth from "mammoth"

// Parsing a large PDF/DOCX is quick but not instant; matches the budget
// given to other lightweight per-request routes in this feature.
export const maxDuration = 60

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: false,
})

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB
// Caps how much extracted text gets sent on to the chat flow — a script this
// long is already far more than a thumbnail's video-content field needs.
const MAX_EXTRACTED_CHARS = 20000

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".")
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase()
}

// pdf-parse marks page boundaries with lines like "-- 1 of 3 --" — strip
// those so the extracted text reads as continuous prose, not pagination noise.
function cleanPdfText(text: string): string {
  return text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function truncate(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_EXTRACTED_CHARS) return trimmed
  return `${trimmed.slice(0, MAX_EXTRACTED_CHARS)}\n\n[Truncated — the extracted document was longer than ${MAX_EXTRACTED_CHARS.toLocaleString()} characters]`
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`thumbnail:extract-document:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  let file: File
  try {
    const formData = await req.formData()
    const uploaded = formData.get("file")
    if (!(uploaded instanceof File)) throw new Error("Missing file")
    file = uploaded
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)." }, { status: 400 })
  }

  const extension = getExtension(file.name)
  if (!["pdf", "doc", "docx", "txt"].includes(extension)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, DOC, DOCX, or TXT file." },
      { status: 400 },
    )
  }

  // Legacy binary .doc has no viable pure-JS parser available here (mammoth
  // only reads the modern .docx XML format) — reject with a clear message
  // rather than silently failing or producing garbage text.
  if (extension === "doc") {
    return NextResponse.json(
      {
        error:
          "Legacy .doc files aren't supported — please save it as .docx, or upload a PDF or TXT file instead.",
      },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    if (extension === "txt") {
      const text = buffer.toString("utf-8")
      if (!text.trim()) {
        return NextResponse.json({ error: "That text file appears to be empty." }, { status: 422 })
      }
      return NextResponse.json({ extractedText: truncate(text) })
    }

    if (extension === "pdf") {
      // Magic-byte check before spending time on a full parse attempt.
      if (buffer.length < 4 || buffer.toString("ascii", 0, 4) !== "%PDF") {
        return NextResponse.json({ error: "That file doesn't look like a valid PDF." }, { status: 400 })
      }
      const parser = new PDFParse({ data: buffer })
      try {
        const result = await parser.getText()
        const cleaned = cleanPdfText(result.text)
        if (!cleaned) {
          return NextResponse.json(
            {
              error:
                "Couldn't find any text in that PDF — it may be a scanned/image-only document. Try a different file, or type your video content instead.",
            },
            { status: 422 },
          )
        }
        return NextResponse.json({ extractedText: truncate(cleaned) })
      } finally {
        await parser.destroy()
      }
    }

    // .docx — a ZIP archive under the hood, so a real one always starts "PK".
    if (buffer.length < 2 || buffer.toString("ascii", 0, 2) !== "PK") {
      return NextResponse.json({ error: "That file doesn't look like a valid DOCX." }, { status: 400 })
    }
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()
    if (!text) {
      return NextResponse.json({ error: "That document appears to be empty." }, { status: 422 })
    }
    return NextResponse.json({ extractedText: truncate(text) })
  } catch (err) {
    console.error("[thumbnail/extract-document] extraction error:", err)
    return NextResponse.json(
      {
        error:
          "Couldn't extract text from that file — it may be corrupted or password-protected. Try a different file, or type your video content instead.",
      },
      { status: 422 },
    )
  }
}
