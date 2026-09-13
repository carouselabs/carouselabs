"use client"

// Content Hub "Queue Settings" — preset (day, time, platform) slots that
// "Add to Queue" assigns new posts to automatically (see lib/queue.ts). One
// slot = one day, unlike Recurring Slots' multi-day rows — see
// prisma/schema.prisma's QueueSlot comment for why these are kept separate.
import { Loader2, Pause, Play, Pencil, Trash2, Plus } from "lucide-react"
import { PLATFORM_ORDER, PLATFORM_META, type Platform } from "@/lib/platforms"
import { PlatformBadge } from "./platforms"

export interface QueueSlotSummary {
  id: string
  dayOfWeek: number
  timeOfDay: string
  platform: Platform
  active: boolean
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatTimeOfDay(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d)
}

interface QueueSettingsPanelProps {
  slots: QueueSlotSummary[]
  formOpen: boolean
  onStartNew: () => void
  onStartEdit: (slot: QueueSlotSummary) => void
  onCancelForm: () => void
  editingId: string | null
  day: number
  onDayChange: (d: number) => void
  time: string
  onTimeChange: (t: string) => void
  platform: Platform
  onPlatformChange: (p: Platform) => void
  submitting: boolean
  error: string | null
  onSubmit: () => void
  onToggleActive: (slot: QueueSlotSummary) => void
  onDelete: (id: string) => void
}

export function QueueSettingsPanel({
  slots,
  formOpen,
  onStartNew,
  onStartEdit,
  onCancelForm,
  editingId,
  day,
  onDayChange,
  time,
  onTimeChange,
  platform,
  onPlatformChange,
  submitting,
  error,
  onSubmit,
  onToggleActive,
  onDelete,
}: QueueSettingsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#6B7280] leading-[1.5]">
        Set preset times you like to post. When you choose &quot;Add to Queue&quot; on a new post, it fills the
        next empty slot below instead of you picking a time manually.
      </p>

      {slots.length > 0 && (
        <div className="flex flex-col gap-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className={[
                "flex items-center gap-3 p-3 rounded-xl border bg-white transition-colors",
                slot.active ? "border-[#E5E3DE]" : "border-[#E5E3DE] opacity-60",
              ].join(" ")}
            >
              <PlatformBadge platform={slot.platform} />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <p className="text-[13px] font-medium text-[#0A0A0A] truncate">
                  {DAY_ABBR[slot.dayOfWeek]} · {formatTimeOfDay(slot.timeOfDay)}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">{PLATFORM_META[slot.platform].label}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onToggleActive(slot)}
                  title={slot.active ? "Pause" : "Resume"}
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
                >
                  {slot.active ? <Pause size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
                </button>
                <button
                  onClick={() => onStartEdit(slot)}
                  title="Edit"
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
                >
                  <Pencil size={13} strokeWidth={2} />
                </button>
                <button
                  onClick={() => onDelete(slot.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!formOpen ? (
        <button
          onClick={onStartNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)] hover:bg-[rgba(124,58,237,0.08)] text-[13px] font-medium text-[#7C3AED] transition-colors"
        >
          <Plus size={14} strokeWidth={2.2} />
          New Queue Slot
        </button>
      ) : (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-white">
          <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">
            {editingId ? "Edit slot" : "New slot"}
          </p>

          <div className="flex items-center gap-1">
            {DAY_ABBR.map((label, d) => (
              <button
                key={d}
                onClick={() => onDayChange(d)}
                className={[
                  "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                  day === d ? "bg-[#7C3AED] text-white" : "bg-[#F4F2EC] text-[#9CA3AF] hover:text-[#4B5563]",
                ].join(" ")}
              >
                {label[0]}
              </button>
            ))}
          </div>

          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
          />

          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value as Platform)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
          >
            {PLATFORM_ORDER.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_META[p].label}
                {!PLATFORM_META[p].functional ? " (not connected yet)" : ""}
              </option>
            ))}
          </select>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
              ) : editingId ? (
                "Save Slot"
              ) : (
                "Add Slot"
              )}
            </button>
            <button
              onClick={onCancelForm}
              className="px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
