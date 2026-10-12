"use client"

// Content Hub "Create a Custom Post" screen — for content the user made
// themselves outside CarouseLabs. No AI generation, no character limit beyond
// what's genuinely needed, no credit charge. See app/api/content-hub/custom-post
// for how this becomes a real Post record, and _client.tsx's handleSchedule
// for how it flows into the same date/time + Schedule/Save-as-Draft step used
// for AI-generated content.
import { useRef, useState } from "react"
import { Loader2, FileText, Hash, ChevronDown, Link2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BackButton, FieldLabel } from "@/components/create/CreateKit"
import { PLATFORM_ORDER, PLATFORM_META, PLATFORM_LIMITS, validatePostForPlatform, type Platform } from "@/lib/platforms"
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
    } catch (err) {
      setShortenError(err instanceof Error ? err.message : "Could not save the template. Please try again.")
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
    const current = el.value
    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? current.length
    onCaptionChange(current.slice(0, start) + text + current.slice(end))
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
    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    const original = pasted.trim()
    const inserted = el.value.slice(0, start) + original + el.value.slice(end)
    // Paste immediately. A delayed shortener must never overwrite subsequent typing.
    onCaptionChange(inserted)
    try {
      const shortUrl = await onShortenUrl(original, {})
      if (textareaRef.current?.value === inserted) {
        onCaptionChange(inserted.slice(0, start) + shortUrl + inserted.slice(start + original.length))
      }
    } catch { /* Keep the original, valid URL already pasted into the editor. */ }
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
  // Per-platform caption overrides (when customizing) each get validated
  // against their OWN text, never the shared default — an empty override
  // falls back to the shared caption, same as what actually gets posted.
  function effectiveCaptionFor(platform: Platform): string {
    if (customizePerPlatform && platformCaptions[platform]?.trim()) return platformCaptions[platform]!
    return caption
  }

  function counterColor(len: number, max: number): string {
    if (len > max) return "text-danger"
    if (len >= max * 0.9) return "text-warning"
    return "text-success"
  }

  const toolClasses = buttonVariants({ variant: "ghost", size: "xs", className: "px-2 text-brand hover:bg-brand-soft hover:text-brand" })

  return (
    <div className="flex flex-col gap-5">
      {shortenError && <p role="alert" className="text-caption text-danger">{shortenError}</p>}
      <BackButton arrow={false} onClick={onBack}>
        ← Back
      </BackButton>
      <h3 className="text-label font-semibold text-foreground">Create a Custom Post</h3>

      <CustomPostImageUploader images={images} onAdd={onAddImage} onRemove={onRemoveImage} platforms={platforms} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <FieldLabel htmlFor="custom-post-caption">Caption</FieldLabel>
          <div className="-mr-2 flex flex-wrap items-center">
            {templates.length > 0 && (
              <DropdownMenu open={showLoadTemplate} onOpenChange={setShowLoadTemplate}>
                <DropdownMenuTrigger render={<button type="button" className={toolClasses} />}>
                  <FileText aria-hidden />
                  Load Template
                  <ChevronDown aria-hidden className="-ml-0.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-60 w-60">
                  {templates.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        onCaptionChange(t.caption)
                        setShowLoadTemplate(false)
                      }}
                      className="flex-col items-start gap-0.5"
                    >
                      <span className="w-full truncate text-label font-medium text-foreground">{t.name}</span>
                      <span className="w-full truncate text-caption text-muted-foreground">{t.caption}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {hashtagGroups.length > 0 && (
              <DropdownMenu open={showHashtagPicker} onOpenChange={setShowHashtagPicker}>
                <DropdownMenuTrigger render={<button type="button" className={toolClasses} />}>
                  <Hash aria-hidden />
                  Hashtags
                  <ChevronDown aria-hidden className="-ml-0.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-60 w-60">
                  {hashtagGroups.map((g) => (
                    <DropdownMenuItem key={g.id} onClick={() => insertHashtags(g)} className="flex-col items-start gap-0.5">
                      <span className="w-full truncate text-label font-medium text-foreground">{g.name}</span>
                      <span className="w-full truncate text-caption text-muted-foreground">{g.hashtags.join(" ")}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              type="button"
              aria-expanded={showShortenLink}
              onClick={() => setShowShortenLink((v) => !v)}
              className={toolClasses}
            >
              <Link2 aria-hidden />
              Insert Short Link
            </button>
            <button
              type="button"
              aria-expanded={showSaveTemplate}
              onClick={() => setShowSaveTemplate((v) => !v)}
              className={buttonVariants({ variant: "ghost", size: "xs", className: "px-2 text-muted-foreground" })}
            >
              Save as Template
            </button>
          </div>
        </div>
        <textarea
          id="custom-post-caption"
          ref={textareaRef}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          onPaste={(e) => void handlePaste(e)}
          placeholder="Write your caption… (pasting a bare link auto-shortens it)"
          rows={6}
          className={cn(controlClasses, "h-auto resize-y px-3 py-2.5 leading-relaxed")}
        />
        {showShortenLink && (
          <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-raised p-3">
            <input
              value={shortenUrlInput}
              onChange={(e) => setShortenUrlInput(e.target.value)}
              placeholder="https://example.com/your-long-link"
              aria-label="https://example.com/your-long-link"
              className={cn(controlClasses, "h-10 px-3")}
            />
            <div className="grid grid-cols-3 gap-1.5">
              <input
                value={shortenUtmSource}
                onChange={(e) => setShortenUtmSource(e.target.value)}
                placeholder="utm_source"
                aria-label="utm_source"
                className={cn(controlClasses, "h-9 px-2.5 text-caption")}
              />
              <input
                value={shortenUtmMedium}
                onChange={(e) => setShortenUtmMedium(e.target.value)}
                placeholder="utm_medium"
                aria-label="utm_medium"
                className={cn(controlClasses, "h-9 px-2.5 text-caption")}
              />
              <input
                value={shortenUtmCampaign}
                onChange={(e) => setShortenUtmCampaign(e.target.value)}
                placeholder="utm_campaign"
                aria-label="utm_campaign"
                className={cn(controlClasses, "h-9 px-2.5 text-caption")}
              />
            </div>
            {shortenError && <p className="text-caption text-danger">{shortenError}</p>}
            <Button variant="brand" size="sm" className="self-start" onClick={() => void handleShortenAndInsert()} disabled={shortening}>
              {shortening && <Loader2 className="animate-spin" aria-hidden />}
              Shorten &amp; Insert
            </Button>
          </div>
        )}
        {showSaveTemplate && (
          <div className="flex items-center gap-2">
            <input
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value)}
              placeholder="Template name"
              aria-label="Template name"
              className={cn(controlClasses, "h-9 flex-1 px-2.5")}
            />
            <Button
              variant="brand"
              size="sm"
              onClick={() => void handleSaveTemplate()}
              disabled={savingTemplate || !templateNameInput.trim() || !caption.trim()}
            >
              {savingTemplate && <Loader2 className="animate-spin" aria-hidden />}
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>Platforms</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_ORDER.map((platform) => {
            const meta = PLATFORM_META[platform]
            const checked = platforms.includes(platform)
            const limits = PLATFORM_LIMITS[platform]
            const effectiveCaption = effectiveCaptionFor(platform)
            const len = effectiveCaption.trim().length
            const validation = checked ? validatePostForPlatform(effectiveCaption, images.length, platform) : null
            return (
              <div
                key={platform}
                className={cn(
                  "flex flex-col rounded-control border transition-colors duration-(--motion-fast)",
                  checked ? "border-brand/50 bg-brand-soft" : "border-border bg-surface-raised hover:border-control-border"
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onTogglePlatform(platform)}
                  className="flex w-full items-center gap-2 rounded-control p-2.5 text-left"
                >
                  <PlatformBadge platform={platform} size={22} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-caption font-semibold text-foreground">{meta.label}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {meta.functional
                        ? linkedInConnected === false
                          ? "Not connected"
                          : "Ready to post"
                        : "Connect to enable"}
                    </span>
                  </span>
                  {checked && (
                    <span className={`ml-auto text-[11px] font-medium tabular-nums ${counterColor(len, limits.maxChars)}`}>
                      {len.toLocaleString()}/{limits.maxChars.toLocaleString()}
                    </span>
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-(--motion-fast)",
                      checked ? "border-brand bg-brand text-brand-foreground" : "ml-auto border-control-border"
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
                {checked && validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                  <div className="-mt-1 flex flex-col gap-0.5 px-2.5 pb-2">
                    {validation.errors.map((msg, i) => (
                      <p key={`e${i}`} className="text-[11px] leading-snug text-danger">
                        {msg}
                      </p>
                    ))}
                    {validation.warnings.map((msg, i) => (
                      <p key={`w${i}`} className="text-[11px] leading-snug text-warning">
                        {msg}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-caption text-muted-foreground">
          Platforms marked &quot;Connect to enable&quot; are saved as pending — CarouseLabs will publish there
          automatically once that connection is available.
        </p>
      </div>

      {platforms.length > 1 && (
        <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-raised p-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={customizePerPlatform}
              onChange={(e) => onToggleCustomizePerPlatform(e.target.checked)}
              className="size-4 accent-brand"
            />
            <span className="text-caption font-medium text-foreground">Customize caption per platform</span>
          </label>
          {customizePerPlatform && (
            <div className="flex flex-col gap-3 pt-1">
              {platforms.map((platform) => {
                const overrideLen = (platformCaptions[platform] ?? caption).trim().length
                const overrideMax = PLATFORM_LIMITS[platform].maxChars
                return (
                  <div key={platform} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                      <PlatformBadge platform={platform} size={16} />
                      {PLATFORM_META[platform].label}
                      <span className={`ml-auto tabular-nums ${counterColor(overrideLen, overrideMax)}`}>
                        {overrideLen.toLocaleString()}/{overrideMax.toLocaleString()}
                      </span>
                    </span>
                    <textarea
                      value={platformCaptions[platform] ?? ""}
                      onChange={(e) => onPlatformCaptionChange(platform, e.target.value)}
                      placeholder={caption || "Same as default caption"}
                      aria-label={PLATFORM_META[platform].label}
                      rows={2}
                      className={cn(controlClasses, "h-auto resize-y px-2.5 py-2 text-caption")}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-control-sm border border-danger/25 bg-danger-soft px-3 py-2.5 text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
