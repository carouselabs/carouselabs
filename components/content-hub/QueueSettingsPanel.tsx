"use client"

// Content Hub "Queue Settings" — preset (day, time, platform) slots that
// "Add to Queue" assigns new posts to automatically (see lib/queue.ts). One
// slot = one day, unlike Recurring Slots' multi-day rows — see
// prisma/schema.prisma's QueueSlot comment for why these are kept separate.
import { useState } from "react"
import { Loader2, Pause, Play, Pencil, Trash2, Plus, Shuffle, PauseCircle } from "lucide-react"
import { PLATFORM_ORDER, PLATFORM_META, type Platform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PlatformBadge } from "./platforms"
import { fieldClasses, iconAction } from "./hubStyles"

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
  onPauseAll: () => Promise<number>
  onShuffle: () => Promise<number>
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
  onPauseAll,
  onShuffle,
}: QueueSettingsPanelProps) {
  const [pausingAll, setPausingAll] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function handlePauseAll() {
    setPausingAll(true)
    setActionMessage(null)
    try {
      const count = await onPauseAll()
      setActionMessage(count > 0 ? `Paused ${count} slot${count === 1 ? "" : "s"}` : "No active slots to pause")
    } finally {
      setPausingAll(false)
    }
  }

  async function handleShuffle() {
    setShuffling(true)
    setActionMessage(null)
    try {
      const count = await onShuffle()
      setActionMessage(count > 0 ? `Shuffled ${count} queued post${count === 1 ? "" : "s"}` : "Nothing to shuffle yet")
    } finally {
      setShuffling(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-label text-muted-foreground">
        Set preset times you like to post. When you choose &quot;Add to Queue&quot; on a new post, it fills the
        next empty slot below instead of you picking a time manually.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handlePauseAll()}
          disabled={pausingAll || slots.every((s) => !s.active)}
        >
          {pausingAll ? <Loader2 className="animate-spin" aria-hidden /> : <PauseCircle aria-hidden />}
          Pause All Queues
        </Button>
        <Button variant="outline" size="sm" onClick={() => void handleShuffle()} disabled={shuffling}>
          {shuffling ? <Loader2 className="animate-spin" aria-hidden /> : <Shuffle aria-hidden />}
          Shuffle
        </Button>
      </div>
      {actionMessage && (
        <p role="status" className="text-caption text-muted-foreground">
          {actionMessage}
        </p>
      )}

      {slots.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface-raised">
          {slots.map((slot) => (
            <li key={slot.id} className={cn("flex items-center gap-3 px-3 py-2.5", !slot.active && "opacity-60")}>
              <PlatformBadge platform={slot.platform} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-label font-medium text-foreground tabular-nums">
                  {DAY_ABBR[slot.dayOfWeek]} · {formatTimeOfDay(slot.timeOfDay)}
                </p>
                <p className="text-caption text-muted-foreground">{PLATFORM_META[slot.platform].label}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onToggleActive(slot)}
                  title={slot.active ? "Pause" : "Resume"}
                  aria-label={slot.active ? "Pause" : "Resume"}
                  className={iconAction}
                >
                  {slot.active ? <Pause aria-hidden /> : <Play aria-hidden />}
                </button>
                <button type="button" onClick={() => onStartEdit(slot)} title="Edit" aria-label="Edit" className={iconAction}>
                  <Pencil aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(slot.id)}
                  title="Delete"
                  aria-label="Delete"
                  className={cn(iconAction, "hover:bg-danger-soft hover:text-danger")}
                >
                  <Trash2 aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!formOpen ? (
        <Button variant="outline" onClick={onStartNew} className="border-dashed border-brand/40 text-brand hover:bg-brand-soft">
          <Plus aria-hidden />
          New Queue Slot
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-4">
          <h3 className="text-label font-semibold text-foreground">{editingId ? "Edit slot" : "New slot"}</h3>

          <div role="group" aria-label="Day" className="grid grid-cols-7 gap-1">
            {DAY_ABBR.map((label, d) => (
              <button
                key={d}
                type="button"
                aria-pressed={day === d}
                aria-label={label}
                onClick={() => onDayChange(d)}
                className="h-9 rounded-control-sm bg-surface-muted text-caption font-semibold text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-brand aria-pressed:text-brand-foreground"
              >
                {label[0]}
              </button>
            ))}
          </div>

          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            aria-label="Time"
            className={fieldClasses}
          />

          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value as Platform)}
            aria-label="Platform"
            className={fieldClasses}
          >
            {PLATFORM_ORDER.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_META[p].label}
                {!PLATFORM_META[p].functional ? " (not connected yet)" : ""}
              </option>
            ))}
          </select>

          {error && (
            <p role="alert" className="rounded-control-sm border border-danger/25 bg-danger-soft px-3 py-2 text-caption text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button variant="brand" className="flex-1" onClick={onSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : editingId ? (
                "Save Slot"
              ) : (
                "Add Slot"
              )}
            </Button>
            <Button variant="ghost" onClick={onCancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
