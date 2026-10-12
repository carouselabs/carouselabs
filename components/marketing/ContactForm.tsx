"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"

import { controlClasses } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"

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

  // Visible copy is unchanged; the sr-only labels give each field an
  // accessible name (placeholders alone aren't one).
  const fieldClass = `${controlClasses} px-4 py-3`

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-card border border-[color-mix(in_oklab,var(--success),transparent_70%)] bg-success-soft p-6">
        <p className="text-body font-semibold text-success">Message sent ✓</p>
        <p className="text-label text-muted-foreground">
          Thanks for reaching out — we&apos;ve received your message and will reply to your email
          within 2–3 business days.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-1 self-start text-label font-medium text-foreground hover:underline"
        >
          Send another message
        </button>
      </div>
    )
  }

  const sending = status === "sending"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label htmlFor="contact-name" className="sr-only">Your name</label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={fieldClass}
        />
        <label htmlFor="contact-email" className="sr-only">Your email</label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldClass}
        />
      </div>

      <label htmlFor="contact-subject" className="sr-only">Subject</label>
      <select
        id="contact-subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
        className={`${fieldClass} appearance-none cursor-pointer`}
      >
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label htmlFor="contact-message" className="sr-only">How can we help?</label>
      <textarea
        id="contact-message"
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
        aria-busy={sending || undefined}
        className={buttonVariants({ size: "lg", className: "self-start" })}
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2.1} />}
        {sending ? "Sending…" : "Send Message"}
      </button>

      {status === "error" && error && (
        <p role="alert" className="text-label font-medium text-danger">{error}</p>
      )}
    </form>
  )
}
