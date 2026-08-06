"use client"

// Tab 4 — Notes: freeform admin remarks (general/praise/warning/review),
// newest first, with an add form and a delete action for correcting mistakes.
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { AdminButton, AdminCard, AdminSelect, ConfirmModal, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import type { InternNoteT } from "@/components/admin/intern/types"

const NOTE_TYPES = [
  { value: "general", label: "General" },
  { value: "praise", label: "Praise" },
  { value: "warning", label: "Warning" },
  { value: "review", label: "Review" },
]

const TYPE_STYLES: Record<string, string> = {
  general: "bg-[#2A2A2A] text-[#B0B0B0]",
  praise: "bg-emerald-500/15 text-emerald-400",
  warning: "bg-amber-500/15 text-amber-400",
  review: "bg-[#7C3AED]/15 text-[#A78BFA]",
}

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.general
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${style}`}>
      {type}
    </span>
  )
}

export function NotesTab({
  internId,
  notes,
  onRefresh,
}: {
  internId: string
  notes: InternNoteT[]
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const [type, setType] = useState("general")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<InternNoteT | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const addNote = async () => {
    if (!content.trim()) {
      toast("Note content is required", "error")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${internId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), type }),
      })
      if (!res.ok) throw new Error()
      toast("Note added", "success")
      setContent("")
      setType("general")
      onRefresh()
    } catch {
      toast("Failed to add note", "error")
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${internId}/notes/${deleting.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast("Note deleted", "success")
      setDeleting(null)
      onRefresh()
    } catch {
      toast("Failed to delete note", "error")
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminCard title="Add Note">
        <div className="space-y-3">
          <AdminSelect value={type} onChange={(e) => setType(e.target.value)} className="w-40">
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </AdminSelect>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Note content…"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />
          <div className="flex justify-end">
            <AdminButton loading={busy} onClick={addNote}>
              Add Note
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <AdminCard title={`Notes (${notes.length})`}>
        {notes.length === 0 ? (
          <p className="text-[12.5px] text-[#6A6A6A]">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-[#2A2A2A] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={n.type} />
                    <span className="text-[11px] text-[#6A6A6A]">
                      {n.addedBy} · {fmtDateTime(n.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => setDeleting(n)}
                    className="shrink-0 rounded-md p-1.5 text-[#8A8A8A] hover:bg-red-500/15 hover:text-red-400 transition-colors"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#D0D0D0]">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete note?"
        body="This permanently removes the note."
        confirmLabel="Delete"
      />
    </div>
  )
}
