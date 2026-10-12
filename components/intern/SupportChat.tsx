"use client"

// /intern — collapsible Support section: a lightweight two-way help-desk
// chat with the admin, styled after the Thumbnail feature's conversational
// UI (same bubble/input treatment). Fetches its own thread client-side so
// the server page doesn't need a second DB round trip just for this.
import { useEffect, useRef, useState } from "react"
import { Headset, Send, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"

type Message = {
  id: string
  sender: "intern" | "admin"
  message: string
  read: boolean
  createdAt: string
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function SupportChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const markedRef = useRef(false)

  const load = async () => {
    try {
      const res = await fetch("/api/intern/messages")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.messages)
    } catch {
      setMessages([])
    }
  }

  // `load` is also called after sending a message and after marking replies
  // read, so it can't be inlined as a .then() chain without duplicating fetch
  // logic — same pattern as BroadcastComposer's loadHistory.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" })
  }, [open, messages?.length])

  const unreadCount = (messages ?? []).filter((m) => m.sender === "admin" && !m.read).length

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0 && !markedRef.current) {
      markedRef.current = true
      fetch("/api/intern/messages", { method: "PATCH" })
        .then(() => load())
        .catch(() => {})
    }
  }

  const send = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/intern/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })
      if (!res.ok) throw new Error()
      setText("")
      await load()
    } catch {
      setError("Failed to send your message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface">
      <button type="button" onClick={toggleOpen} aria-expanded={open} className="flex w-full items-center gap-3 p-5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-raised">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <Headset size={18} className="text-brand" strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-body font-semibold text-foreground">Support</h2>
            {unreadCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-caption text-muted-foreground">Have a question or ran into an issue? Message us here.</p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-5">
          {messages === null ? (
            <div className="flex items-center justify-center gap-2 py-8 text-label text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-label text-muted-foreground">
                  No messages yet — send us a note below and we&apos;ll get back to you.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-1 max-w-[85%] ${
                      m.sender === "intern" ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div
                      className={`px-3.5 py-2.5 rounded-card text-label leading-[1.55] whitespace-pre-wrap ${
                        m.sender === "intern"
                          ? "bg-brand text-white rounded-br-md"
                          : "bg-surface text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{fmtTime(m.createdAt)}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {error && <p className="text-caption text-danger">{error}</p>}

          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={2}
              placeholder="Type your message…"
              aria-label="Type your message…"
              className={cn(controlClasses, "flex-1 resize-none px-3.5 py-2.5 leading-relaxed")}
            />
            <Button
              variant="brand"
              size="icon"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              aria-label="Send"
            >
              {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
