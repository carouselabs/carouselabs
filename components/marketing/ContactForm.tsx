"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"

const SUBJECTS = ["General", "Billing", "Technical", "Feature Request"] as const

export function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("General")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("sending")
    setError(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Failed to send message")
      }
      setStatus("sent")
      setName("")
      setEmail("")
      setSubject("General")
      setMessage("")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const fieldClass =
    "w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#FFFDF8] text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A1A1A] transition-colors"

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-3 p-6 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4]">
        <p className="text-[15px] font-semibold text-[#15803D]">Message sent ✓</p>
        <p className="text-[13px] text-[#6B7280] leading-[1.6]">
          Thanks for reaching out — we&apos;ve received your message and will reply to your email
          within 2–3 business days.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="self-start mt-1 text-[13px] font-medium text-[#1A1A1A] hover:underline"
        >
          Send another message
        </button>
      </div>
    )
  }

  const sending = status === "sending"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={fieldClass}
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldClass}
        />
      </div>

      <select
        value={subject}
        onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
        className={`${fieldClass} appearance-none cursor-pointer`}
      >
        {SUBJECTS.map((s) => (
          <option key={s} value={s} className="bg-[#FFFDF8] text-[#0A0A0A]">
            {s}
          </option>
        ))}
      </select>

      <textarea
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="How can we help?"
        rows={6}
        className={`${fieldClass} resize-y`}
      />

      <button
        type="submit"
        disabled={sending}
        className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A1A1A] hover:bg-black text-[14px] font-semibold text-white transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.12)] disabled:opacity-60"
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2.1} />}
        {sending ? "Sending…" : "Send Message"}
      </button>

      {status === "error" && error && (
        <p className="text-[13px] text-[rgba(239,68,68,0.9)]">{error}</p>
      )}
    </form>
  )
}
