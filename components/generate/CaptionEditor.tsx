"use client"

import { useEffect, useRef, useState } from "react"
import { Copy, Check, Save, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ActionBar, captionFieldClasses } from "@/components/create/CreateKit"
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
  /** Lets the page disable Regenerate while a save is in flight (as before). */
  onSavingChange?: (saving: boolean) => void
}

/**
 * The caption as the canvas: the text itself, its character count, and the
 * finishing actions (Copy, Save Draft, Post to LinkedIn, Schedule for Later)
 * in a bar that stays in reach while you edit.
 */
export function CaptionEditor({
  caption,
  onChange,
  isGenerating,
  onSave,
  onSavingChange,
}: CaptionEditorProps) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCaption, setSavedCaption] = useState<string | null>(null)
  const saved = savedCaption === caption
  const saveInFlight = useRef<Promise<string> | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    onSavingChange?.(saving)
  }, [saving, onSavingChange])

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
    <div className="flex flex-col gap-3">
      <p className="text-caption font-medium text-muted-foreground">Caption</p>

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
            captionFieldClasses,
            "min-h-[22rem] resize-y bg-surface-raised p-5 md:min-h-[26rem] md:p-6 md:text-body md:leading-relaxed",
            isNearLimit && "border-warning/60"
          )}
        />
        {isGenerating && caption.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col gap-2.5 p-5 md:p-6" aria-hidden>
            {SKELETON_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-3.5 animate-pulse rounded-full bg-skeleton motion-reduce:animate-none"
                style={{ width: w }}
              />
            ))}
          </div>
        )}
      </div>

      {saveError && (
        <p role="alert" className="text-caption text-danger">
          {saveError}
        </p>
      )}

      <ActionBar
        start={
          <p className="flex items-center gap-1.5 text-caption tabular-nums" aria-live="polite">
            <span className={cn(isOverLimit ? "text-danger" : isNearLimit ? "text-warning" : "text-muted-foreground")}>
              {charCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground/70">/ {MAX_CHARS.toLocaleString()}</span>
            {isOverLimit && <span className="ml-1 font-medium text-danger">Too long for LinkedIn</span>}
            {isNearLimit && <span className="ml-1 font-medium text-warning">Approaching limit</span>}
          </p>
        }
      >
        {/* Copy */}
        <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!caption || isGenerating}>
          {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied!" : "Copy"}
        </Button>

        {/* Save */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!caption || isOverLimit || isGenerating || saving}
          aria-busy={saving || undefined}
          className={cn(saved && "border-success/40 bg-success-soft text-success hover:bg-success-soft")}
        >
          {saving ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
          ) : saved ? (
            <Check aria-hidden />
          ) : (
            <Save aria-hidden />
          )}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Draft"}
        </Button>

        {/* Schedule for Later — saves (or reuses) the Post, then deep-links
            into Content Hub with it pre-selected */}
        <ScheduleForLaterButton getPostId={savePost} disabled={!caption || isGenerating || isOverLimit || saving} />

        {/* Post to LinkedIn — text-only post (no images in this flow) */}
        <PostToLinkedInButton caption={caption} disabled={!caption || isGenerating || isOverLimit || saving} />
      </ActionBar>
    </div>
  )
}
