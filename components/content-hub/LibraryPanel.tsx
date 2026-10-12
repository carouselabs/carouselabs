"use client"

// Content Hub Library — Templates, Tags, and Hashtag Groups management,
// tabbed into one panel so the top bar doesn't need a separate icon per
// resource type. Each tab is a simple list + inline add form; editing is
// delete-and-recreate rather than full inline editing, to keep this simple.
import { useState } from "react"
import { Loader2, Plus, Trash2, Hash, Copy, Check, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { fieldClasses, iconAction } from "./hubStyles"

export interface PostTemplateSummary {
  id: string
  name: string
  caption: string
}

export interface PostTagSummary {
  id: string
  name: string
  color: string
}

export interface HashtagGroupSummary {
  id: string
  name: string
  hashtags: string[]
}

export interface ShortLinkSummary {
  id: string
  slug: string
  targetUrl: string
  clickCount: number
}

const TAG_COLORS = ["#7C3AED", "#0A66C2", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#0EA5E9"]

type Tab = "templates" | "tags" | "hashtags" | "links"

interface LibraryPanelProps {
  templates: PostTemplateSummary[]
  tags: PostTagSummary[]
  hashtagGroups: HashtagGroupSummary[]
  shortLinks: ShortLinkSummary[]
  onCreateTemplate: (name: string, caption: string) => Promise<void>
  onDeleteTemplate: (id: string) => void
  onCreateTag: (name: string, color: string) => Promise<void>
  onDeleteTag: (id: string) => void
  onCreateHashtagGroup: (name: string, hashtags: string[]) => Promise<void>
  onDeleteHashtagGroup: (id: string) => void
  onCreateShortLink: (
    targetUrl: string,
    utm: { source?: string; medium?: string; campaign?: string },
  ) => Promise<ShortLinkSummary>
  onDeleteShortLink: (id: string) => void
}

export function LibraryPanel({
  templates,
  tags,
  hashtagGroups,
  shortLinks,
  onCreateTemplate,
  onDeleteTemplate,
  onCreateTag,
  onDeleteTag,
  onCreateHashtagGroup,
  onDeleteHashtagGroup,
  onCreateShortLink,
  onDeleteShortLink,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<Tab>("templates")

  // Template form
  const [templateName, setTemplateName] = useState("")
  const [templateCaption, setTemplateCaption] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // Tag form
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState(TAG_COLORS[0])
  const [savingTag, setSavingTag] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)

  // Hashtag group form
  const [groupName, setGroupName] = useState("")
  const [groupHashtags, setGroupHashtags] = useState("")
  const [savingGroup, setSavingGroup] = useState(false)
  const [groupError, setGroupError] = useState<string | null>(null)

  // Short link form
  const [linkUrl, setLinkUrl] = useState("")
  const [showUtm, setShowUtm] = useState(false)
  const [utmSource, setUtmSource] = useState("")
  const [utmMedium, setUtmMedium] = useState("")
  const [utmCampaign, setUtmCampaign] = useState("")
  const [savingLink, setSavingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function submitTemplate() {
    if (!templateName.trim() || !templateCaption.trim()) {
      setTemplateError("Add both a name and a caption")
      return
    }
    setSavingTemplate(true)
    setTemplateError(null)
    try {
      await onCreateTemplate(templateName.trim(), templateCaption.trim())
      setTemplateName("")
      setTemplateCaption("")
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSavingTemplate(false)
    }
  }

  async function submitTag() {
    if (!tagName.trim()) {
      setTagError("Add a name")
      return
    }
    setSavingTag(true)
    setTagError(null)
    try {
      await onCreateTag(tagName.trim(), tagColor)
      setTagName("")
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSavingTag(false)
    }
  }

  async function submitGroup() {
    const hashtags = groupHashtags
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean)
    if (!groupName.trim() || hashtags.length === 0) {
      setGroupError("Add a name and at least one hashtag")
      return
    }
    setSavingGroup(true)
    setGroupError(null)
    try {
      await onCreateHashtagGroup(groupName.trim(), hashtags)
      setGroupName("")
      setGroupHashtags("")
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSavingGroup(false)
    }
  }

  async function submitLink() {
    if (!linkUrl.trim()) {
      setLinkError("Add a URL to shorten")
      return
    }
    setSavingLink(true)
    setLinkError(null)
    try {
      await onCreateShortLink(linkUrl.trim(), { source: utmSource, medium: utmMedium, campaign: utmCampaign })
      setLinkUrl("")
      setUtmSource("")
      setUtmMedium("")
      setUtmCampaign("")
      setShowUtm(false)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSavingLink(false)
    }
  }

  function shortUrlFor(slug: string): string {
    return typeof window !== "undefined" ? `${window.location.origin}/l/${slug}` : `/l/${slug}`
  }

  async function copyShortLink(link: ShortLinkSummary) {
    try {
      await navigator.clipboard.writeText(shortUrlFor(link.slug))
      setCopiedId(link.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // clipboard access denied — the link is still visible to copy manually
    }
  }

  const addFormClasses = "flex flex-col gap-2 rounded-card border border-dashed border-brand/35 bg-brand-soft/40 p-3"
  const listClasses = "flex flex-col divide-y divide-border rounded-card border border-border bg-surface-raised"
  const deleteClasses = cn(iconAction, "shrink-0 hover:bg-danger-soft hover:text-danger")

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Library" className="inline-flex self-start rounded-control border border-border bg-surface p-1">
        {(
          [
            { key: "templates", label: "Templates" },
            { key: "tags", label: "Tags" },
            { key: "hashtags", label: "Hashtags" },
            { key: "links", label: "Short Links" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className="inline-flex h-8 items-center rounded-control-sm px-2.5 text-caption font-medium whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="flex flex-col gap-3">
          {templates.length > 0 && (
            <ul className={listClasses}>
              {templates.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-label font-medium text-foreground">{t.name}</p>
                    <p className="line-clamp-2 text-caption text-muted-foreground">{t.caption}</p>
                  </div>
                  <button type="button" onClick={() => onDeleteTemplate(t.id)} aria-label="Delete" title="Delete" className={deleteClasses}>
                    <Trash2 aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={addFormClasses}>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              aria-label="Template name"
              className={fieldClasses}
            />
            <textarea
              value={templateCaption}
              onChange={(e) => setTemplateCaption(e.target.value)}
              placeholder="Caption text…"
              aria-label="Caption text…"
              rows={3}
              className={cn(controlClasses, "resize-y px-3 py-2")}
            />
            {templateError && <p className="text-caption text-danger">{templateError}</p>}
            <Button variant="brand" size="sm" className="self-start" onClick={() => void submitTemplate()} disabled={savingTemplate}>
              {savingTemplate ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Save Template
            </Button>
          </div>
        </div>
      )}

      {tab === "tags" && (
        <div className="flex flex-col gap-3">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex h-8 items-center gap-1 rounded-full pr-1 pl-3 text-caption font-medium text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name}
                  <button
                    type="button"
                    onClick={() => onDeleteTag(t.id)}
                    aria-label="Delete"
                    title="Delete"
                    className="flex size-6 items-center justify-center rounded-full transition-colors duration-(--motion-fast) hover:bg-black/20"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className={addFormClasses}>
            <input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Tag name (e.g. Launch campaign)"
              aria-label="Tag name (e.g. Launch campaign)"
              className={fieldClasses}
            />
            <div role="radiogroup" aria-label="Color" className="flex items-center gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={tagColor === c}
                  aria-label={c}
                  onClick={() => setTagColor(c)}
                  className={cn(
                    "size-7 shrink-0 rounded-full transition-transform duration-(--motion-fast)",
                    tagColor === c && "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {tagError && <p className="text-caption text-danger">{tagError}</p>}
            <Button variant="brand" size="sm" className="self-start" onClick={() => void submitTag()} disabled={savingTag}>
              {savingTag ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Add Tag
            </Button>
          </div>
        </div>
      )}

      {tab === "hashtags" && (
        <div className="flex flex-col gap-3">
          {hashtagGroups.length > 0 && (
            <ul className={listClasses}>
              {hashtagGroups.map((g) => (
                <li key={g.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-label font-medium text-foreground">{g.name}</p>
                    <p className="line-clamp-2 text-caption text-muted-foreground">{g.hashtags.join(" ")}</p>
                  </div>
                  <button type="button" onClick={() => onDeleteHashtagGroup(g.id)} aria-label="Delete" title="Delete" className={deleteClasses}>
                    <Trash2 aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={addFormClasses}>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (e.g. LinkedIn growth)"
              aria-label="Group name (e.g. LinkedIn growth)"
              className={fieldClasses}
            />
            <div className="relative">
              <Hash className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={groupHashtags}
                onChange={(e) => setGroupHashtags(e.target.value)}
                placeholder="linkedin growth marketing (space or comma separated)"
                aria-label="linkedin growth marketing (space or comma separated)"
                className={cn(fieldClasses, "pl-8")}
              />
            </div>
            {groupError && <p className="text-caption text-danger">{groupError}</p>}
            <Button variant="brand" size="sm" className="self-start" onClick={() => void submitGroup()} disabled={savingGroup}>
              {savingGroup ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Save Group
            </Button>
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="flex flex-col gap-3">
          {shortLinks.length > 0 && (
            <ul className={listClasses}>
              {shortLinks.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Link2 className="size-4 shrink-0 text-brand" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-label font-medium text-foreground">/l/{l.slug}</p>
                    <p className="truncate text-caption text-muted-foreground">{l.targetUrl}</p>
                  </div>
                  <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                    {l.clickCount} click{l.clickCount === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyShortLink(l)}
                    title="Copy"
                    aria-label="Copy"
                    className={cn(iconAction, "shrink-0")}
                  >
                    {copiedId === l.id ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
                  </button>
                  <button type="button" onClick={() => onDeleteShortLink(l.id)} aria-label="Delete" title="Delete" className={deleteClasses}>
                    <Trash2 aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={addFormClasses}>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/your-long-link"
              aria-label="https://example.com/your-long-link"
              className={fieldClasses}
            />
            <button
              type="button"
              aria-expanded={showUtm}
              onClick={() => setShowUtm((v) => !v)}
              className="self-start rounded-detail text-caption font-medium text-brand underline-offset-4 hover:underline"
            >
              {showUtm ? "Hide UTM parameters" : "Add UTM parameters (optional)"}
            </button>
            {showUtm && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  placeholder="utm_source"
                  aria-label="utm_source"
                  className={cn(controlClasses, "h-9 px-2.5 text-caption")}
                />
                <input
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  placeholder="utm_medium"
                  aria-label="utm_medium"
                  className={cn(controlClasses, "h-9 px-2.5 text-caption")}
                />
                <input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="utm_campaign"
                  aria-label="utm_campaign"
                  className={cn(controlClasses, "h-9 px-2.5 text-caption")}
                />
              </div>
            )}
            {linkError && <p className="text-caption text-danger">{linkError}</p>}
            <Button variant="brand" size="sm" className="self-start" onClick={() => void submitLink()} disabled={savingLink}>
              {savingLink ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Shorten Link
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
