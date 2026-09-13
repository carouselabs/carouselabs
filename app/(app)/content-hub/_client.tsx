"use client"

import { useEffect, useMemo, useState } from "react"
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
  Camera,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Repeat,
  Pause,
  Play,
  ListOrdered,
  Lightbulb,
} from "lucide-react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { PLATFORM_META, PLATFORM_ORDER, type Platform } from "@/lib/platforms"
import { PlatformBadge, PlatformIcon } from "@/components/content-hub/platforms"
import { CustomPostComposer } from "@/components/content-hub/CustomPostComposer"
import { QueueSettingsPanel, type QueueSlotSummary } from "@/components/content-hub/QueueSettingsPanel"

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
  | null

const FORMAT_LABELS: Record<PostFormat, string> = {
  CAROUSEL: "Carousel",
  SINGLE_IMAGE: "Image",
  TEXT_ONLY: "Text",
  THUMBNAIL: "Thumbnail",
  CUSTOM: "Custom",
}

const STATUS_DOT: Record<ScheduledStatus, string> = {
  draft: "#9CA3AF",
  queued: "#7C3AED",
  publishing: "#7C3AED",
  published: "#10B981",
  failed: "#EF4444",
  cancelled: "#D1D5DB",
  pending_connection: "#F59E0B",
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
function Thumbnail({ post, size = 48 }: { post: PostSummary; size?: number }) {
  const src = post.imageUrls[0]
  return (
    <div
      className="rounded-lg overflow-hidden border border-[#E5E3DE] bg-[#F4F2EC] flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={post.title} className="w-full h-full object-cover" />
      ) : (
        <ImageIcon size={16} className="text-[#ADA99F]" />
      )}
    </div>
  )
}

function ScheduledRow({
  item,
  onReschedule,
  onRemove,
  isRemoving = false,
}: {
  item: ScheduledItem
  onReschedule: (item: ScheduledItem) => void
  onRemove: (item: ScheduledItem) => void
  isRemoving?: boolean
}) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl border border-[#E5E3DE] bg-white hover:border-[rgba(124,58,237,0.35)] transition-colors">
      <Thumbnail post={item.post} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STATUS_DOT[item.status] }}
          />
          <span className="text-[11px] font-medium text-[#6B7280]">{STATUS_LABEL[item.status]}</span>
          <PlatformBadge platform={item.platform} />
        </div>
        <p className="text-[13px] font-medium text-[#0A0A0A] truncate">
          {item.post.caption?.slice(0, 80) || item.post.title}
        </p>
        <p className="text-[11px] text-[#9CA3AF]">
          {formatDateTime(item.scheduledFor)} · {FORMAT_LABELS[item.post.format]}
        </p>
        {item.status === "failed" && item.failureReason && (
          <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{item.failureReason}</p>
        )}
        {item.status === "pending_connection" && (
          <p className="text-[11px] text-[#D97706]">
            Pending — connect {PLATFORM_META[item.platform].label} to publish here
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.status === "published" && item.publishedUrl ? (
          <a
            href={item.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
            title="View post"
          >
            <ExternalLink size={13} strokeWidth={2} />
          </a>
        ) : (
          <>
            {(item.status === "queued" || item.status === "failed" || item.status === "draft") && (
              <button
                onClick={() => onReschedule(item)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
                title={item.status === "draft" ? "Schedule" : "Reschedule"}
              >
                <Pencil size={13} strokeWidth={2} />
              </button>
            )}
            <button
              onClick={() => onRemove(item)}
              disabled={isRemoving}
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove"
            >
              {isRemoving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} strokeWidth={2} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GroupSection({
  title,
  items,
  onReschedule,
  onRemove,
  removingId,
}: {
  title: string
  items: ScheduledItem[]
  onReschedule: (item: ScheduledItem) => void
  onRemove: (item: ScheduledItem) => void
  removingId?: string | null
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ScheduledRow
            key={item.id}
            item={item}
            onReschedule={onReschedule}
            onRemove={onRemove}
            isRemoving={removingId === item.id}
          />
        ))}
      </div>
    </div>
  )
}

interface CalendarGridProps {
  scheduled: ScheduledItem[]
  recurringSlots: RecurringSlotSummary[]
  onDayClick: (day: Date) => void
  onItemClick: (item: ScheduledItem) => void
  onDropItem: (itemId: string, day: Date) => void
  onFillRecurring: (day: Date, timeOfDay: string) => void
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
}: CalendarGridProps & { monthAnchor: Date }) {
  const today = new Date()
  const days = useMemo(() => getMonthGridDays(monthAnchor), [monthAnchor])

  return (
    <div className="rounded-2xl border border-[#E5E3DE] bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#E5E3DE] bg-[#FBFAF6]">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold text-[#9CA3AF] text-center">
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
              className={[
                "min-h-[92px] p-1.5 border-r border-b border-[#E5E3DE] [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 cursor-pointer hover:bg-[rgba(124,58,237,0.03)] transition-colors",
                inMonth ? "bg-white" : "bg-[#FBFAF6]",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0",
                  isToday ? "bg-[#7C3AED] text-white" : inMonth ? "text-[#4B5563]" : "text-[#D1D5DB]",
                ].join(" ")}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-1">
                {visible.map((item) => (
                  <div
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
                    className="flex items-center gap-1 p-1 rounded-md bg-[#F4F2EC] hover:bg-[#ECEAE4] cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_DOT[item.status] }}
                    />
                    <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0 bg-[#E5E3DE]">
                      {item.post.imageUrls[0] && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.post.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-[9.5px] text-[#6B7280] truncate flex-1">{item.post.title}</span>
                  </div>
                ))}
                {overflow > 0 && <span className="text-[9.5px] text-[#9CA3AF] pl-1">+{overflow} more</span>}
                {items.length === 0 && dayRecurring.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onFillRecurring(day, dayRecurring[0].timeOfDay)
                    }}
                    className="text-[9.5px] leading-tight text-[#7C3AED] px-1.5 py-1 rounded-md border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)] hover:bg-[rgba(124,58,237,0.08)] transition-colors text-left"
                  >
                    Recurring — tap to fill
                  </button>
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
}: CalendarGridProps & { weekAnchor: Date }) {
  const today = new Date()
  const days = useMemo(() => getWeekDays(weekAnchor), [weekAnchor])

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => {
        const items = itemsForDay(scheduled, day)
        const isToday = isSameDay(day, today)
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
            className="flex flex-col gap-2 min-h-[220px] rounded-xl border border-[#E5E3DE] bg-white p-2"
          >
            <button
              onClick={() => onDayClick(day)}
              className="flex flex-col items-center gap-0.5 pb-1.5 border-b border-[#F1EFE9]"
            >
              <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">
                {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}
              </span>
              <span
                className={[
                  "text-[13px] font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-[#7C3AED] text-white" : "text-[#1A1A1A]",
                ].join(" ")}
              >
                {day.getDate()}
              </span>
            </button>
            <div className="flex flex-col gap-1.5 flex-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                  onClick={() => onItemClick(item)}
                  className="flex flex-col gap-1 p-1.5 rounded-lg bg-[#F4F2EC] hover:bg-[#ECEAE4] cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_DOT[item.status] }}
                    />
                    <span className="text-[9.5px] text-[#6B7280]">
                      {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
                        new Date(item.scheduledFor),
                      )}
                    </span>
                    <PlatformBadge platform={item.platform} />
                  </div>
                  <div className="w-full aspect-square rounded overflow-hidden bg-[#E5E3DE]">
                    {item.post.imageUrls[0] && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.post.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && dayRecurring.length > 0 && (
                <button
                  onClick={() => onFillRecurring(day, dayRecurring[0].timeOfDay)}
                  className="flex-1 text-[10px] leading-tight text-[#7C3AED] px-2 py-3 rounded-lg border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)] hover:bg-[rgba(124,58,237,0.08)] transition-colors"
                >
                  Recurring — tap to fill
                </button>
              )}
              {items.length === 0 && dayRecurring.length === 0 && (
                <button
                  onClick={() => onDayClick(day)}
                  className="flex-1 flex items-center justify-center text-[11px] text-[#D1D5DB] hover:text-[#7C3AED] transition-colors"
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
  // Distinguishes which of the two footer buttons (Schedule vs. Save as
  // Draft) is the one in flight, so only the clicked button shows its own
  // spinner/text-change while `submitting` disables both.
  const [savingAsDraft, setSavingAsDraft] = useState(false)
  // Which scheduled item's Remove is currently in flight — a real DELETE
  // (not optimistic), so the clicked row/button needs its own loading state.
  const [removingId, setRemovingId] = useState<string | null>(null)
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

  useEffect(() => {
    void refreshScheduled()
    void loadSuggestion()
    void loadRecurringSlots()
    void loadQueueSlots()
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
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load")
      setScheduled((data as { scheduled: ScheduledItem[] }).scheduled)
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
      const data = await res.json()
      setToday((data as { today: TodaySuggestion | null }).today)
      setSuggestions((data as { suggestions: SuggestionSlot[] }).suggestions ?? [])
    } catch {
      // best-effort — the chip/quick-picks just don't render
    }
  }

  async function loadRecurringSlots() {
    try {
      const res = await fetch("/api/content-hub/recurring")
      const data = await res.json()
      if (res.ok) setRecurringSlots((data as { slots: RecurringSlotSummary[] }).slots)
    } catch {
      // best-effort — calendar just shows no recurring placeholders
    }
  }

  async function loadQueueSlots() {
    try {
      const res = await fetch("/api/content-hub/queue")
      const data = await res.json()
      if (res.ok) setQueueSlots((data as { slots: QueueSlotSummary[] }).slots)
    } catch {
      // best-effort — "Add to Queue" just surfaces its own error on click
    }
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
        const data = await res.json()
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
        const data = await res.json()
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
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update slot")
      } else {
        const res = await fetch("/api/content-hub/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayOfWeek: queueDay, timeOfDay: queueTime, platform: queuePlatform }),
        })
        const data = await res.json()
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
    const inputs = defaultInputs()
    setDateValue(inputs.date)
    setTimeValue(inputs.time)
    if (linkedInConnected === null) void checkLinkedIn()

    try {
      const res = await fetch("/api/ideas-board")
      const data = await res.json()
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
      const data = await res.json()
      setLinkedInConnected(Boolean((data as { connected?: boolean }).connected))
    } catch {
      setLinkedInConnected(false)
    }
  }

  async function loadPickablePosts(): Promise<PickablePost[]> {
    setLoadingPosts(true)
    try {
      const res = await fetch("/api/content-hub/posts")
      const data = await res.json()
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

  async function handleSchedule(asDraft = false) {
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
          }),
        })
        const postData = await postRes.json()
        if (!postRes.ok) throw new Error((postData as { error?: string }).error ?? "Failed to create post")
        const postId = (postData as { postId: string }).postId

        const status = asDraft ? "draft" : "queued"
        const results = await Promise.all(
          customPlatforms.map((platform) =>
            fetch("/api/content-hub/scheduled", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postId, platform, scheduledFor: scheduledFor.toISOString(), status }),
            }).then((r) => r.ok),
          ),
        )
        if (results.some((ok) => !ok)) {
          setError("Post created, but scheduling failed for one or more platforms — check Drafts and retry.")
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
            ...(promotingDraft ? { status: "queued" } : {}),
          }),
        })
        const data = await res.json()
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
          }),
        })
        const data = await res.json()
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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    if (contentSource === "custom") {
      if (customPlatforms.length === 0) {
        setPanelError("Pick at least one platform")
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
          }),
        })
        const postData = await postRes.json()
        if (!postRes.ok) throw new Error((postData as { error?: string }).error ?? "Failed to create post")
        const postId = (postData as { postId: string }).postId

        const results = await Promise.all(
          customPlatforms.map((platform) =>
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
        }),
      })
      const data = await res.json()
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
      await fetch(`/api/content-hub/scheduled/${item.id}`, { method: "DELETE" })
      setScheduled((prev) => prev.filter((s) => s.id !== item.id))
      if (panel?.mode === "edit" && panel.item.id === item.id) closePanel()
    } catch {
      setError("Failed to remove — please try again")
    } finally {
      setRemovingId(null)
    }
  }

  // ── Derived data ────────────────────────────────────────────────
  const filteredPickablePosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase()
    if (!q) return pickablePosts
    return pickablePosts.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.caption ?? "").toLowerCase().includes(q),
    )
  }, [pickablePosts, postSearch])

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
    for (const item of scheduled) {
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
  }, [scheduled])

  const draftItems = useMemo(
    () =>
      scheduled
        .filter((s) => s.status === "draft")
        .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()),
    [scheduled],
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

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-bold text-[#0A0A0A]">Content Hub</h1>
        <p className="text-[13px] text-[#9CA3AF]">Plan, schedule, and publish — all in one place.</p>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F4F2EC] border border-[#E5E3DE]">
          {([
            { key: "list", label: "List", icon: ListIcon },
            { key: "week", label: "Week", icon: CalendarRange },
            { key: "month", label: "Month", icon: CalendarIcon },
            { key: "drafts", label: draftItems.length > 0 ? `Drafts (${draftItems.length})` : "Drafts", icon: FileEdit },
          ] as { key: View; label: string; icon: typeof ListIcon }[]).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                view === v.key ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#9CA3AF] hover:text-[#4B5563]",
              ].join(" ")}
            >
              <v.icon size={13} strokeWidth={2.2} />
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {today && (
            <button
              onClick={() => openNewPanel(today.datetime)}
              title={today.why}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.06)] hover:bg-[rgba(124,58,237,0.12)] text-[12px] font-medium text-[#7C3AED] transition-colors"
            >
              {today.chipLabel}
            </button>
          )}
          <NextLink
            href="/content-hub/ideas"
            title="Ideas Board"
            className="p-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[#6B7280] transition-colors"
          >
            <Lightbulb size={15} strokeWidth={2} />
          </NextLink>
          <button
            onClick={openRecurringPanel}
            title="Recurring slots"
            className="p-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[#6B7280] transition-colors"
          >
            <Repeat size={15} strokeWidth={2} />
          </button>
          <button
            onClick={openQueuePanel}
            title="Queue settings"
            className="p-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[#6B7280] transition-colors"
          >
            <ListOrdered size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => openNewPanel()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_18px_rgba(124,58,237,0.25)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.4} />
            New Post
          </button>
        </div>
      </div>

      {/* Empty-queue nudge — dismissible, once per session */}
      {showEmptyBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.2)]">
          <p className="text-[13px] text-[#4B5563]">
            Nothing scheduled for the next 7 days — want to plan something?
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => openNewPanel()}
              className="text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
            >
              Plan something
            </button>
            <button
              onClick={dismissBanner}
              className="p-1 rounded-md text-[#9CA3AF] hover:text-[#4B5563] hover:bg-white/60 transition-colors"
            >
              <X size={13} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && view === "list" && (
        <>
          {scheduled.filter((s) => s.status !== "cancelled" && s.status !== "draft").length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
                <CalendarIcon size={20} className="text-[#7C3AED]" strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-medium text-[#6B7280]">Nothing scheduled yet</p>
                <p className="text-[13px] text-[#ADA99F] max-w-xs">
                  Pick something you&apos;ve already generated and put it on the calendar.
                </p>
              </div>
              <button
                onClick={() => openNewPanel()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors"
              >
                <Plus size={14} strokeWidth={2.4} />
                New Post
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <GroupSection
                title="This Week"
                items={grouped.thisWeek}
                onReschedule={openEditPanel}
                onRemove={(item) => void handleRemove(item)}
                removingId={removingId}
              />
              <GroupSection
                title="Next Week"
                items={grouped.nextWeek}
                onReschedule={openEditPanel}
                onRemove={(item) => void handleRemove(item)}
                removingId={removingId}
              />
              <GroupSection
                title="Later"
                items={grouped.later}
                onReschedule={openEditPanel}
                onRemove={(item) => void handleRemove(item)}
                removingId={removingId}
              />
              <GroupSection
                title="Past"
                items={grouped.past}
                onReschedule={openEditPanel}
                onRemove={(item) => void handleRemove(item)}
                removingId={removingId}
              />
            </div>
          )}
        </>
      )}

      {/* Calendar views (Month/Week) */}
      {!loading && (view === "month" || view === "week") && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[#6B7280] transition-colors"
              >
                <ChevronLeft size={14} strokeWidth={2.2} />
              </button>
              <button
                onClick={goToday}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#4B5563] transition-colors"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[#6B7280] transition-colors"
              >
                <ChevronRight size={14} strokeWidth={2.2} />
              </button>
            </div>
            <span className="text-[13px] font-semibold text-[#0A0A0A]">{cursorLabel}</span>
          </div>

          {view === "month" ? (
            <MonthGrid
              monthAnchor={cursorDate}
              scheduled={scheduled}
              recurringSlots={recurringSlots}
              onDayClick={openDayPanel}
              onItemClick={openEditPanel}
              onDropItem={(id, day) => void handleDropOnDay(id, day)}
              onFillRecurring={openNewPanelForDay}
            />
          ) : (
            <WeekGrid
              weekAnchor={cursorDate}
              scheduled={scheduled}
              recurringSlots={recurringSlots}
              onDayClick={openDayPanel}
              onItemClick={openEditPanel}
              onDropItem={(id, day) => void handleDropOnDay(id, day)}
              onFillRecurring={openNewPanelForDay}
            />
          )}
        </div>
      )}

      {/* Drafts view — picked up and scheduled later, never auto-published */}
      {!loading && view === "drafts" && (
        <>
          {draftItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
                <FileEdit size={20} className="text-[#7C3AED]" strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-medium text-[#6B7280]">No drafts</p>
                <p className="text-[13px] text-[#ADA99F] max-w-xs">
                  Save a post here when you&apos;re not ready to lock in a time yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {draftItems.map((item) => (
                <ScheduledRow
                  key={item.id}
                  item={item}
                  onReschedule={openEditPanel}
                  onRemove={(i) => void handleRemove(i)}
                  isRemoving={removingId === item.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit side panel ── */}
      {panel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={closePanel} />
          <div className="relative w-full max-w-md h-full bg-[#FFFDF8] border-l border-[#E5E3DE] shadow-[-12px_0_40px_rgba(10,10,10,0.12)] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DE] flex-shrink-0">
              <h2 className="text-[15px] font-bold text-[#0A0A0A]">
                {panel.mode === "edit"
                  ? panel.item.status === "draft"
                    ? "Schedule Draft"
                    : "Reschedule"
                  : panel.mode === "day"
                    ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(
                        panel.date,
                      )
                    : panel.mode === "recurring"
                      ? "Recurring Slots"
                      : panel.mode === "queue"
                        ? "Queue Settings"
                        : "New Post"}
              </h2>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-5">
              {/* Recurring mode — "post automatically every [days] at [time]
                  on [platform]", kept to one simple list + one simple form. */}
              {panel.mode === "recurring" && (
                <div className="flex flex-col gap-4">
                  <p className="text-[13px] text-[#6B7280] leading-[1.5]">
                    Post automatically on the days and time you pick — CarouseLabs fills each slot with
                    your most recent unscheduled content.
                  </p>

                  {recurringSlots.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {recurringSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={[
                            "flex items-center gap-3 p-3 rounded-xl border bg-white transition-colors",
                            slot.active ? "border-[#E5E3DE]" : "border-[#E5E3DE] opacity-60",
                          ].join(" ")}
                        >
                          <PlatformBadge platform={slot.platform} />
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{slot.label}</p>
                            <p className="text-[11px] text-[#9CA3AF]">
                              Every {formatDaysOfWeek(slot.daysOfWeek)} at {formatTimeOfDay(slot.timeOfDay)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => void toggleSlotActive(slot)}
                              title={slot.active ? "Pause" : "Resume"}
                              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
                            >
                              {slot.active ? (
                                <Pause size={13} strokeWidth={2} />
                              ) : (
                                <Play size={13} strokeWidth={2} />
                              )}
                            </button>
                            <button
                              onClick={() => startEditSlot(slot)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors"
                            >
                              <Pencil size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => void deleteSlot(slot.id)}
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

                  {!recurringFormOpen ? (
                    <button
                      onClick={startNewSlot}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)] hover:bg-[rgba(124,58,237,0.08)] text-[13px] font-medium text-[#7C3AED] transition-colors"
                    >
                      <Plus size={14} strokeWidth={2.2} />
                      New Recurring Slot
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-white">
                      <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">
                        {editingSlotId ? "Edit slot" : "New slot"}
                      </p>
                      <input
                        value={slotLabel}
                        onChange={(e) => setSlotLabel(e.target.value)}
                        placeholder="Label (optional)"
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                      />
                      <div className="flex items-center gap-1">
                        {DAY_ABBR.map((label, d) => (
                          <button
                            key={d}
                            onClick={() => toggleSlotDay(d)}
                            className={[
                              "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                              slotDays.includes(d)
                                ? "bg-[#7C3AED] text-white"
                                : "bg-[#F4F2EC] text-[#9CA3AF] hover:text-[#4B5563]",
                            ].join(" ")}
                          >
                            {label[0]}
                          </button>
                        ))}
                      </div>
                      <input
                        type="time"
                        value={slotTime}
                        onChange={(e) => setSlotTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                      />
                      <select
                        value={slotPlatform}
                        onChange={(e) => setSlotPlatform(e.target.value as Platform)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                      >
                        {PLATFORM_ORDER.map((p) => (
                          <option key={p} value={p}>
                            {PLATFORM_META[p].label}
                            {!PLATFORM_META[p].functional ? " (not connected yet)" : ""}
                          </option>
                        ))}
                      </select>
                      {slotError && (
                        <div className="px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
                          {slotError}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void submitSlotForm()}
                          disabled={slotSubmitting}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
                        >
                          {slotSubmitting ? (
                            <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
                          ) : editingSlotId ? (
                            "Save Slot"
                          ) : (
                            "Add Slot"
                          )}
                        </button>
                        <button
                          onClick={() => setRecurringFormOpen(false)}
                          className="px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors"
                        >
                          Cancel
                        </button>
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
                />
              )}

              {/* Day mode — that day's full schedule, no wizard steps */}
              {panel.mode === "day" && (
                <div className="flex flex-col gap-3">
                  {itemsForDay(scheduled, panel.date).length === 0 ? (
                    <p className="text-[13px] text-[#9CA3AF] text-center py-8">Nothing scheduled this day.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {itemsForDay(scheduled, panel.date).map((item) => (
                        <ScheduledRow
                          key={item.id}
                          item={item}
                          onReschedule={openEditPanel}
                          onRemove={(i) => void handleRemove(i)}
                          isRemoving={removingId === item.id}
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
                      <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">
                        Step 1 · Choose content
                      </p>
                      <button
                        onClick={() => chooseContentSource("pick")}
                        className="flex flex-col items-start gap-1 p-4 rounded-xl border border-[#E5E3DE] bg-white hover:border-[#7C3AED] transition-colors text-left"
                      >
                        <span className="text-[13px] font-semibold text-[#0A0A0A]">
                          Pick from your generated content
                        </span>
                        <span className="text-[11px] text-[#9CA3AF]">
                          Schedule a caption, image, or carousel you&apos;ve already created
                        </span>
                      </button>
                      <button
                        onClick={() => chooseContentSource("custom")}
                        className="flex flex-col items-start gap-1 p-4 rounded-xl border border-[#E5E3DE] bg-white hover:border-[#7C3AED] transition-colors text-left"
                      >
                        <span className="text-[13px] font-semibold text-[#0A0A0A]">Create a Custom Post</span>
                        <span className="text-[11px] text-[#9CA3AF]">
                          For content you&apos;ve made yourself outside CarouseLabs
                        </span>
                      </button>
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
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => setContentSource(null)}
                        className="self-start text-[11px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
                      >
                        ← Back
                      </button>
                      <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">
                        Step 1 · Pick content
                      </p>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          value={postSearch}
                          onChange={(e) => setPostSearch(e.target.value)}
                          placeholder="Search your posts…"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                        />
                      </div>

                      {loadingPosts ? (
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-lg bg-[#F1EFE9] animate-pulse" />
                          ))}
                        </div>
                      ) : filteredPickablePosts.length === 0 ? (
                        <p className="text-[13px] text-[#9CA3AF] text-center py-8">
                          {pickablePosts.length === 0
                            ? "No generated posts yet — create one from Generate first."
                            : "No posts match your search."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {filteredPickablePosts.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => selectPost(p)}
                              className="flex flex-col gap-1 text-left group"
                            >
                              <div className="relative aspect-square rounded-lg overflow-hidden border border-[#E5E3DE] bg-[#F4F2EC] group-hover:border-[#7C3AED] transition-colors">
                                {p.imageUrls[0] ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={p.imageUrls[0]} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={16} className="text-[#ADA99F]" />
                                  </div>
                                )}
                                {p.format === "CUSTOM" && (
                                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-[rgba(10,10,10,0.75)] text-[9px] font-semibold text-white tracking-wide">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <span className="text-[10.5px] text-[#6B7280] truncate">
                                {FORMAT_LABELS[p.format]}
                              </span>
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
                  <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">
                    Step 2 · Pick platform
                  </p>
                  <button
                    onClick={() => selectPlatform("linkedin")}
                    className="flex items-center gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-white hover:border-[#0A66C2] transition-colors text-left"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                      <PlatformIcon platform="linkedin" size={16} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[#0A0A0A]">LinkedIn</span>
                      <span className="text-[11px] text-[#9CA3AF]">
                        {linkedInConnected === false ? "Not connected — connects at Settings" : "Ready to schedule"}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-[#E5E3DE] bg-[#F9F7F2] opacity-70">
                    <span className="w-9 h-9 rounded-full bg-[#E1306C] flex items-center justify-center flex-shrink-0">
                      <Camera size={15} className="text-white" strokeWidth={2.2} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[#0A0A0A]">Instagram</span>
                      <span className="text-[11px] text-[#9CA3AF]">Connect Instagram to schedule here</span>
                    </span>
                  </div>
                  {linkedInConnected === false && (
                    <p className="text-[11px] text-[#9CA3AF]">
                      You can still pick LinkedIn and connect it before this post&apos;s scheduled time in{" "}
                      <a href="/settings/account" className="text-[#7C3AED] underline">
                        Settings
                      </a>
                      .
                    </p>
                  )}
                </div>
              )}

              {/* Step 3 — date/time + preview */}
              {panel.mode !== "day" &&
                step === 3 &&
                (contentSource === "custom" ? customPlatforms.length > 0 : !!(selectedPost && selectedPlatform)) && (
                <div className="flex flex-col gap-4">
                  <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">
                    {panel.mode === "edit" ? "New date & time" : "Step 3 · Date & time"}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                    />
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="w-32 px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                    />
                  </div>

                  {suggestions.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] text-[#ADA99F]">Or pick a suggested time:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s) => (
                          <button
                            key={s.datetime}
                            onClick={() => {
                              const inputs = isoToLocalInputs(s.datetime)
                              setDateValue(inputs.date)
                              setTimeValue(inputs.time)
                            }}
                            title={s.why}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.04)] text-[11px] font-medium text-[#6B7280] hover:text-[#7C3AED] transition-colors"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">Preview</p>
                    <div className="rounded-xl border border-[#E5E3DE] bg-white p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                          style={{
                            background:
                              contentSource === "custom"
                                ? PLATFORM_META[customPlatforms[0]].color
                                : PLATFORM_META[selectedPlatform!].color,
                          }}
                        >
                          {(user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-semibold text-[#0A0A0A] truncate">
                            {user?.name || "You"}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF]">Scheduled · 🌐</span>
                        </div>
                      </div>
                      {(contentSource === "custom" ? customCaption : selectedPost?.caption) && (
                        <p className="text-[13px] text-[#374151] leading-[1.5] whitespace-pre-wrap line-clamp-6">
                          {contentSource === "custom" ? customCaption : selectedPost?.caption}
                        </p>
                      )}
                      {(contentSource === "custom" ? customImages[0] : selectedPost?.imageUrls[0]) && (
                        <div className="rounded-lg overflow-hidden border border-[#E5E3DE]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={contentSource === "custom" ? customImages[0] : selectedPost?.imageUrls[0]}
                            alt=""
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                      {contentSource === "custom" && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {customPlatforms.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-[#F4F2EC] text-[11px] font-medium text-[#4B5563]"
                            >
                              <PlatformBadge platform={p} size={16} />
                              {PLATFORM_META[p].label}
                              {!PLATFORM_META[p].functional && <span className="text-[#D97706]">· pending</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {panelError && (
                    <div className="px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
                      {panelError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom composer footer — "Continue" hands off to the shared
                date/time + Schedule/Save-as-Draft step below */}
            {panel.mode === "new" && step === 1 && contentSource === "custom" && (
              <div className="px-5 py-4 border-t border-[#E5E3DE] flex-shrink-0">
                <button
                  onClick={continueCustomComposer}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_18px_rgba(124,58,237,0.25)] transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Footer — one obvious primary action, plus a secondary "back"/"remove" where relevant */}
            {panel.mode !== "day" &&
              step === 3 &&
              (contentSource === "custom" ? customPlatforms.length > 0 : !!(selectedPost && selectedPlatform)) && (
              <div className="flex items-center gap-2 px-5 py-4 border-t border-[#E5E3DE] flex-shrink-0 flex-wrap">
                <button
                  onClick={() => void handleSchedule()}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 shadow-[0_0_18px_rgba(124,58,237,0.25)] transition-colors"
                >
                  {submitting && !savingAsDraft && !addingToQueue ? (
                    <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
                  ) : panel.mode === "edit" ? (
                    panel.item.status === "draft" ? "Schedule" : "Save New Time"
                  ) : (
                    "Schedule"
                  )}
                </button>
                {panel.mode === "edit" && (
                  <button
                    onClick={() => void handleRemove(panel.item)}
                    disabled={removingId === panel.item.id}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[rgba(239,68,68,0.06)] hover:border-[rgba(239,68,68,0.3)] text-[12px] font-medium text-[#6B7280] hover:text-[rgba(239,68,68,0.9)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingId === panel.item.id && <Loader2 size={12} className="animate-spin" />}
                    {removingId === panel.item.id ? "Removing…" : "Remove"}
                  </button>
                )}
                {panel.mode === "new" && (
                  <button
                    onClick={() => void handleAddToQueue()}
                    disabled={submitting}
                    title={
                      queueSlots.filter((s) => s.active).length === 0
                        ? "No active queue slots yet — add one via Queue Settings"
                        : undefined
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToQueue && <Loader2 size={12} className="animate-spin" />}
                    {addingToQueue ? "Adding…" : "Add to Queue"}
                  </button>
                )}
                {panel.mode === "new" && (
                  <button
                    onClick={() => void handleSchedule(true)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingAsDraft && <Loader2 size={12} className="animate-spin" />}
                    {savingAsDraft ? "Saving…" : "Save as Draft"}
                  </button>
                )}
              </div>
            )}

            {/* Day mode footer — the one obvious next action for this panel */}
            {panel.mode === "day" && (
              <div className="px-5 py-4 border-t border-[#E5E3DE] flex-shrink-0">
                <button
                  onClick={() => openNewPanelForDay(panel.date)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_18px_rgba(124,58,237,0.25)] transition-colors"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  Add here
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
