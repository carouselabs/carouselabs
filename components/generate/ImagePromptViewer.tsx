"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"

interface ImagePromptViewerProps {
  prompt: string
}

export function ImagePromptViewer({ prompt }: ImagePromptViewerProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <span className="text-[11px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-widest">
          Image Prompt Used
        </span>
        {open ? (
          <ChevronUp size={14} className="text-[rgba(255,255,255,0.25)]" strokeWidth={2} />
        ) : (
          <ChevronDown size={14} className="text-[rgba(255,255,255,0.25)]" strokeWidth={2} />
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
