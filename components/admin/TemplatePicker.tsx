"use client"

// Reusable "Load Template" / "Save as Template" control for any
// subject+body editor — used by both the one-off Broadcast composer and
// each Sequence step's editor. Owns no subject/body state itself; the
// caller passes its current values in and gets a callback when one is
// loaded, so the same component works regardless of where that state lives.
import { useState } from "react"
import { FileText, Save } from "lucide-react"
import { Modal, AdminButton, AdminInput } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

interface Template {
  id: string
  name: string
  subject: string
  body: string
}

export function TemplatePicker({
  currentSubject,
  currentBody,
  onLoad,
}: {
  currentSubject: string
  currentBody: string
  onLoad: (subject: string, body: string) => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [saving, setSaving] = useState(false)

  async function openPicker() {
    setOpen(true)
    if (templates !== null) return // already loaded this mount
    try {
      const res = await fetch("/api/admin/email-templates")
      if (!res.ok) throw new Error()
      setTemplates((await res.json()).templates)
    } catch {
      setTemplates([])
      toast("Failed to load templates", "error")
    }
  }

  async function handleSave() {
    if (!templateName.trim() || !currentSubject.trim() || !currentBody.trim()) {
      toast("Fill in a name, subject, and body first", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim(), subject: currentSubject, body: currentBody }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      toast("Template saved", "success")
      setTemplates((prev) => (prev ? [data.template as Template, ...prev] : [data.template as Template]))
      setSaveOpen(false)
      setTemplateName("")
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to save", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setTemplates((prev) => prev?.filter((t) => t.id !== id) ?? null)
    } catch {
      toast("Failed to delete template", "error")
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void openPicker()}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8A8A8A] hover:text-white transition-colors"
        >
          <FileText className="h-3 w-3" />
          Load Template
        </button>
        <button
          type="button"
          onClick={() => setSaveOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8A8A8A] hover:text-white transition-colors"
        >
          <Save className="h-3 w-3" />
          Save as Template
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Load Template">
        {templates === null ? (
          <p className="text-[12.5px] text-[#8A8A8A]">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-[12.5px] text-[#8A8A8A]">No saved templates yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] p-2.5 hover:border-[#7C3AED] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    onLoad(t.subject, t.body)
                    setOpen(false)
                  }}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-[13px] font-medium text-white truncate">{t.name}</p>
                  <p className="text-[11px] text-[#8A8A8A] truncate">{t.subject}</p>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(t.id)}
                  className="flex-shrink-0 text-[11px] text-[#8A8A8A] hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save as Template">
        <div className="space-y-3">
          <AdminInput
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            className="w-full"
          />
          <AdminButton onClick={() => void handleSave()} loading={saving}>
            Save
          </AdminButton>
        </div>
      </Modal>
    </>
  )
}
