"use client"

// Content Hub "Bulk Upload" — CSV import. Parses client-side (lib/csv.ts),
// then sends rows to app/api/content-hub/bulk-upload in small chunks so
// progress can be shown and no single request runs too long. Each row
// becomes a real Post + ScheduledPost, exactly like one Custom Post — no AI,
// no credit charge.
import { useRef, useState } from "react"
import { Upload, Loader2, Download, CheckCircle2, XCircle, FileText } from "lucide-react"
import { csvToBulkRows, EXAMPLE_CSV, type BulkUploadRow } from "@/lib/csv"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MAX_ROWS = 100
const CHUNK_SIZE = 20

interface RowResult {
  row: number
  ok: boolean
  postId?: string
  error?: string
}

interface BulkUploadPanelProps {
  onDone: () => void
}

export function BulkUploadPanel({ onDone }: BulkUploadPanelProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<BulkUploadRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [results, setResults] = useState<RowResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setParseError(null)
    setResults([])
    setRows([])
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? ""
      const parsed = csvToBulkRows(text)
      if ("error" in parsed) {
        setParseError(parsed.error)
        return
      }
      if (parsed.rows.length > MAX_ROWS) {
        setParseError(`That file has ${parsed.rows.length} rows — please split it into batches of ${MAX_ROWS} or fewer`)
        return
      }
      setRows(parsed.rows)
    }
    reader.onerror = () => setParseError("Failed to read that file")
    reader.readAsText(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) handleFile(file)
  }

  function downloadExample() {
    const blob = new Blob([EXAMPLE_CSV], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "carouselabs-bulk-upload-example.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function handleUpload() {
    if (rows.length === 0) return
    setUploading(true)
    setProcessed(0)
    setResults([])
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const allResults: RowResult[] = []

    for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
      const chunk = rows.slice(start, start + CHUNK_SIZE)
      try {
        const res = await fetch("/api/content-hub/bulk-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk, timeZone }),
        })
        const data = await res.json()
        if (res.ok) {
          const chunkResults = (data as { results: RowResult[] }).results.map((r) => ({
            ...r,
            row: r.row + start, // re-base to the row's index in the full file
          }))
          allResults.push(...chunkResults)
        } else {
          // The whole chunk failed validation up front (e.g. malformed
          // request) — attribute the failure to every row in it.
          chunk.forEach((_, i) =>
            allResults.push({
              row: start + i,
              ok: false,
              error: (data as { error?: string }).error ?? "Request failed",
            }),
          )
        }
      } catch {
        chunk.forEach((_, i) => allResults.push({ row: start + i, ok: false, error: "Network error" }))
      }
      setProcessed(Math.min(start + CHUNK_SIZE, rows.length))
      setResults([...allResults])
    }

    setUploading(false)
    onDone()
  }

  const succeeded = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  const done = results.length > 0 && !uploading

  return (
    <div className="flex flex-col gap-4">
      <p className="text-label text-muted-foreground [&_code]:rounded-[4px] [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-px [&_code]:text-caption [&_code]:text-foreground">
        Import up to {MAX_ROWS} posts at once from a CSV with columns <code>caption</code>,{" "}
        <code>imageUrl</code>, <code>platform</code>, and <code>scheduledFor</code> (an ISO date/time, or
        &quot;queue&quot; to use your next available queue slot). Each row becomes a real post — no AI, no
        credit charge.
      </p>

      <Button variant="link" size="sm" onClick={downloadExample} className="self-start">
        <Download aria-hidden />
        Download example CSV
      </Button>

      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        aria-disabled={uploading || undefined}
        className={cn(
          "flex h-32 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-control-border bg-surface-raised px-4 text-center transition-colors duration-(--motion-fast) hover:border-brand/50 hover:bg-brand-soft/40",
          uploading ? "cursor-wait" : "cursor-pointer"
        )}
      >
        <FileText className="size-5 text-muted-foreground" strokeWidth={1.8} aria-hidden />
        <span className="max-w-full truncate text-label text-foreground">{fileName ? fileName : "Click to choose a CSV file"}</span>
      </button>
      <input ref={inputRef} type="file" accept=".csv,text/csv" disabled={uploading} className="hidden" onChange={handleInputChange} />

      {parseError && (
        <p role="alert" className="rounded-control-sm border border-danger/25 bg-danger-soft px-3 py-2.5 text-caption text-danger">
          {parseError}
        </p>
      )}

      {rows.length > 0 && !done && (
        <p className="text-label text-foreground">
          <strong>{rows.length}</strong> row{rows.length === 1 ? "" : "s"} ready to import.
        </p>
      )}

      {(uploading || done) && (
        <div className="flex flex-col gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={rows.length}
            aria-valuenow={processed}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-(--motion-panel)"
              style={{ width: `${rows.length ? (processed / rows.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-caption text-muted-foreground tabular-nums">
            {processed} / {rows.length} processed
          </p>
        </div>
      )}

      {done && (
        <div className="flex flex-col gap-2">
          <div role="status" className="flex items-center gap-4 rounded-card border border-border bg-surface-raised p-3">
            <span className="inline-flex items-center gap-1.5 text-label font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              {succeeded} succeeded
            </span>
            {failed > 0 && (
              <span className="inline-flex items-center gap-1.5 text-label font-medium text-danger">
                <XCircle className="size-4" aria-hidden />
                {failed} failed
              </span>
            )}
          </div>
          {failed > 0 && (
            <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {results
                .filter((r) => !r.ok)
                .map((r) => (
                  <p key={r.row} className="text-caption text-danger">
                    Row {r.row + 1}: {r.error}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {!done && (
        <Button variant="brand" className="self-start" onClick={() => void handleUpload()} disabled={rows.length === 0 || uploading}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          {uploading ? "Uploading…" : "Start Upload"}
        </Button>
      )}
      {done && (
        <p className="text-caption text-muted-foreground">Choose another file above to run a new import.</p>
      )}
    </div>
  )
}
