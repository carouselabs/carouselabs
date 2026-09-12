"use client"

// Create/edit view for one EmailSequence — used by both
// app/(admin)/admin/sequences/new/page.tsx and .../[id]/page.tsx (edit mode
// when `sequenceId` is a real id, create mode when it's undefined/"new").
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  ConfirmModal,
  Spinner,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { AVAILABLE_VARIABLES } from "@/lib/broadcastRender"
import { EngagementStatsPanel } from "@/components/admin/EngagementStatsPanel"
import { TemplatePicker } from "@/components/admin/TemplatePicker"
import { SEGMENT_TYPES } from "@/lib/segments"

interface StepForm {
  key: string
  id?: string // present once persisted — used to fetch per-step engagement stats
  delayDays: number
  subject: string
  subjectB: string
  body: string
  bodyB: string
}

interface SequenceStats {
  total: number
  active: number
  completed: number
  stopped: number
  exitedByRule: number
}

let keySeq = 0
function newKey() {
  keySeq += 1
  return `step-${keySeq}`
}

function emptyStep(delayDays: number): StepForm {
  return { key: newKey(), delayDays, subject: "", subjectB: "", body: "", bodyB: "" }
}

export function SequenceBuilder({ sequenceId }: { sequenceId?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const isNew = !sequenceId

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [name, setName] = useState("")
  const [active, setActive] = useState(true)
  const [segmentType, setSegmentType] = useState("all")
  const [segmentValue, setSegmentValue] = useState("")
  const [stopRule, setStopRule] = useState<string>("")
  const [steps, setSteps] = useState<StepForm[]>([emptyStep(0)])
  const [stats, setStats] = useState<SequenceStats | null>(null)

  useEffect(() => {
    if (isNew) return
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/sequences/${sequenceId}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!active) return
        setName(data.sequence.name)
        setActive(data.sequence.active)
        setSegmentType(data.sequence.segmentType)
        setSegmentValue(data.sequence.segmentValue ?? "")
        setStopRule(data.sequence.stopRule ?? "")
        setSteps(
          data.sequence.steps.map(
            (s: {
              id: string
              delayDays: number
              subject: string
              subjectB: string | null
              body: string
              bodyB: string | null
            }) => ({
              key: newKey(),
              id: s.id,
              delayDays: s.delayDays,
              subject: s.subject,
              subjectB: s.subjectB ?? "",
              body: s.body,
              bodyB: s.bodyB ?? "",
            }),
          ),
        )
        setStats(data.stats)
      } catch {
        toast("Failed to load sequence", "error")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceId, isNew])

  function addStep() {
    setSteps((prev) => [...prev, emptyStep(3)])
  }
  function removeStep(key: string) {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)))
  }
  function moveStep(key: string, dir: -1 | 1) {
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.key === key)
      const j = i + dir
      if (i === -1 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      // First step's delay is always 0 (sent on enrollment) — enforce after
      // any reorder so the invariant survives a swap into position 0.
      next[0] = { ...next[0], delayDays: 0 }
      return next
    })
  }
  function updateStep(key: string, patch: Partial<StepForm>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  const selectedSegment = SEGMENT_TYPES.find((s) => s.value === segmentType)

  const canSave =
    name.trim().length > 0 &&
    steps.every((s) => s.subject.trim() && s.body.trim() && Number.isFinite(s.delayDays) && s.delayDays >= 0)

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        active,
        segmentType,
        segmentValue: segmentValue.trim() || undefined,
        stopRule: stopRule || null,
        steps: steps.map((s) => ({
          delayDays: s.delayDays,
          subject: s.subject.trim(),
          subjectB: s.subjectB.trim() || null,
          body: s.body.trim(),
          bodyB: s.bodyB.trim() || null,
        })),
      }
      const res = await fetch(isNew ? "/api/admin/sequences" : `/api/admin/sequences/${sequenceId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      toast(isNew ? "Sequence created" : "Sequence saved", "success")
      if (isNew) router.push(`/admin/sequences/${data.sequence.id}`)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to save", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!sequenceId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/sequences/${sequenceId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast("Sequence deleted", "success")
      router.push("/admin/sequences")
    } catch {
      toast("Failed to delete sequence", "error")
      setDeleting(false)
    }
  }

  if (loading) return <Spinner label="Loading sequence…" />

  const enrolledCount = stats?.total ?? 0

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/sequences"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8A8A8A] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sequences
      </Link>

      <AdminCard title={isNew ? "New Sequence" : "Edit Sequence"}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Name</label>
              <AdminInput value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="Free-plan nurture" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Status</label>
              <AdminSelect value={active ? "active" : "paused"} onChange={(e) => setActive(e.target.value === "active")}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </AdminSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Auto-enroll segment
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <AdminSelect value={segmentType} onChange={(e) => setSegmentType(e.target.value)} className="w-full sm:w-64">
                {SEGMENT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </AdminSelect>
              {selectedSegment?.needsValue && (
                <AdminInput
                  type="number"
                  min={1}
                  value={segmentValue}
                  onChange={(e) => setSegmentValue(e.target.value)}
                  placeholder={selectedSegment.valuePlaceholder}
                  className="w-32"
                />
              )}
            </div>
            <p className="text-[11px] text-[#6A6A6A]">
              Every user matching this segment is enrolled automatically going forward (checked on
              signup and by a periodic sweep) — this does not retroactively email anyone who already
              matched before the sequence was created active.
              {selectedSegment?.needsValue && ` Defaults to ${selectedSegment.valuePlaceholder} if left blank.`}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Stop Rule
            </label>
            <AdminSelect value={stopRule} onChange={(e) => setStopRule(e.target.value)} className="w-full sm:w-64">
              <option value="">None — run all steps regardless</option>
              <option value="upgraded">Exit if user upgrades to Pro/Growth</option>
            </AdminSelect>
            <p className="text-[11px] text-[#6A6A6A]">
              Only one real stop condition is wired up today. A &quot;replied to Support&quot; rule
              isn&apos;t available — there&apos;s no support-ticket system for regular users yet (only interns
              have one).
            </p>
          </div>

          {!isNew && enrolledCount > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-amber-300">
              {enrolledCount} user{enrolledCount === 1 ? " is" : "s are"} currently enrolled in this
              sequence. Adding, removing, or reordering steps can desync their progress — enrollment
              tracks a step <em>position</em>, not a specific step, so someone mid-sequence may skip or
              repeat a step after a structural edit. Editing copy/delay on an existing step is safe.
            </div>
          )}
        </div>
      </AdminCard>

      <AdminCard title="Steps">
        <div className="space-y-4">
          <p className="text-[11px] text-[#6A6A6A]">
            Available variables:{" "}
            {AVAILABLE_VARIABLES.map((v) => (
              <code key={v.key} className="mr-1.5 text-[#8A8A8A]">{`{{${v.key}}}`}</code>
            ))}
          </p>

          {steps.map((step, i) => (
            <div key={step.key} className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                  Step {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(step.key, -1)}
                    disabled={i === 0}
                    className="p-1 rounded text-[#8A8A8A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(step.key, 1)}
                    disabled={i === steps.length - 1}
                    className="p-1 rounded text-[#8A8A8A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(step.key)}
                    disabled={steps.length <= 1}
                    className="p-1 rounded text-[#8A8A8A] hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Remove step"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[12px] text-[#B0B0B0]">Send</label>
                {i === 0 ? (
                  <span className="text-[12px] text-white">immediately on enrollment</span>
                ) : (
                  <>
                    <AdminInput
                      type="number"
                      min={0}
                      value={step.delayDays}
                      onChange={(e) => updateStep(step.key, { delayDays: Number(e.target.value) })}
                      className="w-20"
                    />
                    <span className="text-[12px] text-[#B0B0B0]">day(s) after step {i}</span>
                  </>
                )}
              </div>

              <TemplatePicker
                currentSubject={step.subject}
                currentBody={step.body}
                onLoad={(s, b) => updateStep(step.key, { subject: s, body: b })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                    Subject{step.subjectB ? " (A)" : ""}
                  </label>
                  <AdminInput
                    value={step.subject}
                    onChange={(e) => updateStep(step.key, { subject: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                    Subject B <span className="font-normal normal-case text-[#6A6A6A]">(optional A/B)</span>
                  </label>
                  <AdminInput
                    value={step.subjectB}
                    onChange={(e) => updateStep(step.key, { subjectB: e.target.value })}
                    className="w-full"
                    placeholder="Leave blank to skip A/B for this step"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                    Body{step.bodyB ? " (A)" : ""}
                  </label>
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(step.key, { body: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                    Body B <span className="font-normal normal-case text-[#6A6A6A]">(optional A/B)</span>
                  </label>
                  <textarea
                    value={step.bodyB}
                    onChange={(e) => updateStep(step.key, { bodyB: e.target.value })}
                    rows={6}
                    placeholder="Leave blank to skip A/B for this step"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {!isNew && step.id && <EngagementStatsPanel sequenceId={sequenceId} stepId={step.id} />}
            </div>
          ))}

          <AdminButton variant="secondary" onClick={addStep}>
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </AdminButton>
        </div>
      </AdminCard>

      {!isNew && sequenceId && <EngagementStatsPanel sequenceId={sequenceId} />}

      <div className="flex items-center justify-between">
        {!isNew ? (
          <AdminButton variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Sequence
          </AdminButton>
        ) : (
          <span />
        )}
        <AdminButton onClick={() => void handleSave()} loading={saving} disabled={!canSave}>
          {isNew ? "Create Sequence" : "Save Changes"}
        </AdminButton>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this sequence?"
        body={`This permanently deletes "${name}" and all ${enrolledCount} enrollment${enrolledCount === 1 ? "" : "s"}. Historical engagement stats are kept. This can't be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
