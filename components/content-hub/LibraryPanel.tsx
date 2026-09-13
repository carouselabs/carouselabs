"use client"

// Content Hub Library — Templates, Tags, and Hashtag Groups management,
// tabbed into one panel so the top bar doesn't need a separate icon per
// resource type. Each tab is a simple list + inline add form; editing is
// delete-and-recreate rather than full inline editing, to keep this simple.
import { useState } from "react"
import { Loader2, Plus, Trash2, Hash, Copy, Check, Link2 } from "lucide-react"

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F4F2EC] border border-[#E5E3DE] self-start">
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
            onClick={() => setTab(t.key)}
            className={[
              "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              tab === t.key ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#9CA3AF] hover:text-[#4B5563]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="flex flex-col gap-3">
          {templates.length > 0 && (
            <div className="flex flex-col gap-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E3DE] bg-white">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{t.name}</p>
                    <p className="text-[11px] text-[#9CA3AF] line-clamp-2">{t.caption}</p>
                  </div>
                  <button
                    onClick={() => onDeleteTemplate(t.id)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)]">
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
            <textarea
              value={templateCaption}
              onChange={(e) => setTemplateCaption(e.target.value)}
              placeholder="Caption text…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
            />
            {templateError && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{templateError}</p>}
            <button
              onClick={() => void submitTemplate()}
              disabled={savingTemplate}
              className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {savingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.4} />}
              Save Template
            </button>
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
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px] font-medium text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name}
                  <button
                    onClick={() => onDeleteTag(t.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors"
                  >
                    <Trash2 size={9} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)]">
            <input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Tag name (e.g. Launch campaign)"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
            <div className="flex items-center gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTagColor(c)}
                  className={[
                    "w-6 h-6 rounded-full flex-shrink-0 transition-transform",
                    tagColor === c ? "ring-2 ring-offset-1 ring-[#0A0A0A] scale-110" : "",
                  ].join(" ")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {tagError && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{tagError}</p>}
            <button
              onClick={() => void submitTag()}
              disabled={savingTag}
              className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {savingTag ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.4} />}
              Add Tag
            </button>
          </div>
        </div>
      )}

      {tab === "hashtags" && (
        <div className="flex flex-col gap-3">
          {hashtagGroups.length > 0 && (
            <div className="flex flex-col gap-2">
              {hashtagGroups.map((g) => (
                <div key={g.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E3DE] bg-white">
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{g.name}</p>
                    <p className="text-[11px] text-[#9CA3AF] line-clamp-2">{g.hashtags.join(" ")}</p>
                  </div>
                  <button
                    onClick={() => onDeleteHashtagGroup(g.id)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)]">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (e.g. LinkedIn growth)"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
            <div className="relative">
              <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADA99F]" />
              <input
                value={groupHashtags}
                onChange={(e) => setGroupHashtags(e.target.value)}
                placeholder="linkedin growth marketing (space or comma separated)"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
              />
            </div>
            {groupError && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{groupError}</p>}
            <button
              onClick={() => void submitGroup()}
              disabled={savingGroup}
              className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {savingGroup ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.4} />}
              Save Group
            </button>
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="flex flex-col gap-3">
          {shortLinks.length > 0 && (
            <div className="flex flex-col gap-2">
              {shortLinks.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E3DE] bg-white">
                  <Link2 size={14} className="text-[#7C3AED] flex-shrink-0" strokeWidth={2} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <p className="text-[13px] font-medium text-[#0A0A0A] truncate">/l/{l.slug}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{l.targetUrl}</p>
                  </div>
                  <span className="text-[11px] text-[#ADA99F] flex-shrink-0">
                    {l.clickCount} click{l.clickCount === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => void copyShortLink(l)}
                    title="Copy"
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors flex-shrink-0"
                  >
                    {copiedId === l.id ? (
                      <Check size={13} className="text-[#10B981]" />
                    ) : (
                      <Copy size={13} strokeWidth={2} />
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteShortLink(l.id)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)]">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/your-long-link"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowUtm((v) => !v)}
              className="self-start text-[11px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
            >
              {showUtm ? "Hide UTM parameters" : "Add UTM parameters (optional)"}
            </button>
            {showUtm && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  placeholder="utm_source"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white text-[12px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
                <input
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  placeholder="utm_medium"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white text-[12px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
                <input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="utm_campaign"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white text-[12px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
              </div>
            )}
            {linkError && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{linkError}</p>}
            <button
              onClick={() => void submitLink()}
              disabled={savingLink}
              className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {savingLink ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.4} />}
              Shorten Link
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
