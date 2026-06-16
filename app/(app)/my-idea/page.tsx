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
        <div className="h-12 w-12 rounded-full border-2 border-[rgba(26,26,26,0.25)] border-t-[#1A1A1A] animate-spin" />
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-[#1A1A1A]">
            Researching and building your breakdown…
          </p>
          <p className="text-[13px] text-[#9CA3AF] max-w-sm">
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
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to dashboard
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-bold text-[#0A0A0A] leading-[1.3] tracking-[-0.01em]">
          Start with your own idea
        </h1>
        <p className="text-[14px] text-[#6B7280] leading-[1.55]">
          Have a story or topic in mind? Tell us about it and we&apos;ll build the full content for you.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Topic (required) */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#374151]">
            What is your idea or topic?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            placeholder="e.g. I just closed my first $100k deal. Here's what I learned..."
            className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[14px] text-[#0A0A0A] leading-[1.6] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
          />
        </div>

        {/* POV (optional) */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#374151]">
            What&apos;s your angle or POV?{" "}
            <span className="text-[#9CA3AF] font-normal">(optional)</span>
          </label>
          <textarea
            value={pov}
            onChange={(e) => setPov(e.target.value)}
            rows={3}
            placeholder="e.g. Most people think X but actually Y..."
            className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[14px] text-[#0A0A0A] leading-[1.6] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
          />
        </div>

        {/* Guidelines (optional) */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#374151]">
            Any specific points to cover?{" "}
            <span className="text-[#9CA3AF] font-normal">(optional)</span>
          </label>
          <textarea
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            rows={3}
            placeholder="e.g. Include stats about AI adoption, mention the cost savings..."
            className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[14px] text-[#0A0A0A] leading-[1.6] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
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
              ? "bg-[#1A1A1A] hover:bg-[#000000] cursor-pointer shadow-[0_0_24px_rgba(26,26,26,0.22)]"
              : "bg-[rgba(26,26,26,0.3)] cursor-not-allowed opacity-50",
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
