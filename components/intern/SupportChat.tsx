"use client"

// /intern — collapsible Support section: a lightweight two-way help-desk
// chat with the admin, styled after the Thumbnail feature's conversational
// UI (same bubble/input treatment). Fetches its own thread client-side so
// the server page doesn't need a second DB round trip just for this.
import { useEffect, useRef, useState } from "react"
import { Headset, Send, ChevronDown, Loader2 } from "lucide-react"

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
    <div className="rounded-2xl border border-[#E5E3DE] bg-white overflow-hidden">
      <button onClick={toggleOpen} className="flex w-full items-center gap-3 p-4 sm:p-5 text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/10">
          <Headset size={18} className="text-[#7C3AED]" strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Support</h2>
            {unreadCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C3AED] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[#6B7280]">Have a question or ran into an issue? Message us here.</p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-[#E5E3DE] p-4 sm:p-5 flex flex-col gap-4">
          {messages === null ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#9CA3AF]">
              <Loader2 size={14} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF]">
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
                      className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-[1.55] whitespace-pre-wrap ${
                        m.sender === "intern"
                          ? "bg-[#7C3AED] text-white rounded-br-md"
                          : "bg-[#F4F2EC] text-[#374151] rounded-bl-md"
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[10.5px] text-[#9CA3AF]">{fmtTime(m.createdAt)}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {error && <p className="text-[12.5px] text-red-600">{error}</p>}

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
              className="flex-1 resize-none rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] px-3.5 py-2.5 text-[13px] text-[#374151] placeholder:text-[#ADA99F] outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
            />
            <button
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : (
                <Send size={14} className="text-white" strokeWidth={2.2} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
