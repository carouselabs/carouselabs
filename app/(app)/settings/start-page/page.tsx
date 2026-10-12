"use client"

// Settings > Start Page — simple link-in-bio editor. Public page lives at
// app/(marketing)/start/[slug]/page.tsx; this is the owner-only editor.
import { useEffect, useRef, useState } from "react"
import {
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  ImageIcon,
  Check,
  X,
} from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { START_PAGE_THEMES, type StartPageTheme } from "@/lib/startPage"

interface StartPageLink {
  id: string
  label: string
  url: string
  order: number
  clickCount: number
}

interface StartPageData {
  id: string
  slug: string
  title: string | null
  bio: string | null
  avatarUrl: string | null
  theme: StartPageTheme
  links: StartPageLink[]
}

const THEME_LABELS: Record<StartPageTheme, string> = {
  default: "Default (cream & purple)",
  dark: "Dark",
  minimal: "Minimal",
}

async function compressToBase64(file: File, maxSize = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function StartPageEditor() {
  const [startPage, setStartPage] = useState<StartPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Claim form (no Start Page yet)
  const [claimSlug, setClaimSlug] = useState("")
  const [claiming, setClaiming] = useState(false)

  // Editor fields
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [bio, setBio] = useState("")
  const [theme, setTheme] = useState<StartPageTheme>("default")
  // Tagged with the exact slug it's FOR, so a stale result from a slug the
  // user has since changed away from never gets displayed (derived below
  // rather than reset via a synchronous setState in the effect).
  const [slugCheck, setSlugCheck] = useState<{ slug: string; status: "checking" | "available" | "taken" } | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Add-link form
  const [newLabel, setNewLabel] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [addingLink, setAddingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/start-page")
        const data = await res.json()
        if (!res.ok) throw new Error()
        const sp = (data as { startPage: StartPageData | null }).startPage
        if (active && sp) {
          setStartPage(sp)
          setSlug(sp.slug)
          setTitle(sp.title ?? "")
          setBio(sp.bio ?? "")
          setTheme(sp.theme)
        }
      } catch {
        if (active) setError("Failed to load your Start Page")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Debounced slug availability check, skipped entirely while it still
  // matches the saved value (nothing to warn about). Every setState call
  // here happens inside the deferred setTimeout callback, never
  // synchronously in the effect body itself — the displayed status
  // (slugStatus below) is derived from comparing slugCheck.slug to the
  // current slug, rather than this effect resetting state to "idle" itself.
  useEffect(() => {
    const trimmed = slug.trim()
    if (!startPage || trimmed === startPage.slug || !trimmed) return

    const t = setTimeout(async () => {
      setSlugCheck({ slug: trimmed, status: "checking" })
      try {
        const res = await fetch(`/api/start-page/check-slug?slug=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        setSlugCheck({ slug: trimmed, status: (data as { available?: boolean }).available ? "available" : "taken" })
      } catch {
        setSlugCheck(null)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [slug, startPage])

  const slugStatus: "idle" | "checking" | "available" | "taken" =
    !startPage || slug.trim() === startPage.slug || !slug.trim()
      ? "idle"
      : slugCheck && slugCheck.slug === slug.trim()
        ? slugCheck.status
        : "idle"

  async function handleClaim() {
    if (!claimSlug.trim()) return
    setClaiming(true)
    setError(null)
    try {
      const res = await fetch("/api/start-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: claimSlug.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to create Start Page")
      const sp = (data as { startPage: StartPageData }).startPage
      setStartPage(sp)
      setSlug(sp.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setClaiming(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/start-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, bio, theme }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save")
      setStartPage((data as { startPage: StartPageData }).startPage)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadingAvatar(true)
    setError(null)
    try {
      const base64 = await compressToBase64(file)
      const uploadRes = await fetch("/api/start-page/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg" }),
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error((uploadData as { error?: string }).error ?? "Upload failed")

      const patchRes = await fetch("/api/start-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: (uploadData as { url: string }).url }),
      })
      const patchData = await patchRes.json()
      if (!patchRes.ok) throw new Error()
      setStartPage((patchData as { startPage: StartPageData }).startPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar")
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleAddLink() {
    if (!newLabel.trim() || !newUrl.trim()) {
      setLinkError("Add both a label and a URL")
      return
    }
    setAddingLink(true)
    setLinkError(null)
    try {
      const res = await fetch("/api/start-page/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), url: newUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to add link")
      setStartPage((prev) =>
        prev ? { ...prev, links: [...prev.links, (data as { link: StartPageLink }).link] } : prev,
      )
      setNewLabel("")
      setNewUrl("")
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAddingLink(false)
    }
  }

  async function handleMoveLink(id: string, direction: "up" | "down") {
    if (!startPage) return
    try {
      const res = await fetch(`/api/start-page/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      })
      if (!res.ok) throw new Error()
      const refreshed = await fetch("/api/start-page")
      const data = await refreshed.json()
      setStartPage((data as { startPage: StartPageData }).startPage)
    } catch {
      setError("Failed to reorder — please try again")
    }
  }

  async function handleDeleteLink(id: string) {
    if (!startPage) return
    const snapshot = startPage
    setStartPage({ ...startPage, links: startPage.links.filter((l) => l.id !== id) })
    try {
      const res = await fetch(`/api/start-page/links/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setStartPage(snapshot)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <SettingsTabs />
        <div className="h-40 rounded-2xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Start Page</h2>
          {startPage && (
            <a
              href={`/start/${startPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
            >
              Preview
              <ExternalLink size={12} strokeWidth={2.2} />
            </a>
          )}
        </div>
        <p className="text-[13px] text-[#6B7280] leading-[1.5]">
          A simple link-in-bio page — one link to put everywhere: your LinkedIn, your website, your latest
          post, whatever you want.
        </p>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
            {error}
          </div>
        )}

        {!startPage ? (
          <div className="flex flex-col gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-white">
            <p className="text-[13px] font-medium text-[#0A0A0A]">Claim your Start Page</p>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#9CA3AF] whitespace-nowrap">carouselabs.com/start/</span>
              <input
                value={claimSlug}
                onChange={(e) => setClaimSlug(e.target.value.toLowerCase())}
                placeholder="your-name"
                className="flex-1 px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
              />
            </div>
            <button
              onClick={() => void handleClaim()}
              disabled={claiming}
              className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {claiming && <Loader2 size={13} className="animate-spin" />}
              Create
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 p-5 rounded-2xl border border-[#E5E3DE] bg-white">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[#E5E3DE] bg-[#F4F2EC] flex items-center justify-center flex-shrink-0">
                  {startPage.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={startPage.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-[#ADA99F]" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={16} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors disabled:opacity-50"
                >
                  <Upload size={12} strokeWidth={2} />
                  Upload avatar
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleAvatarChange(e)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#9CA3AF] whitespace-nowrap">/start/</span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                  />
                  {slugStatus === "checking" && <Loader2 size={14} className="text-[#9CA3AF] animate-spin" />}
                  {slugStatus === "available" && <Check size={14} className="text-[#10B981]" />}
                  {slugStatus === "taken" && <X size={14} className="text-[rgba(239,68,68,0.9)]" />}
                </div>
                {slugStatus === "taken" && (
                  <p className="text-[11px] text-[rgba(239,68,68,0.9)]">That slug is already taken.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Your name or brand"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short line about you"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as StartPageTheme)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                >
                  {START_PAGE_THEMES.map((t) => (
                    <option key={t} value={t}>
                      {THEME_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => void handleSave()}
                disabled={saving || slugStatus === "taken"}
                className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saved ? "Saved!" : "Save"}
              </button>
            </div>

            <div className="flex flex-col gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-white">
              <p className="text-[13px] font-medium text-[#0A0A0A]">Links</p>

              {startPage.links.length > 0 && (
                <div className="flex flex-col gap-2">
                  {startPage.links.map((link, i) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 p-3 rounded-xl border border-[#E5E3DE] bg-[#FBFAF6]"
                    >
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{link.label}</p>
                        <p className="text-[11px] text-[#9CA3AF] truncate">{link.url}</p>
                      </div>
                      <span className="text-[11px] text-[#ADA99F] flex-shrink-0">{link.clickCount} clicks</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => void handleMoveLink(link.id, "up")}
                          disabled={i === 0}
                          className="p-1 rounded text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => void handleMoveLink(link.id, "down")}
                          disabled={i === startPage.links.length - 1}
                          className="p-1 rounded text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F2EC] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => void handleDeleteLink(link.id)}
                          className="p-1 rounded text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)]">
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. My LinkedIn)"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
                {linkError && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{linkError}</p>}
                <button
                  onClick={() => void handleAddLink()}
                  disabled={addingLink}
                  className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
                >
                  {addingLink ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.4} />}
                  Add Link
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
