"use client"

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import NextLink from "next/link"
import {
  Plus,
  List as ListIcon,
  CalendarRange,
  Calendar as CalendarIcon,
  Search,
  ImageIcon,
  X,
  Loader2,
  Trash2,
  Pencil,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Repeat,
  Pause,
  Play,
  ListOrdered,
  Lightbulb,
  LibraryBig,
  Tag,
  Copy,
  UploadCloud,
} from "lucide-react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { PLATFORM_META, PLATFORM_ORDER, validatePostForPlatform, type Platform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { BackButton, ChoiceCard, FieldLabel } from "@/components/create/CreateKit"
import { PlatformBadge } from "@/components/content-hub/platforms"
import { fieldClasses, iconAction } from "@/components/content-hub/hubStyles"
import { CustomPostComposer } from "@/components/content-hub/CustomPostComposer"
import { PlatformPreview } from "@/components/content-hub/PlatformPreview"
import { BulkUploadPanel } from "@/components/content-hub/BulkUploadPanel"
import { QueueSettingsPanel, type QueueSlotSummary } from "@/components/content-hub/QueueSettingsPanel"
import {
  LibraryPanel,
  type PostTemplateSummary,
  type PostTagSummary,
  type HashtagGroupSummary,
  type ShortLinkSummary,
} from "@/components/content-hub/LibraryPanel"

// ── Shared shapes (mirror the API routes) ──────────────────────────
type ScheduledStatus =
  | "draft"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled"
  | "pending_connection"
type PostFormat = "CAROUSEL" | "SINGLE_IMAGE" | "TEXT_ONLY" | "THUMBNAIL" | "CUSTOM"

interface PostSummary {
  id: string
  title: string
  caption: string | null
  format: PostFormat
  imageUrls: string[]
  // Only populated by /api/content-hub/scheduled (not the plain "pick
  // content" picker) — see Step 3's tag display.
  tags?: { id: string; name: string; color: string }[]
}

interface ScheduledItem {
  id: string
  postId: string
  platform: Platform
  scheduledFor: string
  status: ScheduledStatus
  publishedUrl: string | null
  failureReason: string | null
  post: PostSummary
}

interface PickablePost extends PostSummary {
  createdAt: string
}

// Just the fields openNewPanelForBoardItem needs from GET /api/ideas-board —
// the full shape lives in app/(app)/content-hub/ideas/page.tsx.
interface IdeaBoardItemLite {
  id: string
  type: "link" | "image" | "note"
  content: string
  title: string | null
}

interface SuggestionSlot {
  datetime: string
  label: string
  why: string
}

interface TodaySuggestion {
  datetime: string
  chipLabel: string
  why: string
}

interface RecurringSlotSummary {
  id: string
  label: string
  daysOfWeek: number[]
  timeOfDay: string
  platform: Platform
  active: boolean
}

type View = "list" | "week" | "month" | "drafts"
type PanelState =
  | { mode: "new" }
  | { mode: "edit"; item: ScheduledItem }
  | { mode: "day"; date: Date }
  | { mode: "recurring" }
  | { mode: "queue" }
  | { mode: "library" }
  | { mode: "bulk" }
  | null

const FORMAT_LABELS: Record<PostFormat, string> = {
  CAROUSEL: "Carousel",
  SINGLE_IMAGE: "Image",
  TEXT_ONLY: "Text",
  THUMBNAIL: "Thumbnail",
  CUSTOM: "Custom",
}

const STATUS_LABEL: Record<ScheduledStatus, string> = {
  draft: "Draft",
  queued: "Scheduled",
  publishing: "Publishing…",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
  pending_connection: "Pending connection",
}

// A failed request can come back with an empty or non-JSON body (a server
// error page, a dropped connection), and res.json() then throws the
// meaningless "Unexpected end of JSON input". Read bodies defensively: an
// unreadable body is just an empty object, and the caller's res.ok check
// turns it into a proper error message.
async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day // Monday-start
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Always 6 full weeks (42 days) starting on the Monday on/before the 1st —
// comfortably covers every month's grid without per-month length math.
function getMonthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// A draft's scheduledFor is just a placeholder time (see handleSchedule),
// never a real commitment, so it's excluded from both the calendar and the
// List view's date-grouped sections — drafts only ever show in the Drafts tab.
function itemsForDay(items: ScheduledItem[], day: Date): ScheduledItem[] {
  return items
    .filter(
      (s) => s.status !== "cancelled" && s.status !== "draft" && isSameDay(new Date(s.scheduledFor), day),
    )
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
}

function recurringSlotsForDay(slots: RecurringSlotSummary[], day: Date): RecurringSlotSummary[] {
  const dow = day.getDay()
  return slots.filter((s) => s.active && s.daysOfWeek.includes(dow))
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Monday-first display order regardless of storage order.
function formatDaysOfWeek(days: number[]): string {
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
  return sorted.map((d) => DAY_ABBR[d]).join(", ")
}

function formatTimeOfDay(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d)
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

// "YYYY-MM-DD" / "HH:mm" in the BROWSER's local time, for native date/time inputs.
function isoToLocalInputs(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function defaultInputs(): { date: string; time: string } {
  const in1h = new Date(Date.now() + 60 * 60 * 1000)
  return isoToLocalInputs(in1h.toISOString())
}

const EMPTY_BANNER_KEY = "content-hub-empty-banner-dismissed"

// ── Render helpers (top-level — never re-created during a parent render) ──
const STATUS_DOT_CLASS: Record<ScheduledStatus, string> = {
  draft: "bg-muted-foreground",
  queued: "bg-brand",
  publishing: "bg-brand",
  published: "bg-success",
  failed: "bg-danger",
  cancelled: "bg-border",
  pending_connection: "bg-warning",
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" })
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short" })
const fullDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" })

function StatusDot({ status, className }: { status: ScheduledStatus; className?: string }) {
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[status], className)} />
}

function Thumbnail({ post, size = 48 }: { post: PostSummary; size?: number }) {
  const src = post.imageUrls[0]
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-control-sm border border-border bg-surface-muted"
      style={{ width: size, height: size }}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
      )}
    </div>
  )
}

/** The date in the agenda's left margin — the hub's one big typographic moment. */
function DayMark({ date }: { date: Date }) {
  const isToday = isSameDay(date, new Date())
  return (
    <div className="flex flex-col items-start pt-0.5 sm:sticky sm:top-0 sm:self-start">
      <span
        className={cn(
          "font-display text-[2.5rem] leading-[0.9] tracking-[-0.02em] tabular-nums sm:text-[3rem]",
          isToday ? "text-brand" : "text-foreground"
        )}
      >
        {date.getDate()}
      </span>
      <span className="mt-1.5 text-caption font-medium text-foreground">{weekdayFormat.format(date)}</span>
      <span className="text-caption text-muted-foreground">{monthFormat.format(date)}</span>
    </div>
  )
}

function ScheduledRow({
  item,
  onReschedule,
  onRemove,
  onDuplicate,
  isRemoving = false,
  isDuplicating = false,
  selected = false,
  timeOnly = false,
}: {
  item: ScheduledItem
  onReschedule: (item: ScheduledItem) => void
  onRemove: (item: ScheduledItem) => void
  onDuplicate: (item: ScheduledItem) => void
  isRemoving?: boolean
  isDuplicating?: boolean
  /** Open in the side panel right now. */
  selected?: boolean
  /** The agenda already shows the day, so the row only needs the time. */
  timeOnly?: boolean
}) {
  const editable = item.status === "queued" || item.status === "failed" || item.status === "draft"
  const text = item.post.caption?.slice(0, 80) || item.post.title
  const when = timeOnly ? timeFormat.format(new Date(item.scheduledFor)) : formatDateTime(item.scheduledFor)
  return (
    <div
      aria-current={selected || undefined}
      className={cn(
        "group relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-card p-3 transition-colors duration-(--motion-fast) hover:bg-surface-raised sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4",
        selected && "bg-surface-raised shadow-card"
      )}
    >
      {selected && <span aria-hidden className="absolute inset-y-3 -left-px w-0.5 rounded-full bg-brand" />}
      <div className="row-span-2 sm:row-span-1">
        <Thumbnail post={item.post} size={52} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <StatusDot status={item.status} />
            {STATUS_LABEL[item.status]}
          </span>
          <span title={PLATFORM_META[item.platform].label}>
            <PlatformBadge platform={item.platform} size={18} />
          </span>
          <span className="text-muted-foreground tabular-nums">
            {when} · {FORMAT_LABELS[item.post.format]}
          </span>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() => onReschedule(item)}
            className="line-clamp-2 rounded-detail text-left text-label font-medium text-foreground transition-colors duration-(--motion-fast) hover:text-brand"
          >
            {text}
          </button>
        ) : (
          <p className="line-clamp-2 text-label font-medium text-foreground">{text}</p>
        )}
        {item.post.tags && item.post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.post.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
        {item.status === "failed" && item.failureReason && (
          <p className="text-caption text-danger">{item.failureReason}</p>
        )}
        {item.status === "pending_connection" && (
          <p className="text-caption text-warning">
            Pending — connect {PLATFORM_META[item.platform].label} to publish here
          </p>
        )}
      </div>
      {/* Below the text on phones, at the row's end from tablet up (shown on hover there) */}
      <div
        className={cn(
          "col-start-2 -ml-2 flex items-center gap-0.5 transition-opacity duration-(--motion-fast) sm:col-start-3 sm:row-start-1 sm:ml-0",
          !selected && "lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
        )}
      >
        {item.status === "published" && item.publishedUrl && (
          <a
            href={item.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={iconAction}
            title="View post"
            aria-label="View post"
          >
            <ExternalLink aria-hidden />
          </a>
        )}
        {editable && (
          <button
            type="button"
            onClick={() => onReschedule(item)}
            className={iconAction}
            title={item.status === "draft" ? "Schedule" : "Reschedule"}
            aria-label={item.status === "draft" ? "Schedule" : "Reschedule"}
          >
            <Pencil aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDuplicate(item)}
          disabled={isDuplicating}
          className={iconAction}
          title="Duplicate"
          aria-label="Duplicate"
        >
          {isDuplicating ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
        </button>
        {!(item.status === "published" && item.publishedUrl) && (
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={isRemoving}
            className={cn(iconAction, "hover:bg-danger-soft hover:text-danger")}
            title="Remove"
            aria-label="Remove"
          >
            {isRemoving ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
          </button>
        )}
      </div>
    </div>
  )
}

/** One stretch of the agenda (This Week, Next Week…), posts gathered under their day. */
function GroupSection({
  title,
  items,
  onReschedule,
  onRemove,
  onDuplicate,
  removingId,
  duplicatingId,
  selectedId,
}: {
  title: string
  items: ScheduledItem[]
  onReschedule: (item: ScheduledItem) => void
  onRemove: (item: ScheduledItem) => void
  onDuplicate: (item: ScheduledItem) => void
  removingId?: string | null
  duplicatingId?: string | null
  selectedId?: string | null
}) {
  const headingId = useId()
  if (items.length === 0) return null
  // Items arrive sorted, so a day's posts are always next to each other.
  const days: { key: string; date: Date; items: ScheduledItem[] }[] = []
  for (const item of items) {
    const date = new Date(item.scheduledFor)
    const key = date.toDateString()
    const last = days[days.length - 1]
    if (last && last.key === key) last.items.push(item)
    else days.push({ key, date, items: [item] })
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <h2 id={headingId} className="border-b border-foreground/80 pb-2.5 text-body font-semibold text-foreground">
        {title}
      </h2>
      <ol className="flex flex-col divide-y divide-border">
        {days.map((day) => (
          <li
            key={day.key}
            className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4"
          >
            <DayMark date={day.date} />
            <div className="-my-1 flex min-w-0 flex-col gap-1">
              {day.items.map((item) => (
                <ScheduledRow
                  key={item.id}
                  item={item}
                  timeOnly
                  selected={selectedId === item.id}
                  onReschedule={onReschedule}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                  isRemoving={removingId === item.id}
                  isDuplicating={duplicatingId === item.id}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

interface CalendarGridProps {
  scheduled: ScheduledItem[]
  recurringSlots: RecurringSlotSummary[]
  onDayClick: (day: Date) => void
  onItemClick: (item: ScheduledItem) => void
  onDropItem: (itemId: string, day: Date) => void
  onFillRecurring: (day: Date, timeOfDay: string) => void
  /** The day or post open in the side panel, highlighted in the grid. */
  selectedDay?: Date | null
  selectedItemId?: string | null
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function MonthGrid({
  monthAnchor,
  scheduled,
  recurringSlots,
  onDayClick,
  onItemClick,
  onDropItem,
  onFillRecurring,
  selectedDay,
  selectedItemId,
}: CalendarGridProps & { monthAnchor: Date }) {
  const today = new Date()
  const days = useMemo(() => getMonthGridDays(monthAnchor), [monthAnchor])

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-raised">
      <div className="grid grid-cols-7 border-b border-border bg-surface">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="px-1.5 py-2 text-caption font-medium text-muted-foreground sm:px-2.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === monthAnchor.getMonth()
          const items = itemsForDay(scheduled, day)
          const visible = items.slice(0, 3)
          const overflow = items.length - visible.length
          const isToday = isSameDay(day, today)
          const isSelected = !!selectedDay && isSameDay(day, selectedDay)
          const dayRecurring = items.length === 0 ? recurringSlotsForDay(recurringSlots, day) : []

          return (
            <div
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData("text/plain")
                if (id) onDropItem(id, day)
              }}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex min-h-[4.25rem] min-w-0 cursor-pointer flex-col gap-1.5 border-r border-b border-border p-1.5 transition-colors duration-(--motion-fast) hover:bg-brand-soft/40 sm:min-h-[6.5rem] sm:p-2 xl:min-h-[7.25rem] [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
                !inMonth && "bg-surface",
                isSelected && "bg-brand-soft/70 shadow-[inset_0_0_0_1px_var(--brand)]"
              )}
            >
              <button
                type="button"
                aria-label={fullDayFormat.format(day)}
                onClick={(e) => {
                  e.stopPropagation()
                  onDayClick(day)
                }}
                className={cn(
                  "flex flex-col self-start rounded-detail font-display text-[1.25rem] leading-none tabular-nums sm:text-[1.625rem]",
                  isToday ? "text-brand" : inMonth ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {day.getDate()}
                {isToday && <span aria-hidden className="mt-1 h-0.5 w-full rounded-full bg-brand" />}
              </button>
              <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                {visible.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation()
                      e.dataTransfer.setData("text/plain", item.id)
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onItemClick(item)
                    }}
                    className={cn(
                      "flex w-full min-w-0 cursor-grab items-center gap-1.5 rounded-detail bg-surface px-1.5 py-1 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted active:cursor-grabbing",
                      selectedItemId === item.id && "bg-brand-soft shadow-[inset_0_0_0_1px_var(--brand)]"
                    )}
                  >
                    <StatusDot status={item.status} />
                    <span className="size-4 shrink-0 overflow-hidden rounded-[4px] bg-surface-muted">
                      {item.post.imageUrls[0] && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.post.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{item.post.title}</span>
                  </button>
                ))}
                {overflow > 0 && <span className="pl-1 text-[11px] text-muted-foreground">+{overflow} more</span>}
                {items.length === 0 && dayRecurring.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFillRecurring(day, dayRecurring[0].timeOfDay)
                    }}
                    className="rounded-detail border border-dashed border-brand/40 px-1.5 py-1 text-left text-[11px] leading-tight text-brand transition-colors duration-(--motion-fast) hover:bg-brand-soft"
                  >
                    Recurring — tap to fill
                  </button>
                )}
              </div>
              {/* Phones: a dot per post; the day opens the full list. */}
              <div className="flex flex-wrap items-center gap-1 sm:hidden">
                {items.slice(0, 4).map((item) => (
                  <StatusDot key={item.id} status={item.status} />
                ))}
                {items.length === 0 && dayRecurring.length > 0 && (
                  <button
                    type="button"
                    aria-label="Recurring — tap to fill"
                    title="Recurring — tap to fill"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFillRecurring(day, dayRecurring[0].timeOfDay)
                    }}
                    className="relative size-3 rounded-full border border-dashed border-brand after:absolute after:-inset-2 after:content-['']"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekGrid({
  weekAnchor,
  scheduled,
  recurringSlots,
  onDayClick,
  onItemClick,
  onDropItem,
  onFillRecurring,
  selectedDay,
  selectedItemId,
}: CalendarGridProps & { weekAnchor: Date }) {
  const today = new Date()
  const days = useMemo(() => getWeekDays(weekAnchor), [weekAnchor])

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day, i) => {
        const items = itemsForDay(scheduled, day)
        const isToday = isSameDay(day, today)
        const isSelected = !!selectedDay && isSameDay(day, selectedDay)
        const dayRecurring = items.length === 0 ? recurringSlotsForDay(recurringSlots, day) : []

        return (
          <div
            key={i}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData("text/plain")
              if (id) onDropItem(id, day)
            }}
            className={cn(
              "flex min-w-0 gap-3 rounded-card border border-border bg-surface-raised p-2.5 md:min-h-[15rem] md:flex-col md:gap-2",
              isToday && "border-brand/40",
              isSelected && "bg-brand-soft/60 shadow-[inset_0_0_0_1px_var(--brand)]"
            )}
          >
            <button
              type="button"
              onClick={() => onDayClick(day)}
              aria-label={fullDayFormat.format(day)}
              className="flex w-12 shrink-0 flex-col items-start gap-1 self-start rounded-detail md:w-full md:flex-row md:items-baseline md:justify-between md:border-b md:border-border md:pb-2"
            >
              <span className="text-caption font-medium text-muted-foreground">{weekdayFormat.format(day)}</span>
              <span
                className={cn(
                  "font-display text-[1.75rem] leading-none tabular-nums",
                  isToday ? "text-brand" : "text-foreground"
                )}
              >
                {day.getDate()}
              </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                  onClick={() => onItemClick(item)}
                  className={cn(
                    "flex min-w-0 cursor-grab items-center gap-2 rounded-control-sm bg-surface p-1.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted active:cursor-grabbing md:flex-col md:items-stretch",
                    selectedItemId === item.id && "bg-brand-soft shadow-[inset_0_0_0_1px_var(--brand)]"
                  )}
                >
                  <span className="order-first size-10 shrink-0 overflow-hidden rounded-detail bg-surface-muted md:order-last md:aspect-square md:size-auto md:w-full">
                    {item.post.imageUrls[0] && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.post.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <StatusDot status={item.status} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {timeFormat.format(new Date(item.scheduledFor))}
                    </span>
                    <PlatformBadge platform={item.platform} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-caption text-foreground md:hidden">{item.post.title}</span>
                </button>
              ))}
              {items.length === 0 && dayRecurring.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFillRecurring(day, dayRecurring[0].timeOfDay)}
                  className="flex-1 rounded-control-sm border border-dashed border-brand/40 px-2 py-3 text-[11px] leading-tight text-brand transition-colors duration-(--motion-fast) hover:bg-brand-soft"
                >
                  Recurring — tap to fill
                </button>
              )}
              {items.length === 0 && dayRecurring.length === 0 && (
                <button
                  type="button"
                  onClick={() => onDayClick(day)}
                  className="flex min-h-10 flex-1 items-center rounded-control-sm px-2 text-caption text-muted-foreground/70 transition-colors duration-(--motion-fast) hover:bg-surface hover:text-brand md:justify-center"
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Where the new-post flow is: three segments under the panel's title. */
function StepBar({ step, skipped }: { step: 1 | 2 | 3; skipped?: boolean }) {
  return (
    <div aria-hidden className="grid shrink-0 grid-cols-3 gap-1 px-5 pt-4">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1 rounded-full transition-colors duration-(--motion-base)",
            n <= step ? "bg-brand" : "bg-surface-muted",
            skipped && n === 2 && step === 3 && "bg-brand/40"
          )}
        />
      ))}
    </div>
  )
}

function StepHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-label font-semibold text-foreground">{children}</h3>
}

export function ContentHubClient({
  initialPostId,
  initialBoardItemId,
}: {
  initialPostId?: string
  initialBoardItemId?: string
}) {
  const { user } = useCurrentUser()

  const [view, setView] = useState<View>("list")
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([])
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlotSummary[]>([])
  const [cursorDate, setCursorDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState<TodaySuggestion | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return true // SSR pass — resolved on the client below
    try {
      return sessionStorage.getItem(EMPTY_BANNER_KEY) === "1"
    } catch {
      return false
    }
  })

  const [panel, setPanel] = useState<PanelState>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Panel — step 1 (choose content source, then either pick existing content
  // or fill out the Custom Post composer)
  const [contentSource, setContentSource] = useState<"pick" | "custom" | null>(null)
  const [pickablePosts, setPickablePosts] = useState<PickablePost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postSearch, setPostSearch] = useState("")
  const [selectedPost, setSelectedPost] = useState<PostSummary | null>(null)

  // Panel — Custom Post composer state (contentSource === "custom")
  const [customCaption, setCustomCaption] = useState("")
  const [customImages, setCustomImages] = useState<string[]>([])
  const [customPlatforms, setCustomPlatforms] = useState<Platform[]>([])
  const [customizePerPlatform, setCustomizePerPlatform] = useState(false)
  const [customPlatformCaptions, setCustomPlatformCaptions] = useState<Partial<Record<Platform, string>>>({})

  // Panel — step 2 (pick platform)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [linkedInConnected, setLinkedInConnected] = useState<boolean | null>(null)

  // Panel — step 3 (date/time)
  const [dateValue, setDateValue] = useState("")
  const [timeValue, setTimeValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  // Distinguishes which of the two footer buttons (Schedule vs. Save as
  // Draft) is the one in flight, so only the clicked button shows its own
  // spinner/text-change while `submitting` disables both.
  const [savingAsDraft, setSavingAsDraft] = useState(false)
  // Which scheduled item's Remove is currently in flight — a real DELETE
  // (not optimistic), so the clicked row/button needs its own loading state.
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionSlot[]>([])

  // Panel — recurring slots settings
  const [recurringFormOpen, setRecurringFormOpen] = useState(false)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [slotLabel, setSlotLabel] = useState("")
  const [slotDays, setSlotDays] = useState<number[]>([])
  const [slotTime, setSlotTime] = useState("09:00")
  const [slotPlatform, setSlotPlatform] = useState<Platform>("linkedin")
  const [slotSubmitting, setSlotSubmitting] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  // Panel — queue settings (Buffer-style posting queue, see lib/queue.ts)
  const [queueSlots, setQueueSlots] = useState<QueueSlotSummary[]>([])
  const [queueFormOpen, setQueueFormOpen] = useState(false)
  const [editingQueueSlotId, setEditingQueueSlotId] = useState<string | null>(null)
  const [queueDay, setQueueDay] = useState(1)
  const [queueTime, setQueueTime] = useState("09:00")
  const [queuePlatform, setQueuePlatform] = useState<Platform>("linkedin")
  const [queueSubmitting, setQueueSubmitting] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  // "Add to Queue" is its own footer button, distinct from Schedule/Save as
  // Draft, so it needs its own in-flight flag (mirrors savingAsDraft).
  const [addingToQueue, setAddingToQueue] = useState(false)

  // Library (Templates / Tags / Hashtag Groups) — loaded once and shared
  // between the management panel and the composer/Step-3 pickers.
  const [templates, setTemplates] = useState<PostTemplateSummary[]>([])
  const [tags, setTags] = useState<PostTagSummary[]>([])
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroupSummary[]>([])
  const [shortLinks, setShortLinks] = useState<ShortLinkSummary[]>([])
  // Step 3 — tags to assign to the post being scheduled (shared by both the
  // pick-existing and custom flows).
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  // Step 3 preview — which platform's tab is active, when more than one is
  // selected (custom flow). Derived-with-override rather than reset-on-open
  // state: falls back to the first selected platform whenever the override
  // doesn't match one of the currently selected platforms.
  const [previewPlatformOverride, setPreviewPlatformOverride] = useState<Platform | null>(null)

  useEffect(() => {
    void refreshScheduled()
    void loadSuggestion()
    void loadRecurringSlots()
    void loadQueueSlots()
    void loadTemplates()
    void loadTags()
    void loadHashtagGroups()
    void loadShortLinks()
    // Deep-link from a generation result's "Schedule for Later" button —
    // open straight into the Add panel with that post pre-selected.
    if (initialPostId) void openNewPanelForPost(initialPostId)
    // Deep-link from Ideas Board's "Turn into Post" — open straight into the
    // Custom Post composer, pre-filled with that saved item's content.
    if (initialBoardItemId) void openNewPanelForBoardItem(initialBoardItemId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshScheduled() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/content-hub/scheduled")
      const data = await readJson(res)
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ??
            "Couldn't load your scheduled posts. Check your connection and try again.",
        )
      }
      setScheduled((data as { scheduled?: ScheduledItem[] }).scheduled ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function loadSuggestion() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/content-hub/suggestions?tz=${encodeURIComponent(tz)}`)
      if (!res.ok) return
      const data = await readJson(res)
      setToday((data as { today: TodaySuggestion | null }).today)
      setSuggestions((data as { suggestions: SuggestionSlot[] }).suggestions ?? [])
    } catch {
      // best-effort — the chip/quick-picks just don't render
    }
  }

  async function loadRecurringSlots() {
    try {
      const res = await fetch("/api/content-hub/recurring")
      const data = await readJson(res)
      if (res.ok) setRecurringSlots((data as { slots: RecurringSlotSummary[] }).slots)
    } catch {
      // best-effort — calendar just shows no recurring placeholders
    }
  }

  async function loadQueueSlots() {
    try {
      const res = await fetch("/api/content-hub/queue")
      const data = await readJson(res)
      if (res.ok) setQueueSlots((data as { slots: QueueSlotSummary[] }).slots)
    } catch {
      // best-effort — "Add to Queue" just surfaces its own error on click
    }
  }

  // ── Library: Templates / Tags / Hashtag Groups ───────────────────────
  async function loadTemplates() {
    try {
      const res = await fetch("/api/post-templates")
      const data = await readJson(res)
      if (res.ok) setTemplates((data as { templates: PostTemplateSummary[] }).templates)
    } catch {
      // best-effort
    }
  }

  async function loadTags() {
    try {
      const res = await fetch("/api/post-tags")
      const data = await readJson(res)
      if (res.ok) setTags((data as { tags: PostTagSummary[] }).tags)
    } catch {
      // best-effort
    }
  }

  async function loadHashtagGroups() {
    try {
      const res = await fetch("/api/hashtag-groups")
      const data = await readJson(res)
      if (res.ok) setHashtagGroups((data as { groups: HashtagGroupSummary[] }).groups)
    } catch {
      // best-effort
    }
  }

  async function createTemplate(name: string, caption: string) {
    const res = await fetch("/api/post-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, caption }),
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save template")
    setTemplates((prev) => [(data as { template: PostTemplateSummary }).template, ...prev])
  }

  async function deleteTemplate(id: string) {
    const snapshot = templates
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    try {
      const res = await fetch(`/api/post-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setTemplates(snapshot)
    }
  }

  async function createTag(name: string, color: string) {
    const res = await fetch("/api/post-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to create tag")
    setTags((prev) => [...prev, (data as { tag: PostTagSummary }).tag].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function deleteTag(id: string) {
    const snapshot = tags
    setTags((prev) => prev.filter((t) => t.id !== id))
    setSelectedTagIds((prev) => prev.filter((t) => t !== id))
    if (tagFilter === id) setTagFilter(null)
    try {
      const res = await fetch(`/api/post-tags/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setTags(snapshot)
    }
  }

  async function createHashtagGroup(name: string, hashtags: string[]) {
    const res = await fetch("/api/hashtag-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, hashtags }),
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save group")
    setHashtagGroups((prev) =>
      [...prev, (data as { group: HashtagGroupSummary }).group].sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  async function deleteHashtagGroup(id: string) {
    const snapshot = hashtagGroups
    setHashtagGroups((prev) => prev.filter((g) => g.id !== id))
    try {
      const res = await fetch(`/api/hashtag-groups/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setHashtagGroups(snapshot)
    }
  }

  async function loadShortLinks() {
    try {
      const res = await fetch("/api/short-links")
      const data = await readJson(res)
      if (res.ok) setShortLinks((data as { links: ShortLinkSummary[] }).links)
    } catch {
      // best-effort
    }
  }

  async function createShortLink(
    targetUrl: string,
    utm: { source?: string; medium?: string; campaign?: string },
  ): Promise<ShortLinkSummary> {
    const res = await fetch("/api/short-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl, utmSource: utm.source, utmMedium: utm.medium, utmCampaign: utm.campaign }),
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to shorten link")
    const link = (data as { link: ShortLinkSummary }).link
    setShortLinks((prev) => [link, ...prev])
    return link
  }

  async function deleteShortLink(id: string) {
    const snapshot = shortLinks
    setShortLinks((prev) => prev.filter((l) => l.id !== id))
    try {
      const res = await fetch(`/api/short-links/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setShortLinks(snapshot)
    }
  }

  // Used by the Custom Post composer's "Insert Short Link" / paste-auto-
  // shorten — creates the ShortLink then returns the full carouselabs.com/l/
  // URL to insert into the caption.
  async function shortenUrlForCaption(
    url: string,
    utm: { source?: string; medium?: string; campaign?: string },
  ): Promise<string> {
    const link = await createShortLink(url, utm)
    return `${window.location.origin}/l/${link.slug}`
  }

  function openLibraryPanel() {
    setPanel({ mode: "library" })
  }

  function toggleSelectedTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  // ── Recurring slots settings ────────────────────────────────────
  function resetSlotForm() {
    setSlotLabel("")
    setSlotDays([])
    setSlotTime("09:00")
    setSlotPlatform("linkedin")
    setSlotError(null)
  }

  function openRecurringPanel() {
    setPanel({ mode: "recurring" })
    setRecurringFormOpen(false)
    setEditingSlotId(null)
    resetSlotForm()
  }

  function startNewSlot() {
    resetSlotForm()
    setEditingSlotId(null)
    setRecurringFormOpen(true)
  }

  function startEditSlot(slot: RecurringSlotSummary) {
    setSlotLabel(slot.label)
    setSlotDays(slot.daysOfWeek)
    setSlotTime(slot.timeOfDay)
    setSlotPlatform(slot.platform)
    setSlotError(null)
    setEditingSlotId(slot.id)
    setRecurringFormOpen(true)
  }

  function toggleSlotDay(d: number) {
    setSlotDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function submitSlotForm() {
    if (slotDays.length === 0) {
      setSlotError("Pick at least one day")
      return
    }
    setSlotSubmitting(true)
    setSlotError(null)
    try {
      if (editingSlotId) {
        const res = await fetch(`/api/content-hub/recurring/${editingSlotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: slotLabel || "Recurring post",
            daysOfWeek: slotDays,
            timeOfDay: slotTime,
            platform: slotPlatform,
          }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update slot")
      } else {
        const res = await fetch("/api/content-hub/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: slotLabel || "Recurring post",
            daysOfWeek: slotDays,
            timeOfDay: slotTime,
            platform: slotPlatform,
          }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to create slot")
      }
      setRecurringFormOpen(false)
      await loadRecurringSlots()
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSlotSubmitting(false)
    }
  }

  async function toggleSlotActive(slot: RecurringSlotSummary) {
    setRecurringSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, active: !s.active } : s)))
    try {
      const res = await fetch(`/api/content-hub/recurring/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !slot.active }),
      })
      if (!res.ok) throw new Error()
    } catch {
      await loadRecurringSlots() // revert to server truth on failure
    }
  }

  async function deleteSlot(id: string) {
    const snapshot = recurringSlots
    setRecurringSlots((prev) => prev.filter((s) => s.id !== id))
    try {
      const res = await fetch(`/api/content-hub/recurring/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setRecurringSlots(snapshot)
    }
  }

  // ── Queue settings (mirrors the recurring-slot handlers above) ──
  function resetQueueForm() {
    setQueueDay(1)
    setQueueTime("09:00")
    setQueuePlatform("linkedin")
    setQueueError(null)
  }

  function openQueuePanel() {
    setPanel({ mode: "queue" })
    setQueueFormOpen(false)
    setEditingQueueSlotId(null)
    resetQueueForm()
  }

  function startNewQueueSlot() {
    resetQueueForm()
    setEditingQueueSlotId(null)
    setQueueFormOpen(true)
  }

  function startEditQueueSlot(slot: QueueSlotSummary) {
    setQueueDay(slot.dayOfWeek)
    setQueueTime(slot.timeOfDay)
    setQueuePlatform(slot.platform)
    setQueueError(null)
    setEditingQueueSlotId(slot.id)
    setQueueFormOpen(true)
  }

  async function submitQueueForm() {
    setQueueSubmitting(true)
    setQueueError(null)
    try {
      if (editingQueueSlotId) {
        const res = await fetch(`/api/content-hub/queue/${editingQueueSlotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayOfWeek: queueDay, timeOfDay: queueTime, platform: queuePlatform }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update slot")
      } else {
        const res = await fetch("/api/content-hub/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayOfWeek: queueDay, timeOfDay: queueTime, platform: queuePlatform }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to create slot")
      }
      setQueueFormOpen(false)
      await loadQueueSlots()
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setQueueSubmitting(false)
    }
  }

  async function toggleQueueSlotActive(slot: QueueSlotSummary) {
    setQueueSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, active: !s.active } : s)))
    try {
      const res = await fetch(`/api/content-hub/queue/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !slot.active }),
      })
      if (!res.ok) throw new Error()
    } catch {
      await loadQueueSlots() // revert to server truth on failure
    }
  }

  async function deleteQueueSlot(id: string) {
    const snapshot = queueSlots
    setQueueSlots((prev) => prev.filter((s) => s.id !== id))
    try {
      const res = await fetch(`/api/content-hub/queue/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setQueueSlots(snapshot)
    }
  }

  async function pauseAllQueues(): Promise<number> {
    const res = await fetch("/api/content-hub/queue/pause-all", { method: "POST" })
    const data = await readJson(res)
    await loadQueueSlots()
    return res.ok ? ((data as { paused: number }).paused ?? 0) : 0
  }

  async function shuffleQueue(): Promise<number> {
    const res = await fetch("/api/content-hub/queue/shuffle", { method: "POST" })
    const data = await readJson(res)
    await refreshScheduled()
    return res.ok ? ((data as { shuffled: number }).shuffled ?? 0) : 0
  }

  // ── Calendar navigation ─────────────────────────────────────────
  function goPrev() {
    setCursorDate((d) =>
      view === "month" ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7),
    )
  }
  function goNext() {
    setCursorDate((d) =>
      view === "month" ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7),
    )
  }
  function goToday() {
    setCursorDate(new Date())
  }

  // ── Drag-and-drop reschedule ────────────────────────────────────
  async function handleDropOnDay(itemId: string, day: Date) {
    const item = scheduled.find((s) => s.id === itemId)
    if (!item) return
    const original = new Date(item.scheduledFor)
    const next = new Date(day)
    next.setHours(original.getHours(), original.getMinutes(), 0, 0)
    if (isSameDay(original, next)) return // dropped on its own day — no-op

    const snapshot = scheduled
    setScheduled((prev) => prev.map((s) => (s.id === itemId ? { ...s, scheduledFor: next.toISOString() } : s)))
    try {
      const res = await fetch(`/api/content-hub/scheduled/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: next.toISOString() }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setScheduled(snapshot) // revert on failure
      setError("Failed to reschedule — please try again")
    }
  }

  function dismissBanner() {
    setBannerDismissed(true)
    try {
      sessionStorage.setItem(EMPTY_BANNER_KEY, "1")
    } catch {
      // best-effort
    }
  }

  // ── Panel open/close ────────────────────────────────────────────
  function resetCustomComposer() {
    setContentSource(null)
    setCustomCaption("")
    setCustomImages([])
    setCustomPlatforms([])
    setCustomizePerPlatform(false)
    setCustomPlatformCaptions({})
  }

  function openNewPanel(presetIso?: string) {
    setPanel({ mode: "new" })
    setStep(1)
    setSelectedPost(null)
    setSelectedPlatform(null)
    setPanelError(null)
    resetCustomComposer()
    setSelectedTagIds([])
    const inputs = presetIso ? isoToLocalInputs(presetIso) : defaultInputs()
    setDateValue(inputs.date)
    setTimeValue(inputs.time)
    setPostSearch("")
    void loadPickablePosts()
    if (linkedInConnected === null) void checkLinkedIn()
  }

  // Entry point for the Step 1 choice screen — "Pick from your generated
  // content" vs. "Create a Custom Post". Picking "custom" pre-checks LinkedIn
  // (the only functional platform) since it's the overwhelmingly common case.
  function chooseContentSource(source: "pick" | "custom") {
    setContentSource(source)
    setPanelError(null)
    if (source === "custom") {
      setCustomCaption("")
      setCustomImages([])
      setCustomPlatforms(["linkedin"])
      setCustomizePerPlatform(false)
      setCustomPlatformCaptions({})
    }
  }

  function toggleCustomPlatform(platform: Platform) {
    setCustomPlatforms((prev) => (prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]))
  }

  // Custom composer's "Continue" — validates, then hands off to the same
  // date/time + Schedule/Save-as-Draft step (Step 3) used for existing content.
  function continueCustomComposer() {
    if (customPlatforms.length === 0) {
      setPanelError("Pick at least one platform")
      return
    }
    if (!customCaption.trim() && customImages.length === 0) {
      setPanelError("Add a caption or at least one image")
      return
    }
    setPanelError(null)
    setStep(3)
  }

  // Deep-link entry point (see the mount effect above) — opens the "new"
  // flow with a specific post pre-selected, skipping straight to Step 2
  // (platform) once that post is found among the user's pickable content.
  // Mirrors openNewPanel's setup but awaits the load itself instead of
  // firing it off, so it can find the match before rendering.
  async function openNewPanelForPost(postId: string) {
    setPanel({ mode: "new" })
    setStep(1)
    setSelectedPost(null)
    setSelectedPlatform(null)
    setPanelError(null)
    setContentSource("pick")
    setSelectedTagIds([])
    const inputs = defaultInputs()
    setDateValue(inputs.date)
    setTimeValue(inputs.time)
    setPostSearch("")
    if (linkedInConnected === null) void checkLinkedIn()

    const posts = await loadPickablePosts()
    const match = posts.find((p) => p.id === postId)
    if (match) {
      setSelectedPost(match)
      setStep(2)
    }
    // No match (e.g. post not in the most recent 60) — user just lands on
    // the normal Step 1 picker instead, nothing breaks.
  }

  // Deep-link from Ideas Board's "Turn into Post" — jumps straight into the
  // Custom Post composer with a saved item's content pre-filled. An "image"
  // item gets re-hosted to R2 first (see custom-post/upload's sourceUrl
  // mode) so it satisfies the same "every image URL is one of ours"
  // invariant as any other Custom Post image.
  async function openNewPanelForBoardItem(boardItemId: string) {
    setPanel({ mode: "new" })
    setStep(1)
    setPanelError(null)
    resetCustomComposer()
    setContentSource("custom")
    setCustomPlatforms(["linkedin"])
    setSelectedTagIds([])
    const inputs = defaultInputs()
    setDateValue(inputs.date)
    setTimeValue(inputs.time)
    if (linkedInConnected === null) void checkLinkedIn()

    try {
      const res = await fetch("/api/ideas-board")
      const data = await readJson(res)
      if (!res.ok) return
      const items = (data as { items: IdeaBoardItemLite[] }).items
      const item = items.find((i) => i.id === boardItemId)
      if (!item) return // not found — user just lands on an empty composer

      if (item.type === "note") {
        setCustomCaption(item.content)
      } else if (item.type === "link") {
        setCustomCaption(item.title ? `${item.title}\n\n${item.content}` : item.content)
      } else if (item.type === "image") {
        setCustomCaption(item.title ?? "")
        const uploadRes = await fetch("/api/content-hub/custom-post/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl: item.content }),
        })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok) {
          setCustomImages([(uploadData as { url: string }).url])
        } else {
          setPanelError((uploadData as { error?: string }).error ?? "Couldn't re-host that image")
        }
      }
    } catch {
      // best-effort — user just lands on an empty composer if this fails
    }
  }

  function openEditPanel(item: ScheduledItem) {
    setPanel({ mode: "edit", item })
    setStep(3)
    setSelectedPost(item.post)
    setSelectedPlatform(item.platform)
    setPanelError(null)
    setContentSource("pick")
    setSelectedTagIds(item.post.tags?.map((t) => t.id) ?? [])
    const inputs = isoToLocalInputs(item.scheduledFor)
    setDateValue(inputs.date)
    setTimeValue(inputs.time)
  }

  function openDayPanel(date: Date) {
    setPanel({ mode: "day", date })
    setStep(1)
    setSelectedPost(null)
    setSelectedPlatform(null)
    setPanelError(null)
  }

  // Used by both the "Recurring — tap to fill" cards and the day panel's
  // "+ Add here" button — jumps straight to the "new" flow with the date (and
  // optionally the slot's time-of-day) pre-filled.
  function openNewPanelForDay(date: Date, timeOfDay = "09:00") {
    const [h, m] = timeOfDay.split(":").map(Number)
    const preset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h || 9, m || 0)
    openNewPanel(preset.toISOString())
  }

  function closePanel() {
    setPanel(null)
    setPanelError(null)
  }

  async function checkLinkedIn() {
    try {
      const res = await fetch("/api/linkedin/status")
      const data = await readJson(res)
      setLinkedInConnected(Boolean((data as { connected?: boolean }).connected))
    } catch {
      setLinkedInConnected(false)
    }
  }

  async function loadPickablePosts(): Promise<PickablePost[]> {
    setLoadingPosts(true)
    try {
      const res = await fetch("/api/content-hub/posts")
      const data = await readJson(res)
      if (res.ok) {
        const posts = (data as { posts: PickablePost[] }).posts
        setPickablePosts(posts)
        return posts
      }
    } catch {
      // leave whatever was loaded before
    } finally {
      setLoadingPosts(false)
    }
    return pickablePosts
  }

  function selectPost(post: PostSummary) {
    setSelectedPost(post)
    setStep(2)
  }

  function selectPlatform(platform: Platform) {
    if (platform === "instagram") return // gated — see the disabled tile below
    setSelectedPlatform(platform)
    setStep(3)
  }

  // Splits the custom composer's selected platforms into ones whose current
  // content (its own per-platform caption override when customizing, else
  // the shared default caption) passes real platform limits vs. ones with a
  // hard violation — see PLATFORM_LIMITS/validatePostForPlatform in
  // lib/platforms.ts. A platform with a violation is never blocking for the
  // OTHERS: the caller schedules the valid ones and reports the rest as
  // skipped rather than failing the whole action.
  function splitCustomPlatformsByValidation(): { valid: Platform[]; skippedSummary: string | null } {
    const skipped: string[] = []
    const valid: Platform[] = []
    for (const platform of customPlatforms) {
      const effectiveCaption =
        customizePerPlatform && customPlatformCaptions[platform]?.trim()
          ? customPlatformCaptions[platform]!
          : customCaption
      const { valid: ok, errors } = validatePostForPlatform(effectiveCaption, customImages.length, platform)
      if (ok) valid.push(platform)
      else skipped.push(`${PLATFORM_META[platform].label} (${errors.join(", ")})`)
    }
    if (skipped.length === 0) return { valid, skippedSummary: null }
    const skippedText =
      skipped.length === 1
        ? skipped[0]
        : `${skipped.slice(0, -1).join(", ")} and ${skipped[skipped.length - 1]}`
    return { valid, skippedSummary: `Skipped ${skippedText}.` }
  }

  async function handleSchedule(asDraft = false) {
    if (submittingRef.current) return
    submittingRef.current = true
    try { await submitSchedule(asDraft) }
    finally { submittingRef.current = false }
  }

  async function submitSchedule(asDraft = false) {
    if (!dateValue || !timeValue) return
    const scheduledFor = new Date(`${dateValue}T${timeValue}`)
    if (isNaN(scheduledFor.getTime())) {
      setPanelError("Pick a valid date and time")
      return
    }

    // Custom Post flow: create the Post record first (no AI generation, no
    // credit charge — see app/api/content-hub/custom-post), then one
    // ScheduledPost per selected platform via the same endpoint the
    // pick-existing-content flow uses below, so a non-functional platform
    // gets the same "pending_connection" handling either way.
    if (contentSource === "custom") {
      if (customPlatforms.length === 0) {
        setPanelError("Pick at least one platform")
        return
      }
      // A hard platform-limit violation only blocks scheduling/posting for
      // THAT platform — a draft isn't going live yet, so it's saved for
      // every selected platform regardless (the user can fix the content
      // before promoting it). Checked before creating the Post record so a
      // fully-blocked submission never creates an orphan post.
      const { valid: platformsToSchedule, skippedSummary } = asDraft
        ? { valid: customPlatforms, skippedSummary: null as string | null }
        : splitCustomPlatformsByValidation()

      if (!asDraft && platformsToSchedule.length === 0) {
        setPanelError(`Nothing scheduled — ${skippedSummary?.replace(/^Skipped /, "").replace(/\.$/, "")}.`)
        return
      }

      setSubmitting(true)
      if (asDraft) setSavingAsDraft(true)
      setPanelError(null)
      try {
        const platformCaptions =
          customizePerPlatform && Object.values(customPlatformCaptions).some((v) => (v ?? "").trim())
            ? customPlatformCaptions
            : undefined

        const postRes = await fetch("/api/content-hub/custom-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: customCaption.trim(),
            platformCaptions,
            imageUrls: customImages,
            platforms: customPlatforms,
            tagIds: selectedTagIds,
          }),
        })
        const postData = await postRes.json()
        if (!postRes.ok) throw new Error((postData as { error?: string }).error ?? "Failed to create post")
        const postId = (postData as { postId: string }).postId

        const status = asDraft ? "draft" : "queued"
        const results = await Promise.all(
          platformsToSchedule.map((platform) =>
            fetch("/api/content-hub/scheduled", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postId, platform, scheduledFor: scheduledFor.toISOString(), status }),
            }).then((r) => r.ok),
          ),
        )
        if (results.some((ok) => !ok)) {
          setError("Post created, but scheduling failed for one or more platforms — check Drafts and retry.")
        } else if (skippedSummary) {
          const scheduledLabels = platformsToSchedule.map((p) => PLATFORM_META[p].label).join(", ")
          setError(`Scheduled to ${scheduledLabels}. ${skippedSummary}`)
        }
        closePanel()
        await refreshScheduled()
      } catch (err) {
        setPanelError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setSubmitting(false)
        setSavingAsDraft(false)
      }
      return
    }

    if (!selectedPost || !selectedPlatform) return
    setSubmitting(true)
    if (asDraft) setSavingAsDraft(true)
    setPanelError(null)
    try {
      if (panel?.mode === "edit") {
        // Picking up a draft and giving it a time is what actually queues it —
        // any other edit (queued/failed) just moves the existing time.
        const promotingDraft = panel.item.status === "draft"
        const res = await fetch(`/api/content-hub/scheduled/${panel.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledFor: scheduledFor.toISOString(),
            tagIds: selectedTagIds,
            ...(promotingDraft ? { status: "queued" } : {}),
          }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to reschedule")
      } else {
        const res = await fetch("/api/content-hub/scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: selectedPost.id,
            platform: selectedPlatform,
            scheduledFor: scheduledFor.toISOString(),
            status: asDraft ? "draft" : "queued",
            tagIds: selectedTagIds,
          }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to schedule")
      }
      closePanel()
      await refreshScheduled()
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
      setSavingAsDraft(false)
    }
  }

  // "Add to Queue" — a third option alongside Schedule/Save as Draft (new
  // posts only, mirroring Save as Draft's scope). Skips date/time entirely:
  // the server computes scheduledFor from the next empty queue slot for each
  // platform (see lib/queue.ts), then creates the exact same ScheduledPost
  // shape handleSchedule does — no separate publishing path.
  async function handleAddToQueue() {
    if (submittingRef.current) return
    submittingRef.current = true
    try { await submitAddToQueue() }
    finally { submittingRef.current = false }
  }

  async function submitAddToQueue() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    if (contentSource === "custom") {
      if (customPlatforms.length === 0) {
        setPanelError("Pick at least one platform")
        return
      }

      // Same non-blocking split as handleSchedule: a queue slot is a real
      // posting commitment, so a hard platform-limit violation skips that
      // platform rather than blocking the whole action — checked before
      // creating the Post record so a fully-blocked submission never
      // creates an orphan post.
      const { valid: platformsToQueue, skippedSummary } = splitCustomPlatformsByValidation()
      if (platformsToQueue.length === 0) {
        setPanelError(`Nothing added — ${skippedSummary?.replace(/^Skipped /, "").replace(/\.$/, "")}.`)
        return
      }

      setSubmitting(true)
      setAddingToQueue(true)
      setPanelError(null)
      try {
        const platformCaptions =
          customizePerPlatform && Object.values(customPlatformCaptions).some((v) => (v ?? "").trim())
            ? customPlatformCaptions
            : undefined

        const postRes = await fetch("/api/content-hub/custom-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: customCaption.trim(),
            platformCaptions,
            imageUrls: customImages,
            platforms: customPlatforms,
            tagIds: selectedTagIds,
          }),
        })
        const postData = await postRes.json()
        if (!postRes.ok) throw new Error((postData as { error?: string }).error ?? "Failed to create post")
        const postId = (postData as { postId: string }).postId

        const results = await Promise.all(
          platformsToQueue.map((platform) =>
            fetch("/api/content-hub/scheduled", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postId, platform, useQueue: true, timeZone, status: "queued" }),
            }).then(async (r) => ({ ok: r.ok, error: (await r.json()) as { error?: string } })),
          ),
        )
        const failures = results.filter((r) => !r.ok)
        if (failures.length > 0) {
          setError(failures.map((f) => f.error.error).filter(Boolean).join(" "))
        } else if (skippedSummary) {
          const queuedLabels = platformsToQueue.map((p) => PLATFORM_META[p].label).join(", ")
          setError(`Added to queue for ${queuedLabels}. ${skippedSummary}`)
        }
        closePanel()
        await refreshScheduled()
      } catch (err) {
        setPanelError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setSubmitting(false)
        setAddingToQueue(false)
      }
      return
    }

    if (!selectedPost || !selectedPlatform) return
    setSubmitting(true)
    setAddingToQueue(true)
    setPanelError(null)
    try {
      const res = await fetch("/api/content-hub/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: selectedPost.id,
          platform: selectedPlatform,
          useQueue: true,
          timeZone,
          status: "queued",
          tagIds: selectedTagIds,
        }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to add to queue")
      closePanel()
      await refreshScheduled()
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
      setAddingToQueue(false)
    }
  }

  async function handleRemove(item: ScheduledItem) {
    if (removingId) return
    setRemovingId(item.id)
    try {
      const response = await fetch(`/api/content-hub/scheduled/${item.id}`, { method: "DELETE", signal: AbortSignal.timeout(30_000) })
      if (!response.ok) throw new Error("Failed to remove")
      setScheduled((prev) => prev.filter((s) => s.id !== item.id))
      if (panel?.mode === "edit" && panel.item.id === item.id) closePanel()
    } catch {
      setError("Failed to remove — please try again")
    } finally {
      setRemovingId(null)
    }
  }

  // "Duplicate" — copies the underlying post's caption/images/tags into a
  // brand-new Post, then jumps straight into the existing "pick content"
  // deep link (already built for Generate's "Schedule for Later" button) so
  // the new copy lands pre-selected, ready for a new date/time or platform.
  async function handleDuplicate(item: ScheduledItem) {
    if (duplicatingId) return
    setDuplicatingId(item.id)
    try {
      const res = await fetch(`/api/content-hub/posts/${item.post.id}/duplicate`, { method: "POST" })
      const data = await readJson(res)
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to duplicate")
      await openNewPanelForPost((data as { postId: string }).postId)
    } catch {
      setError("Failed to duplicate — please try again")
    } finally {
      setDuplicatingId(null)
    }
  }

  // The side panel takes focus when it opens or switches to something else,
  // so keyboard users land in it (Escape closes it again).
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (panel) panelRef.current?.focus({ preventScroll: true })
  }, [panel])

  // ── Derived data ────────────────────────────────────────────────
  const filteredPickablePosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase()
    if (!q) return pickablePosts
    return pickablePosts.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.caption ?? "").toLowerCase().includes(q),
    )
  }, [pickablePosts, postSearch])

  // Tag filter applies everywhere scheduled content is displayed (List,
  // Month, Week, Drafts) — but never to hasAnythingInNext7Days below, since
  // that banner is about whether anything is scheduled at all, not whether
  // it matches the current filter.
  const filteredScheduled = useMemo(() => {
    if (!tagFilter) return scheduled
    return scheduled.filter((s) => s.post.tags?.some((t) => t.id === tagFilter))
  }, [scheduled, tagFilter])

  const grouped = useMemo(() => {
    const now = new Date()
    const startThisWeek = startOfWeek(now)
    const startNextWeek = new Date(startThisWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
    const startLater = new Date(startThisWeek.getTime() + 14 * 24 * 60 * 60 * 1000)

    const buckets: Record<"past" | "thisWeek" | "nextWeek" | "later", ScheduledItem[]> = {
      past: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
    }
    for (const item of filteredScheduled) {
      if (item.status === "cancelled" || item.status === "draft") continue
      const d = new Date(item.scheduledFor)
      if (d < now) buckets.past.push(item)
      else if (d < startNextWeek) buckets.thisWeek.push(item)
      else if (d < startLater) buckets.nextWeek.push(item)
      else buckets.later.push(item)
    }
    buckets.past.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
    buckets.thisWeek.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    buckets.nextWeek.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    buckets.later.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    return buckets
  }, [filteredScheduled])

  const draftItems = useMemo(
    () =>
      filteredScheduled
        .filter((s) => s.status === "draft")
        .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()),
    [filteredScheduled],
  )

  const hasAnythingInNext7Days = useMemo(() => {
    const now = Date.now()
    const in7d = now + 7 * 24 * 60 * 60 * 1000
    return scheduled.some((s) => {
      const t = new Date(s.scheduledFor).getTime()
      return (s.status === "queued" || s.status === "pending_connection") && t >= now && t <= in7d
    })
  }, [scheduled])

  const showEmptyBanner = !loading && !bannerDismissed && !hasAnythingInNext7Days

  const cursorLabel = useMemo(() => {
    if (view === "month") {
      return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(cursorDate)
    }
    if (view === "week") {
      const days = getWeekDays(cursorDate)
      const start = days[0]
      const end = days[6]
      const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
      return `${fmt.format(start)} – ${fmt.format(end)}`
    }
    return ""
  }, [view, cursorDate])

  const viewTabs = [
    { key: "list", label: "List", icon: ListIcon },
    { key: "week", label: "Week", icon: CalendarRange },
    { key: "month", label: "Month", icon: CalendarIcon },
    { key: "drafts", label: draftItems.length > 0 ? `Drafts (${draftItems.length})` : "Drafts", icon: FileEdit },
  ] as { key: View; label: string; icon: typeof ListIcon }[]

  const tools = [
    { mode: "recurring", label: "Recurring Slots", title: "Recurring slots", icon: Repeat, onClick: openRecurringPanel },
    { mode: "queue", label: "Queue Settings", title: "Queue settings", icon: ListOrdered, onClick: openQueuePanel },
    { mode: "library", label: "Library", title: "Library — templates, tags, hashtags", icon: LibraryBig, onClick: openLibraryPanel },
    { mode: "bulk", label: "Bulk Upload", title: "Bulk upload (CSV)", icon: UploadCloud, onClick: () => setPanel({ mode: "bulk" }) },
  ] as const

  const toolClasses = buttonVariants({
    variant: "ghost",
    size: "sm",
    className: "px-2.5 text-muted-foreground hover:text-foreground aria-expanded:text-foreground",
  })

  const selectedItemId = panel?.mode === "edit" ? panel.item.id : null
  const selectedDay = panel?.mode === "day" ? panel.date : null
  const showStepThree =
    panel !== null &&
    panel.mode !== "day" &&
    step === 3 &&
    (contentSource === "custom" ? customPlatforms.length > 0 : !!(selectedPost && selectedPlatform))

  const panelTitle = !panel
    ? ""
    : panel.mode === "edit"
      ? panel.item.status === "draft"
        ? "Schedule Draft"
        : "Reschedule"
      : panel.mode === "day"
        ? fullDayFormat.format(panel.date)
        : panel.mode === "recurring"
          ? "Recurring Slots"
          : panel.mode === "queue"
            ? "Queue Settings"
            : panel.mode === "library"
              ? "Library"
              : panel.mode === "bulk"
                ? "Bulk Upload"
                : "New Post"

  const rowHandlers = {
    onReschedule: openEditPanel,
    onRemove: (item: ScheduledItem) => void handleRemove(item),
    onDuplicate: (item: ScheduledItem) => void handleDuplicate(item),
    removingId,
    duplicatingId,
    selectedId: selectedItemId,
  }

  const gridProps = {
    scheduled: filteredScheduled,
    recurringSlots,
    onDayClick: openDayPanel,
    onItemClick: openEditPanel,
    onDropItem: (id: string, day: Date) => void handleDropOnDay(id, day),
    onFillRecurring: openNewPanelForDay,
    selectedDay,
    selectedItemId,
  }

  return (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-6">
      <PageHeader
        title="Content Hub"
        description="Plan, schedule, and publish — all in one place."
        actions={
          <>
            {today && (
              <Button
                variant="outline"
                onClick={() => openNewPanel(today.datetime)}
                title={today.why}
                className="border-brand/35 text-brand hover:bg-brand-soft"
              >
                {today.chipLabel}
              </Button>
            )}
            <Button onClick={() => openNewPanel()}>
              <Plus aria-hidden />
              New Post
            </Button>
          </>
        }
      />

      {/* Views on the left, the hub's tools on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div role="group" aria-label="View" className="inline-flex rounded-control border border-border bg-surface p-1">
          {viewTabs.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
              className="inline-flex h-8 items-center gap-1.5 rounded-control-sm px-3 text-label font-medium whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"
            >
              <v.icon className="hidden size-3.5 sm:block" aria-hidden />
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <NextLink href="/content-hub/ideas" title="Ideas Board" className={toolClasses}>
            <Lightbulb aria-hidden />
            <span className="max-xl:sr-only">Ideas Board</span>
          </NextLink>
          {tools.map((t) => (
            <button
              key={t.mode}
              type="button"
              onClick={t.onClick}
              title={t.title}
              aria-label={t.title}
              aria-expanded={panel?.mode === t.mode}
              aria-controls={panel?.mode === t.mode ? "hub-panel" : undefined}
              className={toolClasses}
            >
              <t.icon aria-hidden />
              <span aria-hidden className="hidden xl:inline">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter — applies to List/Week/Month/Drafts below */}
      {tags.length > 0 && (
        <div role="group" aria-label="Tags" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={tagFilter === null}
            onClick={() => setTagFilter(null)}
            className="inline-flex h-8 items-center rounded-full border border-border px-3 text-caption font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
          >
            All
          </button>
          {tags.map((t) => {
            const on = tagFilter === t.id
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTagFilter((prev) => (prev === t.id ? null : t.id))}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-colors duration-(--motion-fast)",
                  on ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"
                )}
                style={on ? { backgroundColor: t.color } : undefined}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: on ? "currentColor" : t.color }}
                />
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Empty-queue nudge — dismissible, once per session */}
      {showEmptyBanner && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-brand/25 bg-brand-soft px-4 py-3">
          <p className="text-label text-foreground">
            Nothing scheduled for the next 7 days — want to plan something?
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="link" size="sm" onClick={() => openNewPanel()}>
              Plan something
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={dismissBanner}>
              <X aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
          {error}
        </div>
      )}

      <div className={cn("grid gap-8", panel && "xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-10")}>
        <div className="flex min-w-0 flex-col gap-6">
          {/* Loading skeleton — the agenda's shape */}
          {loading && (
            <div aria-hidden className="flex flex-col divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
                  <Skeleton className="h-10 w-9" />
                  <div className="flex items-start gap-4 p-3">
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-4 w-full max-w-md" />
                    </div>
                    <Skeleton className="size-14" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List view — an agenda, posts under their day */}
          {!loading && view === "list" && (
            <>
              {filteredScheduled.filter((s) => s.status !== "cancelled" && s.status !== "draft").length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon />}
                  title="Nothing scheduled yet"
                  description="Pick something you've already generated and put it on the calendar."
                  action={
                    <Button onClick={() => openNewPanel()}>
                      <Plus aria-hidden />
                      New Post
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-10">
                  <GroupSection title="This Week" items={grouped.thisWeek} {...rowHandlers} />
                  <GroupSection title="Next Week" items={grouped.nextWeek} {...rowHandlers} />
                  <GroupSection title="Later" items={grouped.later} {...rowHandlers} />
                  <GroupSection title="Past" items={grouped.past} {...rowHandlers} />
                </div>
              )}
            </>
          )}

          {/* Calendar views (Month/Week) */}
          {!loading && (view === "month" || view === "week") && (
            <section aria-label={cursorLabel} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p aria-live="polite" className="font-display text-title leading-none text-foreground sm:text-[2.5rem]">
                  {cursorLabel}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={goPrev}
                    aria-label={view === "month" ? "Previous month" : "Previous week"}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToday}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={goNext}
                    aria-label={view === "month" ? "Next month" : "Next week"}
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
              </div>

              {view === "month" ? (
                <MonthGrid monthAnchor={cursorDate} {...gridProps} />
              ) : (
                <WeekGrid weekAnchor={cursorDate} {...gridProps} />
              )}
            </section>
          )}

          {/* Drafts view — picked up and scheduled later, never auto-published */}
          {!loading && view === "drafts" && (
            <>
              {draftItems.length === 0 ? (
                <EmptyState
                  icon={<FileEdit />}
                  title="No drafts"
                  description="Save a post here when you're not ready to lock in a time yet."
                />
              ) : (
                <ol className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface p-1">
                  {draftItems.map((item) => (
                    <li key={item.id} className="py-1">
                      <ScheduledRow
                        item={item}
                        selected={selectedItemId === item.id}
                        onReschedule={openEditPanel}
                        onRemove={(i) => void handleRemove(i)}
                        onDuplicate={(i) => void handleDuplicate(i)}
                        isRemoving={removingId === item.id}
                        isDuplicating={duplicatingId === item.id}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        {/* ── Side panel: docked beside the calendar on wide screens, a sheet on smaller ones ── */}
        {panel && (
          <div className="fixed inset-0 z-(--z-dialog) flex justify-end xl:sticky xl:inset-auto xl:top-0 xl:z-auto xl:block xl:self-start">
            <div aria-hidden className="absolute inset-0 bg-foreground/25 xl:hidden" onClick={closePanel} />
            <aside
              id="hub-panel"
              ref={panelRef}
              tabIndex={-1}
              aria-labelledby="hub-panel-title"
              onKeyDown={(e) => {
                if (e.key === "Escape") closePanel()
              }}
              className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-dialog outline-none xl:h-[calc(100dvh-11rem)] xl:max-w-none xl:overflow-hidden xl:rounded-showcase xl:border xl:border-border xl:shadow-card"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
                <h2
                  id="hub-panel-title"
                  className={cn(
                    "text-foreground",
                    panel.mode === "day" ? "font-display text-title-sm leading-tight" : "text-body-lg font-semibold"
                  )}
                >
                  {panelTitle}
                </h2>
                <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={closePanel} className="-mt-1 -mr-2">
                  <X aria-hidden />
                </Button>
              </div>

              {panel.mode === "new" && <StepBar step={step} skipped={contentSource === "custom"} />}

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
                {/* Recurring mode — "post automatically every [days] at [time]
                    on [platform]", kept to one simple list + one simple form. */}
                {panel.mode === "recurring" && (
                  <div className="flex flex-col gap-4">
                    <p className="text-label text-muted-foreground">
                      Post automatically on the days and time you pick — CarouseLabs fills each slot with
                      your most recent unscheduled content.
                    </p>

                    {recurringSlots.length > 0 && (
                      <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface-raised">
                        {recurringSlots.map((slot) => (
                          <li
                            key={slot.id}
                            className={cn("flex items-center gap-3 px-3 py-2.5", !slot.active && "opacity-60")}
                          >
                            <PlatformBadge platform={slot.platform} />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <p className="truncate text-label font-medium text-foreground">{slot.label}</p>
                              <p className="text-caption text-muted-foreground">
                                Every {formatDaysOfWeek(slot.daysOfWeek)} at {formatTimeOfDay(slot.timeOfDay)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center">
                              <button
                                type="button"
                                onClick={() => void toggleSlotActive(slot)}
                                title={slot.active ? "Pause" : "Resume"}
                                aria-label={slot.active ? "Pause" : "Resume"}
                                className={iconAction}
                              >
                                {slot.active ? <Pause aria-hidden /> : <Play aria-hidden />}
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditSlot(slot)}
                                title="Edit"
                                aria-label="Edit"
                                className={iconAction}
                              >
                                <Pencil aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteSlot(slot.id)}
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

                    {!recurringFormOpen ? (
                      <Button variant="outline" onClick={startNewSlot} className="border-dashed border-brand/40 text-brand hover:bg-brand-soft">
                        <Plus aria-hidden />
                        New Recurring Slot
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-4">
                        <StepHeading>{editingSlotId ? "Edit slot" : "New slot"}</StepHeading>
                        <input
                          value={slotLabel}
                          onChange={(e) => setSlotLabel(e.target.value)}
                          placeholder="Label (optional)"
                          aria-label="Label (optional)"
                          className={fieldClasses}
                        />
                        <div className="grid grid-cols-7 gap-1">
                          {DAY_ABBR.map((label, d) => (
                            <button
                              key={d}
                              type="button"
                              aria-pressed={slotDays.includes(d)}
                              aria-label={label}
                              onClick={() => toggleSlotDay(d)}
                              className="h-9 rounded-control-sm bg-surface-muted text-caption font-semibold text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-brand aria-pressed:text-brand-foreground"
                            >
                              {label[0]}
                            </button>
                          ))}
                        </div>
                        <input
                          type="time"
                          value={slotTime}
                          onChange={(e) => setSlotTime(e.target.value)}
                          aria-label="Time"
                          className={fieldClasses}
                        />
                        <select
                          value={slotPlatform}
                          onChange={(e) => setSlotPlatform(e.target.value as Platform)}
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
                        {slotError && (
                          <p role="alert" className="rounded-control-sm border border-danger/25 bg-danger-soft px-3 py-2 text-caption text-danger">
                            {slotError}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button variant="brand" className="flex-1" onClick={() => void submitSlotForm()} disabled={slotSubmitting}>
                            {slotSubmitting ? (
                              <Loader2 className="animate-spin" aria-hidden />
                            ) : editingSlotId ? (
                              "Save Slot"
                            ) : (
                              "Add Slot"
                            )}
                          </Button>
                          <Button variant="ghost" onClick={() => setRecurringFormOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Queue settings mode */}
                {panel.mode === "queue" && (
                  <QueueSettingsPanel
                    slots={queueSlots}
                    formOpen={queueFormOpen}
                    onStartNew={startNewQueueSlot}
                    onStartEdit={startEditQueueSlot}
                    onCancelForm={() => setQueueFormOpen(false)}
                    editingId={editingQueueSlotId}
                    day={queueDay}
                    onDayChange={setQueueDay}
                    time={queueTime}
                    onTimeChange={setQueueTime}
                    platform={queuePlatform}
                    onPlatformChange={setQueuePlatform}
                    submitting={queueSubmitting}
                    error={queueError}
                    onSubmit={() => void submitQueueForm()}
                    onToggleActive={(slot) => void toggleQueueSlotActive(slot)}
                    onDelete={(id) => void deleteQueueSlot(id)}
                    onPauseAll={pauseAllQueues}
                    onShuffle={shuffleQueue}
                  />
                )}

                {/* Library mode — Templates / Tags / Hashtag Groups management */}
                {panel.mode === "library" && (
                  <LibraryPanel
                    templates={templates}
                    tags={tags}
                    hashtagGroups={hashtagGroups}
                    onCreateTemplate={createTemplate}
                    onDeleteTemplate={(id) => void deleteTemplate(id)}
                    onCreateTag={createTag}
                    onDeleteTag={(id) => void deleteTag(id)}
                    onCreateHashtagGroup={createHashtagGroup}
                    onDeleteHashtagGroup={(id) => void deleteHashtagGroup(id)}
                    shortLinks={shortLinks}
                    onCreateShortLink={createShortLink}
                    onDeleteShortLink={(id) => void deleteShortLink(id)}
                  />
                )}

                {/* Bulk upload mode */}
                {panel.mode === "bulk" && <BulkUploadPanel onDone={() => void refreshScheduled()} />}

                {/* Day mode — that day's full schedule, no wizard steps */}
                {panel.mode === "day" && (
                  <div className="flex flex-col gap-3">
                    {itemsForDay(scheduled, panel.date).length === 0 ? (
                      <p className="py-8 text-center text-label text-muted-foreground">Nothing scheduled this day.</p>
                    ) : (
                      <div className="-mx-3 flex flex-col gap-1">
                        {itemsForDay(scheduled, panel.date).map((item) => (
                          <ScheduledRow
                            key={item.id}
                            item={item}
                            timeOnly
                            onReschedule={openEditPanel}
                            onRemove={(i) => void handleRemove(i)}
                            onDuplicate={(i) => void handleDuplicate(i)}
                            isRemoving={removingId === item.id}
                            isDuplicating={duplicatingId === item.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1 — choose content source, then pick existing content or
                    build a Custom Post */}
                {panel.mode === "new" && step === 1 && (
                  <div className="flex flex-col gap-3">
                    {contentSource === null ? (
                      <>
                        <StepHeading>Step 1 · Choose content</StepHeading>
                        <ChoiceCard
                          onClick={() => chooseContentSource("pick")}
                          title="Pick from your generated content"
                          subtitle="Schedule a caption, image, or carousel you've already created"
                        />
                        <ChoiceCard
                          onClick={() => chooseContentSource("custom")}
                          title="Create a Custom Post"
                          subtitle="For content you've made yourself outside CarouseLabs"
                        />
                      </>
                    ) : contentSource === "custom" ? (
                      <CustomPostComposer
                        caption={customCaption}
                        onCaptionChange={setCustomCaption}
                        images={customImages}
                        onAddImage={(url) => setCustomImages((prev) => [...prev, url])}
                        onRemoveImage={(url) => setCustomImages((prev) => prev.filter((u) => u !== url))}
                        platforms={customPlatforms}
                        onTogglePlatform={toggleCustomPlatform}
                        customizePerPlatform={customizePerPlatform}
                        onToggleCustomizePerPlatform={setCustomizePerPlatform}
                        platformCaptions={customPlatformCaptions}
                        onPlatformCaptionChange={(platform, value) =>
                          setCustomPlatformCaptions((prev) => ({ ...prev, [platform]: value }))
                        }
                        linkedInConnected={linkedInConnected}
                        error={panelError}
                        onBack={() => setContentSource(null)}
                        templates={templates}
                        onSaveTemplate={createTemplate}
                        hashtagGroups={hashtagGroups}
                        onShortenUrl={shortenUrlForCaption}
                      />
                    ) : (
                      <>
                        <BackButton arrow={false} onClick={() => setContentSource(null)}>
                          ← Back
                        </BackButton>
                        <StepHeading>Step 1 · Pick content</StepHeading>
                        <div className="relative">
                          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                          <input
                            type="search"
                            value={postSearch}
                            onChange={(e) => setPostSearch(e.target.value)}
                            placeholder="Search your posts…"
                            aria-label="Search your posts…"
                            className={cn(fieldClasses, "pl-9")}
                          />
                        </div>

                        {loadingPosts ? (
                          <div aria-hidden className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <Skeleton key={i} className="aspect-square" />
                            ))}
                          </div>
                        ) : filteredPickablePosts.length === 0 ? (
                          <p className="py-8 text-center text-label text-muted-foreground">
                            {pickablePosts.length === 0
                              ? "No generated posts yet — create one from Generate first."
                              : "No posts match your search."}
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {filteredPickablePosts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => selectPost(p)}
                                className="group flex flex-col gap-1 rounded-control-sm text-left"
                              >
                                <span className="relative block aspect-square overflow-hidden rounded-control-sm border border-border bg-surface-muted transition-[border-color,box-shadow] duration-(--motion-fast) group-hover:border-brand group-hover:shadow-card">
                                  {p.imageUrls[0] ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={p.imageUrls[0]} alt={p.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center">
                                      <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                                    </span>
                                  )}
                                  {p.format === "CUSTOM" && (
                                    <span className="absolute top-1 left-1 rounded-full bg-foreground/80 px-1.5 py-0.5 text-[10px] font-semibold text-background">
                                      Custom
                                    </span>
                                  )}
                                </span>
                                <span className="truncate text-[11px] text-muted-foreground">{FORMAT_LABELS[p.format]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Step 2 — pick platform */}
                {panel.mode === "new" && step === 2 && selectedPost && (
                  <div className="flex flex-col gap-3">
                    <StepHeading>Step 2 · Pick platform</StepHeading>
                    <div className="flex items-center gap-3 rounded-card border border-border bg-surface-raised p-3">
                      <Thumbnail post={selectedPost} size={44} />
                      <p className="line-clamp-2 min-w-0 text-caption text-muted-foreground">
                        {selectedPost.caption?.slice(0, 80) || selectedPost.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectPlatform("linkedin")}
                      className="flex items-center gap-3 rounded-card border border-border bg-surface-raised p-4 text-left transition-[border-color,box-shadow] duration-(--motion-fast) hover:border-brand/60 hover:shadow-card"
                    >
                      <PlatformBadge platform="linkedin" size={36} />
                      <span className="flex flex-col">
                        <span className="text-label font-semibold text-foreground">LinkedIn</span>
                        <span className="text-caption text-muted-foreground">
                          {linkedInConnected === false ? "Not connected — connects at Settings" : "Ready to schedule"}
                        </span>
                      </span>
                    </button>
                    <div aria-disabled="true" className="flex items-center gap-3 rounded-card border border-dashed border-border bg-surface p-4 opacity-70">
                      <PlatformBadge platform="instagram" size={36} />
                      <span className="flex flex-col">
                        <span className="text-label font-semibold text-foreground">Instagram</span>
                        <span className="text-caption text-muted-foreground">Connect Instagram to schedule here</span>
                      </span>
                    </div>
                    {linkedInConnected === false && (
                      <p className="text-caption text-muted-foreground">
                        You can still pick LinkedIn and connect it before this post&apos;s scheduled time in{" "}
                        <a href="/settings/account" className="text-brand underline underline-offset-2">
                          Settings
                        </a>
                        .
                      </p>
                    )}
                  </div>
                )}

                {/* Step 3 — date/time + preview */}
                {showStepThree && (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-3">
                      <StepHeading>{panel.mode === "edit" ? "New date & time" : "Step 3 · Date & time"}</StepHeading>
                      <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
                        <input
                          type="date"
                          value={dateValue}
                          onChange={(e) => setDateValue(e.target.value)}
                          aria-label="Date"
                          className={fieldClasses}
                        />
                        <input
                          type="time"
                          value={timeValue}
                          onChange={(e) => setTimeValue(e.target.value)}
                          aria-label="Time"
                          className={fieldClasses}
                        />
                      </div>

                      {suggestions.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-caption text-muted-foreground">Or pick a suggested time:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((s) => (
                              <button
                                key={s.datetime}
                                type="button"
                                onClick={() => {
                                  const inputs = isoToLocalInputs(s.datetime)
                                  setDateValue(inputs.date)
                                  setTimeValue(inputs.time)
                                }}
                                title={s.why}
                                className="inline-flex h-8 items-center rounded-full border border-border bg-surface-raised px-3 text-caption font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <FieldLabel>Tags</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((t) => {
                            const checked = selectedTagIds.includes(t.id)
                            return (
                              <button
                                key={t.id}
                                type="button"
                                aria-pressed={checked}
                                onClick={() => toggleSelectedTag(t.id)}
                                className={cn(
                                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-colors duration-(--motion-fast)",
                                  checked ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"
                                )}
                                style={checked ? { backgroundColor: t.color } : undefined}
                              >
                                <Tag className="size-3" aria-hidden />
                                {t.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const previewPlatforms =
                        contentSource === "custom" ? customPlatforms : selectedPlatform ? [selectedPlatform] : []
                      const activePreviewPlatform =
                        (previewPlatformOverride && previewPlatforms.includes(previewPlatformOverride)
                          ? previewPlatformOverride
                          : previewPlatforms[0]) ?? null
                      if (!activePreviewPlatform) return null
                      const previewCaption =
                        contentSource === "custom"
                          ? (customizePerPlatform && customPlatformCaptions[activePreviewPlatform]?.trim()) ||
                            customCaption
                          : (selectedPost?.caption ?? "")
                      const previewImage =
                        contentSource === "custom" ? customImages[0] : selectedPost?.imageUrls[0]

                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <FieldLabel>Preview</FieldLabel>
                            {previewPlatforms.length > 1 && (
                              <div className="flex items-center gap-1">
                                {previewPlatforms.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    aria-pressed={activePreviewPlatform === p}
                                    aria-label={PLATFORM_META[p].label}
                                    onClick={() => setPreviewPlatformOverride(p)}
                                    className="rounded-full p-1 opacity-50 transition-opacity duration-(--motion-fast) hover:opacity-100 aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-brand aria-pressed:ring-offset-1 aria-pressed:ring-offset-surface"
                                    title={PLATFORM_META[p].label}
                                  >
                                    <PlatformBadge platform={p} size={18} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <PlatformPreview
                            platform={activePreviewPlatform}
                            caption={previewCaption}
                            imageUrl={previewImage}
                            userName={user?.name || user?.email || "You"}
                          />
                          {contentSource === "custom" && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {customPlatforms.map((p) => (
                                <span
                                  key={p}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pr-2.5 pl-1 text-caption font-medium text-foreground"
                                >
                                  <PlatformBadge platform={p} size={16} />
                                  {PLATFORM_META[p].label}
                                  {!PLATFORM_META[p].functional && <span className="text-warning">· pending</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {panelError && (
                      <p role="alert" className="rounded-control-sm border border-danger/25 bg-danger-soft px-3 py-2.5 text-caption text-danger">
                        {panelError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Custom composer footer — "Continue" hands off to the shared
                  date/time + Schedule/Save-as-Draft step below */}
              {panel.mode === "new" && step === 1 && contentSource === "custom" && (
                <div className="shrink-0 border-t border-border bg-surface-raised/70 px-5 py-4">
                  <Button variant="brand" className="w-full" onClick={continueCustomComposer}>
                    Continue
                  </Button>
                </div>
              )}

              {/* Footer — one obvious primary action, plus a secondary "back"/"remove" where relevant */}
              {showStepThree && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-surface-raised/70 px-5 py-4">
                  <Button variant="brand" className="min-w-32 flex-1" onClick={() => void handleSchedule()} disabled={submitting}>
                    {submitting && !savingAsDraft && !addingToQueue ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : panel.mode === "edit" ? (
                      panel.item.status === "draft" ? "Schedule" : "Save New Time"
                    ) : (
                      "Schedule"
                    )}
                  </Button>
                  {panel.mode === "edit" && (
                    <Button
                      variant="outline"
                      onClick={() => void handleRemove(panel.item)}
                      disabled={removingId === panel.item.id}
                      className="hover:border-danger/35 hover:bg-danger-soft hover:text-danger"
                    >
                      {removingId === panel.item.id && <Loader2 className="animate-spin" aria-hidden />}
                      {removingId === panel.item.id ? "Removing…" : "Remove"}
                    </Button>
                  )}
                  {panel.mode === "new" && (
                    <Button
                      variant="outline"
                      onClick={() => void handleAddToQueue()}
                      disabled={submitting}
                      title={
                        queueSlots.filter((s) => s.active).length === 0
                          ? "No active queue slots yet — add one via Queue Settings"
                          : undefined
                      }
                    >
                      {addingToQueue && <Loader2 className="animate-spin" aria-hidden />}
                      {addingToQueue ? "Adding…" : "Add to Queue"}
                    </Button>
                  )}
                  {panel.mode === "new" && (
                    <Button variant="ghost" onClick={() => void handleSchedule(true)} disabled={submitting}>
                      {savingAsDraft && <Loader2 className="animate-spin" aria-hidden />}
                      {savingAsDraft ? "Saving…" : "Save as Draft"}
                    </Button>
                  )}
                </div>
              )}

              {/* Day mode footer — the one obvious next action for this panel */}
              {panel.mode === "day" && (
                <div className="shrink-0 border-t border-border bg-surface-raised/70 px-5 py-4">
                  <Button variant="brand" className="w-full" onClick={() => openNewPanelForDay(panel.date)}>
                    <Plus aria-hidden />
                    Add here
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
