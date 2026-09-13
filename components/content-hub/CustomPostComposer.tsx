"use client"

// Content Hub "Create a Custom Post" screen — for content the user made
// themselves outside CarouseLabs. No AI generation, no character limit beyond
// what's genuinely needed, no credit charge. See app/api/content-hub/custom-post
// for how this becomes a real Post record, and _client.tsx's handleSchedule
// for how it flows into the same date/time + Schedule/Save-as-Draft step used
// for AI-generated content.
import { useRef, useState } from "react"
import { Loader2, FileText, Hash, ChevronDown, Link2 } from "lucide-react"
import { PLATFORM_ORDER, PLATFORM_META, type Platform } from "@/lib/platforms"
import { PlatformBadge } from "./platforms"
import { CustomPostImageUploader } from "./CustomPostImageUploader"
import type { PostTemplateSummary, HashtagGroupSummary } from "./LibraryPanel"

// A paste is auto-shortened only when the ENTIRE clipboard content is just a
// URL — not when a URL appears mixed into a larger block of pasted text,
// which would need fragile substring surgery to handle safely.
const BARE_URL_RE = /^https?:\/\/\S+$/i

interface CustomPostComposerProps {
  caption: string
  onCaptionChange: (v: string) => void
  images: string[]
  onAddImage: (url: string) => void
  onRemoveImage: (url: string) => void
  platforms: Platform[]
  onTogglePlatform: (p: Platform) => void
  customizePerPlatform: boolean
  onToggleCustomizePerPlatform: (v: boolean) => void
  platformCaptions: Partial<Record<Platform, string>>
  onPlatformCaptionChange: (platform: Platform, value: string) => void
  linkedInConnected: boolean | null
  error: string | null
  onBack: () => void
  templates: PostTemplateSummary[]
  onSaveTemplate: (name: string, caption: string) => Promise<void>
  hashtagGroups: HashtagGroupSummary[]
  onShortenUrl: (url: string, utm: { source?: string; medium?: string; campaign?: string }) => Promise<string>
}

export function CustomPostComposer({
  caption,
  onCaptionChange,
  images,
  onAddImage,
  onRemoveImage,
  platforms,
  onTogglePlatform,
  customizePerPlatform,
  onToggleCustomizePerPlatform,
  platformCaptions,
  onPlatformCaptionChange,
  linkedInConnected,
  error,
  onBack,
  templates,
  onSaveTemplate,
  hashtagGroups,
  onShortenUrl,
}: CustomPostComposerProps) {
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateNameInput, setTemplateNameInput] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showLoadTemplate, setShowLoadTemplate] = useState(false)
  const [showHashtagPicker, setShowHashtagPicker] = useState(false)
  const [showShortenLink, setShowShortenLink] = useState(false)
  const [shortenUrlInput, setShortenUrlInput] = useState("")
  const [shortenUtmSource, setShortenUtmSource] = useState("")
  const [shortenUtmMedium, setShortenUtmMedium] = useState("")
  const [shortenUtmCampaign, setShortenUtmCampaign] = useState("")
  const [shortening, setShortening] = useState(false)
  const [shortenError, setShortenError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSaveTemplate() {
    if (!templateNameInput.trim() || !caption.trim()) return
    setSavingTemplate(true)
    try {
      await onSaveTemplate(templateNameInput.trim(), caption.trim())
      setShowSaveTemplate(false)
      setTemplateNameInput("")
    } finally {
      setSavingTemplate(false)
    }
  }

  function insertHashtags(group: HashtagGroupSummary) {
    const insertion = group.hashtags.join(" ")
    onCaptionChange(caption.trim() ? `${caption.trim()}\n\n${insertion}` : insertion)
    setShowHashtagPicker(false)
  }

  // Inserts `text` at the caption's current cursor position (replacing any
  // selection), falling back to appending at the end if the textarea ref
  // isn't available for some reason.
  function insertAtCursor(text: string) {
    const el = textareaRef.current
    if (!el) {
      onCaptionChange(caption ? `${caption} ${text}` : text)
      return
    }
    const start = el.selectionStart ?? caption.length
    const end = el.selectionEnd ?? caption.length
    onCaptionChange(caption.slice(0, start) + text + caption.slice(end))
    // Restore focus + cursor right after the inserted text, next tick (after
    // the value prop has actually updated the DOM).
    const cursor = start + text.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text")
    if (!BARE_URL_RE.test(pasted.trim())) return // let the normal paste happen
    e.preventDefault()
    try {
      const shortUrl = await onShortenUrl(pasted.trim(), {})
      insertAtCursor(shortUrl)
    } catch {
      // Shortening failed — fall back to inserting the original URL so the
      // paste isn't silently swallowed.
      insertAtCursor(pasted.trim())
    }
  }

  async function handleShortenAndInsert() {
    if (!shortenUrlInput.trim()) {
      setShortenError("Add a URL to shorten")
      return
    }
    setShortening(true)
    setShortenError(null)
    try {
      const shortUrl = await onShortenUrl(shortenUrlInput.trim(), {
        source: shortenUtmSource,
        medium: shortenUtmMedium,
        campaign: shortenUtmCampaign,
      })
      insertAtCursor(shortUrl)
      setShowShortenLink(false)
      setShortenUrlInput("")
      setShortenUtmSource("")
      setShortenUtmMedium("")
      setShortenUtmCampaign("")
    } catch (err) {
      setShortenError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setShortening(false)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="self-start text-[11px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        ← Back
      </button>
      <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">Create a Custom Post</p>

      <CustomPostImageUploader images={images} onAdd={onAddImage} onRemove={onRemoveImage} />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Caption</label>
          <div className="flex items-center gap-1.5">
            {templates.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLoadTemplate((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium text-[#7C3AED] hover:bg-[rgba(124,58,237,0.08)] transition-colors"
                >
                  <FileText size={11} strokeWidth={2.2} />
                  Load Template
                  <ChevronDown size={10} strokeWidth={2.2} />
                </button>
                {showLoadTemplate && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-56 max-h-48 overflow-y-auto rounded-lg border border-[#E5E3DE] bg-white shadow-lg py-1">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onCaptionChange(t.caption)
                          setShowLoadTemplate(false)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#F4F2EC] transition-colors"
                      >
                        <p className="text-[12px] font-medium text-[#0A0A0A] truncate">{t.name}</p>
                        <p className="text-[10.5px] text-[#9CA3AF] truncate">{t.caption}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {hashtagGroups.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHashtagPicker((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium text-[#7C3AED] hover:bg-[rgba(124,58,237,0.08)] transition-colors"
                >
                  <Hash size={11} strokeWidth={2.2} />
                  Hashtags
                  <ChevronDown size={10} strokeWidth={2.2} />
                </button>
                {showHashtagPicker && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-56 max-h-48 overflow-y-auto rounded-lg border border-[#E5E3DE] bg-white shadow-lg py-1">
                    {hashtagGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => insertHashtags(g)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F4F2EC] transition-colors"
                      >
                        <p className="text-[12px] font-medium text-[#0A0A0A] truncate">{g.name}</p>
                        <p className="text-[10.5px] text-[#9CA3AF] truncate">{g.hashtags.join(" ")}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShortenLink((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium text-[#7C3AED] hover:bg-[rgba(124,58,237,0.08)] transition-colors"
              >
                <Link2 size={11} strokeWidth={2.2} />
                Insert Short Link
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowSaveTemplate((v) => !v)}
              className="text-[10.5px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors px-2 py-1"
            >
              Save as Template
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          onPaste={(e) => void handlePaste(e)}
          placeholder="Write your caption… (pasting a bare link auto-shortens it)"
          rows={5}
          className="w-full px-3 py-2.5 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
        />
        {showShortenLink && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-[#E5E3DE] bg-[#FBFAF6]">
            <input
              value={shortenUrlInput}
              onChange={(e) => setShortenUrlInput(e.target.value)}
              placeholder="https://example.com/your-long-link"
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white text-[12px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <input
                value={shortenUtmSource}
                onChange={(e) => setShortenUtmSource(e.target.value)}
                placeholder="utm_source"
                className="w-full px-2 py-1 rounded-md border border-[#E5E3DE] bg-white text-[11px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
              />
              <input
                value={shortenUtmMedium}
                onChange={(e) => setShortenUtmMedium(e.target.value)}
                placeholder="utm_medium"
                className="w-full px-2 py-1 rounded-md border border-[#E5E3DE] bg-white text-[11px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
              />
              <input
                value={shortenUtmCampaign}
                onChange={(e) => setShortenUtmCampaign(e.target.value)}
                placeholder="utm_campaign"
                className="w-full px-2 py-1 rounded-md border border-[#E5E3DE] bg-white text-[11px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
              />
            </div>
            {shortenError && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{shortenError}</p>}
            <button
              type="button"
              onClick={() => void handleShortenAndInsert()}
              disabled={shortening}
              className="self-start inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {shortening && <Loader2 size={11} className="animate-spin" />}
              Shorten &amp; Insert
            </button>
          </div>
        )}
        {showSaveTemplate && (
          <div className="flex items-center gap-2">
            <input
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value)}
              placeholder="Template name"
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white text-[12px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
            <button
              type="button"
              onClick={() => void handleSaveTemplate()}
              disabled={savingTemplate || !templateNameInput.trim() || !caption.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {savingTemplate && <Loader2 size={11} className="animate-spin" />}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Platforms</p>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_ORDER.map((platform) => {
            const meta = PLATFORM_META[platform]
            const checked = platforms.includes(platform)
            return (
              <button
                key={platform}
                type="button"
                onClick={() => onTogglePlatform(platform)}
                className={[
                  "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors",
                  checked
                    ? "border-[rgba(124,58,237,0.5)] bg-[rgba(124,58,237,0.05)]"
                    : "border-[#E5E3DE] bg-white hover:border-[#D1CFC8]",
                ].join(" ")}
              >
                <PlatformBadge platform={platform} size={22} />
                <span className="flex flex-col min-w-0">
                  <span className="text-[12.5px] font-semibold text-[#0A0A0A] truncate">{meta.label}</span>
                  <span className="text-[10px] text-[#9CA3AF] truncate">
                    {meta.functional
                      ? linkedInConnected === false
                        ? "Not connected"
                        : "Ready to post"
                      : "Connect to enable"}
                  </span>
                </span>
                <span
                  className={[
                    "ml-auto w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors",
                    checked ? "bg-[#7C3AED] border-[#7C3AED]" : "border-[#D1D5DB]",
                  ].join(" ")}
                >
                  {checked && <span className="w-1.5 h-1.5 rounded-sm bg-white" />}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">
          Platforms marked &quot;Connect to enable&quot; are saved as pending — CarouseLabs will publish there
          automatically once that connection is available.
        </p>
      </div>

      {platforms.length > 1 && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-[#E5E3DE] bg-[#FBFAF6]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customizePerPlatform}
              onChange={(e) => onToggleCustomizePerPlatform(e.target.checked)}
              className="accent-[#7C3AED]"
            />
            <span className="text-[12px] font-medium text-[#374151]">Customize caption per platform</span>
          </label>
          {customizePerPlatform && (
            <div className="flex flex-col gap-2.5 pt-1">
              {platforms.map((platform) => (
                <div key={platform} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-[#6B7280] flex items-center gap-1.5">
                    <PlatformBadge platform={platform} size={16} />
                    {PLATFORM_META[platform].label}
                  </span>
                  <textarea
                    value={platformCaptions[platform] ?? ""}
                    onChange={(e) => onPlatformCaptionChange(platform, e.target.value)}
                    placeholder={caption || "Same as default caption"}
                    rows={2}
                    className="w-full px-2.5 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[12.5px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}
    </div>
  )
}
