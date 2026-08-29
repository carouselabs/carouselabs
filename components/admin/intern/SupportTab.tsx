"use client"

// Tab — Support: two-way help-desk chat with the intern, admin's side.
// Marks all intern-sent messages read as soon as this tab mounts (i.e. as
// soon as the admin opens it) — the tab is only mounted while active (see
// InternDetail.tsx), so mount === open.
import { useEffect, useRef, useState } from "react"
import { Headset, Send } from "lucide-react"
import { AdminButton, AdminCard, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import type { InternMessageT } from "@/components/admin/intern/types"

export function SupportTab({
  internId,
  messages,
  onRefresh,
}: {
  internId: string
  messages: InternMessageT[]
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const markedRef = useRef(false)

  useEffect(() => {
    if (markedRef.current) return
    markedRef.current = true
    fetch(`/api/admin/interns/${internId}/messages`, { method: "PATCH" }).catch(() => {})
  }, [internId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  const sendReply = async () => {
    const text = reply.trim()
    if (!text) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/interns/${internId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error()
      setReply("")
      onRefresh()
    } catch {
      toast("Failed to send reply", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminCard title="Support">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[12.5px] text-[#8A8A8A]">
          <Headset className="h-4 w-4 text-[#7C3AED]" />
          Conversation with this intern. Replies are emailed to them automatically.
        </div>

        <div className="flex max-h-[420px] min-h-[160px] flex-col gap-3 overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
          {messages.length === 0 ? (
            <p className="text-[12.5px] text-[#6A6A6A]">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex max-w-[80%] flex-col gap-1 ${
                  m.sender === "admin" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.5] ${
                    m.sender === "admin"
                      ? "rounded-br-md bg-[#7C3AED] text-white"
                      : "rounded-bl-md border border-[#2A2A2A] bg-[#232323] text-[#D0D0D0]"
                  }`}
                >
                  {m.message}
                </div>
                <span className="text-[10.5px] text-[#6A6A6A]">{fmtDateTime(m.createdAt)}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void sendReply()
              }
            }}
            rows={3}
            placeholder="Type a reply…"
            className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />
          <div className="flex justify-end">
            <AdminButton loading={sending} disabled={!reply.trim()} onClick={sendReply}>
              <Send className="h-3.5 w-3.5" />
              Reply
            </AdminButton>
          </div>
        </div>
      </div>
    </AdminCard>
  )
}
