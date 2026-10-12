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
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { SettingsSection } from "@/components/settings/SettingsSection"
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
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <SettingsHeader />
        <div className="h-40 rounded-card bg-surface border border-border animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <SettingsHeader />

      <SettingsSection title="Start Page" description="A simple link-in-bio page — one link to put everywhere: your LinkedIn, your website, your latest post, whatever you want." action={startPage && (
            <a
              href={`/start/${startPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-label font-medium text-brand hover:underline"
            >
              Preview
              <ExternalLink size={12} strokeWidth={2.2} aria-hidden />
            </a>
          )}>
        {error && (
          <div className="px-4 py-3 rounded-control bg-danger-soft border border-danger/25 text-label text-danger">
            {error}
          </div>
        )}

        {!startPage ? (
          <div className="flex flex-col gap-3 p-5 rounded-card border border-border bg-surface-raised">
            <p className="text-label font-medium text-foreground">Claim your Start Page</p>
            <div className="flex items-center gap-2">
              <span className="text-label text-muted-foreground whitespace-nowrap">carouselabs.com/start/</span>
              <input
                value={claimSlug}
                onChange={(e) => setClaimSlug(e.target.value.toLowerCase())}
                placeholder="your-name"
                className="flex-1 px-3 py-2 rounded-control-sm border border-border bg-surface text-label text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <button
              onClick={() => void handleClaim()}
              disabled={claiming}
              className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-control-sm text-caption font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {claiming && <Loader2 size={13} className="animate-spin" />}
              Create
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 p-5 rounded-card border border-border bg-surface-raised">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-border bg-surface flex items-center justify-center flex-shrink-0">
                  {startPage.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={startPage.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-muted-foreground" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                      <Loader2 size={16} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control-sm border border-border bg-surface-raised hover:bg-surface-muted text-caption font-medium text-muted-foreground transition-colors disabled:opacity-50"
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
                <label className="text-caption font-medium text-muted-foreground">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-label text-muted-foreground whitespace-nowrap">/start/</span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    className="flex-1 px-3 py-2 rounded-control-sm border border-border bg-surface text-label text-foreground focus:outline-none focus:border-brand transition-colors"
                  />
                  {slugStatus === "checking" && <Loader2 size={14} className="text-muted-foreground animate-spin" />}
                  {slugStatus === "available" && <Check size={14} className="text-success" />}
                  {slugStatus === "taken" && <X size={14} className="text-danger" />}
                </div>
                {slugStatus === "taken" && (
                  <p className="text-caption text-danger">That slug is already taken.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-medium text-muted-foreground">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Your name or brand"
                  className="w-full px-3 py-2 rounded-control-sm border border-border bg-surface text-label text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-medium text-muted-foreground">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short line about you"
                  rows={2}
                  className="w-full px-3 py-2 rounded-control-sm border border-border bg-surface text-label text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors resize-y"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-medium text-muted-foreground">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as StartPageTheme)}
                  className="w-full px-3 py-2 rounded-control-sm border border-border bg-surface text-label text-foreground focus:outline-none focus:border-brand transition-colors"
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
                className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-control-sm text-caption font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saved ? "Saved!" : "Save"}
              </button>
            </div>

            <div className="flex flex-col gap-3 p-5 rounded-card border border-border bg-surface-raised">
              <p className="text-label font-medium text-foreground">Links</p>

              {startPage.links.length > 0 && (
                <div className="flex flex-col gap-2">
                  {startPage.links.map((link, i) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 p-3 rounded-control border border-border bg-surface"
                    >
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <p className="text-label font-medium text-foreground truncate">{link.label}</p>
                        <p className="text-caption text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <span className="text-caption text-muted-foreground flex-shrink-0">{link.clickCount} clicks</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => void handleMoveLink(link.id, "up")}
                          disabled={i === 0}
                          className="p-1 rounded text-muted-foreground hover:text-muted-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => void handleMoveLink(link.id, "down")}
                          disabled={i === startPage.links.length - 1}
                          className="p-1 rounded text-muted-foreground hover:text-muted-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => void handleDeleteLink(link.id)}
                          className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger-soft transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 p-3 rounded-control border border-dashed border-brand/40 bg-[rgba(124,58,237,0.03)]">
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. My LinkedIn)"
                  className="w-full px-3 py-2 rounded-control-sm border border-border bg-surface-raised text-label text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
                />
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-control-sm border border-border bg-surface-raised text-label text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
                />
                {linkError && <p className="text-caption text-danger">{linkError}</p>}
                <button
                  onClick={() => void handleAddLink()}
                  disabled={addingLink}
                  className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control-sm text-caption font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-colors"
                >
                  {addingLink ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.4} />}
                  Add Link
                </button>
              </div>
            </div>
          </>
        )}
      </SettingsSection>
    </div>
  )
}
