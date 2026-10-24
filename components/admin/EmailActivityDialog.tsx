"use client"

// One sent email's history (/api/admin/email-activity): when it went, each
// time the person saw it and clicked (with the link and the app or device),
// and what security scanners and Apple Mail did, each with its time and how
// long after sending. Opened from SeenStatus's History.
import { useEffect, useState } from "react"
import { Eye, Link2, MailOpen, MousePointerClick, Send, ShieldCheck } from "lucide-react"
import { Modal } from "@/components/admin/ui"

type Item = { at: string; what: "seen" | "clicked" | "scanner" | "apple" | "visited"; link: string | null; app: string | null; reason: string | null; count: number }
type Activity = { sentAt: string | null; items: Item[] }

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })

/** "18 sec after sending", "5 min after", "2 h 10 min after", "3 days after". */
export function afterSending(at: string, sentAt: string | null): string | null {
  if (!sentAt) return null
  const s = Math.round((new Date(at).getTime() - new Date(sentAt).getTime()) / 1000)
  if (s < 0) return null
  if (s < 60) return `${s} sec after sending`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min after sending`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h${m % 60 ? ` ${m % 60} min` : ""} after sending`
  return `${Math.round(h / 24)} days after sending`
}

const shortLink = (link: string | null) => (link ? link.replace(/^https:\/\/(www\.)?carouselabs\.com/, "") || "carouselabs.com" : "a link")

function line(item: Item) {
  switch (item.what) {
    case "seen":
      return { icon: <Eye className="size-4 text-success" aria-hidden />, text: "Seen", muted: false }
    case "clicked":
      return { icon: <MousePointerClick className="size-4 text-brand" aria-hidden />, text: `Clicked ${shortLink(item.link)}`, muted: false }
    case "scanner":
      return {
        icon: <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />,
        text: `A security scanner checked it${item.count > 1 ? ` (${item.count} times)` : ""}`,
        muted: true,
      }
    case "apple":
      return { icon: <MailOpen className="size-4 text-muted-foreground" aria-hidden />, text: "Apple Mail opened it by itself (can't tell if they read it)", muted: true }
    case "visited":
      return { icon: <Link2 className="size-4 text-muted-foreground" aria-hidden />, text: `Visited ${shortLink(item.link)}, not counted (no browser check)`, muted: true }
  }
}

export function EmailActivityDialog({ kind, id, who, onClose }: { kind: "campaign" | "personal"; id: string; who: string; onClose: () => void }) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/admin/email-activity?kind=${kind}&id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? "Couldn't load the history")
        if (live) setActivity(body)
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't load the history"))
    return () => {
      live = false
    }
  }, [kind, id])

  return (
    <Modal open onClose={onClose} title={`History: ${who}`}>
      {error && <p className="text-caption text-danger">{error}</p>}
      {!activity && !error && <p className="text-caption text-muted-foreground">Loading…</p>}
      {activity && (
        <ol className="flex flex-col gap-3" aria-label="What happened">
          {activity.sentAt && (
            <li className="flex gap-3">
              <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex flex-col">
                <span className="text-label text-foreground">Sent</span>
                <span className="text-caption text-muted-foreground">{when(activity.sentAt)}</span>
              </span>
            </li>
          )}
          {activity.items.map((item, i) => {
            const { icon, text, muted } = line(item)
            const after = afterSending(item.at, activity.sentAt)
            return (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <span className="flex min-w-0 flex-col">
                  <span className={`text-label ${muted ? "text-muted-foreground" : "text-foreground"}`}>
                    {text}
                    {item.app && <span className="text-muted-foreground"> · {item.app}</span>}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {when(item.at)}
                    {after ? ` · ${after}` : ""}
                    {item.what === "scanner" && item.reason ? ` · ${item.reason.toLowerCase()}` : ""}
                  </span>
                </span>
              </li>
            )
          })}
          {activity.items.length === 0 && <li className="text-caption text-muted-foreground">Nothing yet: not seen or clicked.</li>}
        </ol>
      )}
      <p className="mt-4 text-caption text-muted-foreground/80">
        Gmail only tells us about the first time it&apos;s opened; every click comes through.
      </p>
    </Modal>
  )
}
