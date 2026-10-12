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
  general: "bg-surface-raised text-muted-foreground",
  praise: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  review: "bg-brand/15 text-brand",
}

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.general
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${style}`}>
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
            className="w-full rounded-control-sm border border-border bg-background p-3 text-label text-foreground placeholder:text-muted-foreground/80 outline-none focus:border-brand"
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
          <p className="text-caption text-muted-foreground/80">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-control-sm border border-border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={n.type} />
                    <span className="text-caption text-muted-foreground/80">
                      {n.addedBy} · {fmtDateTime(n.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => setDeleting(n)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger/15 hover:text-danger transition-colors"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-label leading-relaxed text-foreground/90">{n.content}</p>
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
