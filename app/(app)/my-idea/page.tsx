"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"

export default function MyIdeaPage() {
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [pov, setPov] = useState("")
  const [guidelines, setGuidelines] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!topic.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/my-idea/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          pov: pov.trim() || undefined,
          guidelines: guidelines.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to generate breakdown")
      // Keep the loading state up through navigation to the detail page.
      router.push(`/idea/${data.ideaId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setIsGenerating(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="h-12 w-12 rounded-full border-2 border-[rgba(124,58,237,0.25)] border-t-[#7C3AED] animate-spin" />
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-[rgba(255,255,255,0.8)]">
            Researching and building your breakdown…
          </p>
          <p className="text-[13px] text-[rgba(255,255,255,0.35)] max-w-sm">
            We&apos;re searching for real facts and writing a full deep dive. This can take up to a minute.
          </p>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to dashboard
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-bold text-[rgba(255,255,255,0.92)] leading-[1.3] tracking-[-0.01em]">
          Start with your own idea
        </h1>
        <p className="text-[14px] text-[rgba(255,255,255,0.45)] leading-[1.55]">
          Have a story or topic in mind? Tell us about it and we&apos;ll build the full content for you.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Topic (required) */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.7)]">
            What is your idea or topic?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            placeholder="e.g. I just closed my first $100k deal. Here's what I learned..."
            className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[14px] text-[rgba(255,255,255,0.85)] leading-[1.6] resize-none placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
          />
        </div>

        {/* POV (optional) */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.7)]">
            What&apos;s your angle or POV?{" "}
            <span className="text-[rgba(255,255,255,0.3)] font-normal">(optional)</span>
          </label>
          <textarea
            value={pov}
            onChange={(e) => setPov(e.target.value)}
            rows={3}
            placeholder="e.g. Most people think X but actually Y..."
            className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[14px] text-[rgba(255,255,255,0.85)] leading-[1.6] resize-none placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
          />
        </div>

        {/* Guidelines (optional) */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.7)]">
            Any specific points to cover?{" "}
            <span className="text-[rgba(255,255,255,0.3)] font-normal">(optional)</span>
          </label>
          <textarea
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            rows={3}
            placeholder="e.g. Include stats about AI adoption, mention the cost savings..."
            className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[14px] text-[rgba(255,255,255,0.85)] leading-[1.6] resize-none placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!topic.trim()}
          className={[
            "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
            topic.trim()
              ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.22)]"
              : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          {isGenerating ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2} />
          ) : (
            <Sparkles size={14} strokeWidth={2} />
          )}
          Generate Breakdown →
        </button>
      </div>
    </div>
  )
}
