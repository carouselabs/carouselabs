"use client"

// All-posts table with server-side filters + pagination (/api/admin/posts).
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Download } from "lucide-react"
import { AdminButton, AdminInput, AdminSelect, Spinner, fmtDateTime, tableCls } from "@/components/admin/ui"
import { exportToCSV } from "@/lib/adminExport"
import { useToast } from "@/components/admin/Toast"

type PostRow = {
  id: string
  userId: string
  email: string
  title: string
  format: string
  status: string
  ideaHook: string | null
  creditsCost: number
  createdAt: string
}

type PostsResponse = {
  total: number
  page: number
  totalPages: number
  posts: PostRow[]
}

export function PostsTable() {
  const { toast } = useToast()
  const initialSearch = useSearchParams().get("search") ?? ""

  const [search, setSearch] = useState(initialSearch)
  const [type, setType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PostsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search.trim()) params.set("search", search.trim())
      if (type) params.set("type", type)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`/api/admin/posts?${params}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast("Failed to load posts", "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, type, from, to, toast])

  // Debounce the text search; filters/page trigger immediately via deps.
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  // Exports every post matching the current filters, not just the visible
  // page — pages through the same endpoint before building the CSV.
  const exportAll = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ page: "1" })
      if (search.trim()) params.set("search", search.trim())
      if (type) params.set("type", type)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const first = await fetch(`/api/admin/posts?${params}`)
      if (!first.ok) throw new Error()
      const firstData: PostsResponse = await first.json()
      const all = [...firstData.posts]
      for (let p = 2; p <= firstData.totalPages; p++) {
        params.set("page", String(p))
        const r = await fetch(`/api/admin/posts?${params}`)
        if (r.ok) all.push(...((await r.json()) as PostsResponse).posts)
      }
      exportToCSV(
        all.map((p) => ({
          UserEmail: p.email,
          Type: p.format,
          Status: p.status,
          IdeaHook: p.ideaHook ?? p.title,
          CreatedAt: new Date(p.createdAt).toISOString(),
          CreditsCost: p.creditsCost,
        })),
        "carouselabs-posts",
      )
    } catch {
      toast("Export failed", "error")
    } finally {
      setExporting(false)
    }
  }

  const dateInputCls =
    "h-9 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white outline-none focus:border-[#7C3AED] [color-scheme:dark]"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <AdminInput
          placeholder="Search by user email or idea hook…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-80"
        />
        <AdminSelect
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All types</option>
          <option value="TEXT_ONLY">Caption</option>
          <option value="SINGLE_IMAGE">Image</option>
          <option value="CAROUSEL">Carousel</option>
        </AdminSelect>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            setPage(1)
          }}
          className={dateInputCls}
        />
        <span className="text-[12px] text-[#6A6A6A]">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            setPage(1)
          }}
          className={dateInputCls}
        />
        {data && <span className="text-[12px] text-[#6A6A6A]">{data.total} posts</span>}
        <div className="ml-auto">
          <AdminButton variant="secondary" onClick={exportAll} loading={exporting}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </AdminButton>
        </div>
      </div>

      {/* Table */}
      {loading && !data ? (
        <Spinner label="Loading posts…" />
      ) : (
        <div className={`${tableCls.wrap} ${loading ? "opacity-60" : ""}`}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>User Email</th>
                <th className={tableCls.th}>Type</th>
                <th className={tableCls.th}>Status</th>
                <th className={tableCls.th}>Idea Hook</th>
                <th className={tableCls.th}>Created At</th>
                <th className={tableCls.th}>Credits</th>
              </tr>
            </thead>
            <tbody>
              {data?.posts.length === 0 && (
                <tr>
                  <td className={tableCls.td} colSpan={6}>
                    No posts match
                  </td>
                </tr>
              )}
              {data?.posts.map((p) => (
                <tr key={p.id} className={tableCls.row}>
                  <td className={tableCls.td}>
                    <Link href={`/admin/users/${p.userId}`} className="text-[#A78BFA] hover:underline">
                      {p.email}
                    </Link>
                  </td>
                  <td className={tableCls.td}>{p.format.replace("_", " ")}</td>
                  <td className={tableCls.td}>{p.status}</td>
                  <td className={`${tableCls.td} max-w-[320px] truncate text-[#8A8A8A]`}>
                    {p.ideaHook ?? p.title}
                  </td>
                  <td className={tableCls.td}>{fmtDateTime(p.createdAt)}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{p.creditsCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between text-[12px] text-[#8A8A8A]">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <AdminButton variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </AdminButton>
            <AdminButton
              variant="secondary"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  )
}
