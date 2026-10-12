"use client"

// Content Hub "Bulk Upload" — CSV import. Parses client-side (lib/csv.ts),
// then sends rows to app/api/content-hub/bulk-upload in small chunks so
// progress can be shown and no single request runs too long. Each row
// becomes a real Post + ScheduledPost, exactly like one Custom Post — no AI,
// no credit charge.
import { useRef, useState } from "react"
import { Upload, Loader2, Download, CheckCircle2, XCircle, FileText } from "lucide-react"
import { csvToBulkRows, EXAMPLE_CSV, type BulkUploadRow } from "@/lib/csv"

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
      <p className="text-[13px] text-[#6B7280] leading-[1.5]">
        Import up to {MAX_ROWS} posts at once from a CSV with columns <code>caption</code>,{" "}
        <code>imageUrl</code>, <code>platform</code>, and <code>scheduledFor</code> (an ISO date/time, or
        &quot;queue&quot; to use your next available queue slot). Each row becomes a real post — no AI, no
        credit charge.
      </p>

      <button
        onClick={downloadExample}
        className="self-start inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
      >
        <Download size={13} strokeWidth={2.2} />
        Download example CSV
      </button>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 h-28 rounded-xl border border-dashed transition-colors ${
          uploading ? "cursor-wait" : "cursor-pointer"
        } border-[#E5E3DE] bg-[#F6F4EE] hover:border-[#D6D3CC] hover:bg-[#F4F2EC]`}
      >
        <FileText size={16} className="text-[#ADA99F]" strokeWidth={1.8} />
        <p className="text-[12px] text-[#9CA3AF]">{fileName ? fileName : "Click to choose a CSV file"}</p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" disabled={uploading} className="hidden" onChange={handleInputChange} />
      </div>

      {parseError && (
        <div className="px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
          {parseError}
        </div>
      )}

      {rows.length > 0 && !done && (
        <p className="text-[12.5px] text-[#374151]">
          <strong>{rows.length}</strong> row{rows.length === 1 ? "" : "s"} ready to import.
        </p>
      )}

      {(uploading || done) && (
        <div className="flex flex-col gap-2">
          <div className="h-2 w-full rounded-full bg-[#ECEAE4] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#7C3AED] transition-all duration-300"
              style={{ width: `${rows.length ? (processed / rows.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11.5px] text-[#9CA3AF]">
            {processed} / {rows.length} processed
          </p>
        </div>
      )}

      {done && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 p-3 rounded-xl border border-[#E5E3DE] bg-white">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#10B981]">
              <CheckCircle2 size={14} />
              {succeeded} succeeded
            </span>
            {failed > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[rgba(239,68,68,0.9)]">
                <XCircle size={14} />
                {failed} failed
              </span>
            )}
          </div>
          {failed > 0 && (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {results
                .filter((r) => !r.ok)
                .map((r) => (
                  <p key={r.row} className="text-[11.5px] text-[rgba(239,68,68,0.9)]">
                    Row {r.row + 1}: {r.error}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {!done && (
        <button
          onClick={() => void handleUpload()}
          disabled={rows.length === 0 || uploading}
          className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} strokeWidth={2.2} />}
          {uploading ? "Uploading…" : "Start Upload"}
        </button>
      )}
      {done && (
        <p className="text-[11.5px] text-[#9CA3AF]">Choose another file above to run a new import.</p>
      )}
    </div>
  )
}
