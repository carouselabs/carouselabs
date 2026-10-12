"use client"

import { useRef, useState } from "react"
import { Copy, Check, Save, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PostToLinkedInButton } from "@/components/generate/PostToLinkedInButton"
import { ScheduleForLaterButton } from "@/components/generate/ScheduleForLaterButton"

const WARN_AT = 2500
const MAX_CHARS = 3000
// Same widths used by the image/carousel flows' streaming placeholder, so
// all three generate flows show visually consistent loading feedback.
const SKELETON_WIDTHS = ["88%", "72%", "95%", "65%", "80%", "55%", "70%", "40%"]

interface CaptionEditorProps {
  caption: string
  onChange: (value: string) => void
  isGenerating: boolean
  onSave: (caption: string) => Promise<string>
  onRegenerate: () => void
  regenerateDisabled?: boolean
}

export function CaptionEditor({
  caption,
  onChange,
  isGenerating,
  onSave,
  onRegenerate,
  regenerateDisabled = false,
}: CaptionEditorProps) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCaption, setSavedCaption] = useState<string | null>(null)
  const saved = savedCaption === caption
  const saveInFlight = useRef<Promise<string> | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const charCount = caption.length
  const isOverLimit = charCount > MAX_CHARS
  const isNearLimit = charCount >= WARN_AT && !isOverLimit

  async function handleCopy() {
    if (!caption) return
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setSaveError("Could not copy. Select the caption and copy it manually.")
    }
  }

  async function savePost(): Promise<string> {
    if (saveInFlight.current) return saveInFlight.current
    const submittedCaption = caption
    setSaving(true)
    setSaveError(null)
    const operation = Promise.resolve().then(() => onSave(submittedCaption)).then((id) => {
      setSavedCaption(submittedCaption)
      return id
    }).finally(() => {
      saveInFlight.current = null
      setSaving(false)
    })
    saveInFlight.current = operation
    return operation
  }

  async function handleSave() {
    if (!caption || isOverLimit) return
    try {
      await savePost()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-[#ADA99F] uppercase tracking-widest">
          Caption
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {/* Regenerate */}
          <button
            onClick={onRegenerate}
            disabled={isGenerating || regenerateDisabled || saving}
            title="Regenerate — 1 credit"
            className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg border border-[#E5E3DE] text-[12px] font-medium text-[#6B7280] hover:border-[#DEDBD4] hover:text-[#4B5563] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} strokeWidth={2.2} />
            )}
            Regenerate — 1 credit
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            disabled={!caption || isGenerating}
            className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg border border-[#E5E3DE] text-[12px] font-medium text-[#6B7280] hover:border-[#DEDBD4] hover:text-[#4B5563] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? (
              <Check size={12} strokeWidth={2.5} className="text-[#059669]" />
            ) : (
              <Copy size={12} strokeWidth={2.2} />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!caption || isOverLimit || isGenerating || saving}
            className={cn(
              "flex items-center gap-1.5 h-[30px] px-3 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              saved
                ? "bg-[rgba(110,231,183,0.15)] border border-[rgba(110,231,183,0.3)] text-[#059669]"
                : "bg-[#1A1A1A] hover:bg-[#000000] text-white border border-transparent",
            )}
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : saved ? (
              <Check size={12} strokeWidth={2.5} />
            ) : (
              <Save size={12} strokeWidth={2.2} />
            )}
            {saved ? "Saved!" : saving ? "Saving…" : "Save Draft"}
          </button>

          {/* Post to LinkedIn — text-only post (no images in this flow) */}
          <PostToLinkedInButton caption={caption} disabled={!caption || isGenerating || isOverLimit || saving} />

          {/* Schedule for Later — saves (or reuses) the Post, then deep-links
              into Content Hub with it pre-selected */}
          <ScheduleForLaterButton getPostId={savePost} disabled={!caption || isGenerating || isOverLimit || saving} />
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          aria-label="Caption"
          aria-invalid={isOverLimit}
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          disabled={isGenerating}
          placeholder={isGenerating ? "Generating your caption…" : "Your caption will appear here…"}
          className={cn(
            "w-full min-h-[340px] px-4 py-3.5 rounded-xl text-[14px] leading-[1.65] resize-y outline-none transition-all duration-150",
            "bg-[#F4F2EC] border text-[#1A1A1A]",
            "placeholder:text-[#D6D3CC] disabled:opacity-60",
            isOverLimit
              ? "border-[rgba(239,68,68,0.5)] focus:border-[rgba(239,68,68,0.7)]"
              : isNearLimit
                ? "border-[rgba(251,191,36,0.4)] focus:border-[rgba(251,191,36,0.6)]"
                : "border-[#E5E3DE] focus:border-[rgba(26,26,26,0.5)]",
          )}
        />
        {isGenerating && caption.length === 0 && (
          <div className="absolute inset-0 p-4 flex flex-col gap-2.5 pointer-events-none">
            {SKELETON_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-3.5 rounded-full bg-[#ECEAE4] animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer: char count + save error */}
      <div className="flex items-center justify-between">
        <div>
          {saveError && (
            <p role="alert" className="text-[12px] text-[rgba(239,68,68,0.8)]">{saveError}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[12px] tabular-nums",
              isOverLimit
                ? "text-[rgba(239,68,68,0.8)]"
                : isNearLimit
                  ? "text-[rgba(251,191,36,0.7)]"
                  : "text-[#ADA99F]",
            )}
          >
            {charCount.toLocaleString()}
          </span>
          <span className="text-[12px] text-[#DEDBD4]">
            / {MAX_CHARS.toLocaleString()}
          </span>
          {isOverLimit && (
            <span className="text-[11px] text-[rgba(239,68,68,0.7)] ml-1">
              Too long for LinkedIn
            </span>
          )}
          {isNearLimit && (
            <span className="text-[11px] text-[rgba(251,191,36,0.6)] ml-1">
              Approaching limit
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
