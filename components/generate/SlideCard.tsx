"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"

interface SlideCardProps {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  prompt: string
}

const ROLE_CONFIG = {
  hook: {
    label: "HOOK",
    className:
      "bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] text-[#FCD34D]",
  },
  body: {
    label: "BODY",
    className:
      "bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.3)] text-[#A5B4FC]",
  },
  cta: {
    label: "CTA",
    className:
      "bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.3)] text-[#6EE7B7]",
  },
}

export function SlideCard({ slideNumber, role, headline, prompt }: SlideCardProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.body

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        {/* Slide number */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[11px] font-semibold text-[rgba(255,255,255,0.4)] tabular-nums">
          {slideNumber}
        </span>

        {/* Role badge */}
        <span
          className={[
            "flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider",
            roleConfig.className,
          ].join(" ")}
        >
          {roleConfig.label}
        </span>

        {/* Headline */}
        <span className="flex-1 text-[13px] font-medium text-[rgba(255,255,255,0.72)] truncate">
          {headline}
        </span>

        {/* Chevron */}
        {open ? (
          <ChevronUp size={14} className="flex-shrink-0 text-[rgba(255,255,255,0.25)]" strokeWidth={2} />
        ) : (
          <ChevronDown size={14} className="flex-shrink-0 text-[rgba(255,255,255,0.25)]" strokeWidth={2} />
        )}
      </button>

      {open && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-4 flex flex-col gap-3">
          <p className="text-[12px] text-[rgba(255,255,255,0.38)] leading-[1.75] whitespace-pre-wrap">
            {prompt}
          </p>
          <button
            onClick={handleCopy}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-[11px] font-medium text-[rgba(255,255,255,0.42)] transition-colors"
          >
            {copied ? (
              <Check size={11} strokeWidth={2.5} className="text-green-400" />
            ) : (
              <Copy size={11} strokeWidth={2} />
            )}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      )}
    </div>
  )
}
