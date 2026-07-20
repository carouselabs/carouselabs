// lib/adminExport.ts
// Shared CSV export for admin tables. Client-only (Blob/URL/document).
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const headers = Object.keys(data[0]).join(",")
  const rows = data.map((row) => Object.values(row).map(esc).join(","))
  const csv = [headers, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
