"use client"

// Multi-image uploader for the Custom Post composer. Mirrors
// components/generate/ReferenceUploader.tsx's client-side downscale/re-encode
// approach, extended to (a) handle several files at once and (b) actually
// upload each one to R2 (via /api/content-hub/custom-post/upload) since a
// Post's imageUrls must be real hosted URLs, not base64.
import { useCallback, useRef, useState } from "react"
import { Upload, X, Loader2, ImageIcon } from "lucide-react"
import { PLATFORM_LIMITS, PLATFORM_META, maxImagesForPlatforms, type Platform } from "@/lib/platforms"
import { cn } from "@/lib/utils"

const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB source file cap, before compression
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface CustomPostImageUploaderProps {
  images: string[] // already-uploaded R2 URLs
  onAdd: (url: string) => void
  onRemove: (url: string) => void
  platforms: Platform[] // currently-selected platforms — sets the real image cap
}

// "(optional)" with no platforms selected yet, "(optional, up to N)" once a
// real cap applies, and a "— X only allows N images" callout only when some
// selected platform is genuinely tighter than the others (not just the only
// one with a defined cap — e.g. LinkedIn + Facebook shouldn't call out
// LinkedIn, since Facebook has no cap to be tighter than).
function buildImagesSuffix(platforms: Platform[]): string {
  if (platforms.length === 0) return "(optional)"
  const finiteLimits = platforms
    .map((p) => ({ platform: p, max: PLATFORM_LIMITS[p].maxImages }))
    .filter((l): l is { platform: Platform; max: number } => l.max !== null)
  if (finiteLimits.length === 0) return `(optional, up to ${maxImagesForPlatforms(platforms)})`

  const minMax = Math.min(...finiteLimits.map((l) => l.max))
  const restrictors = finiteLimits.filter((l) => l.max === minMax)
  const isCalledOut = finiteLimits.length > 1 && restrictors.length < finiteLimits.length
  if (!isCalledOut) return `(optional, up to ${minMax})`

  const names = restrictors.map((r) => PLATFORM_META[r.platform].label).join(" and ")
  const noun = minMax === 1 ? "image" : "images"
  const verb = restrictors.length > 1 ? "only allow" : "only allows"
  return `(optional, up to ${minMax} — ${names} ${verb} ${minMax} ${noun})`
}

async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<string> {
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

export function CustomPostImageUploader({ images, onAdd, onRemove, platforms }: CustomPostImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const maxImages = maxImagesForPlatforms(platforms)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      setError(null)

      const room = maxImages - images.length
      if (room <= 0) {
        setError(`You can attach up to ${maxImages} images`)
        return
      }

      setUploading(true)
      try {
        for (const file of files.slice(0, room)) {
          if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("Only JPEG, PNG, and WEBP images are supported")
            continue
          }
          if (file.size > MAX_FILE_BYTES) {
            setError("Each image must be under 8MB")
            continue
          }
          const base64 = await compressImage(file)
          const res = await fetch("/api/content-hub/custom-post/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg" }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error((data as { error?: string }).error ?? "Upload failed")
          onAdd((data as { url: string }).url)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image")
      } finally {
        setUploading(false)
      }
    },
    [images.length, maxImages, onAdd],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void handleFiles(e.target.files)
    e.target.value = "" // allow re-selecting the same file after removing it
  }

  const canAddMore = images.length < maxImages

  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-medium text-muted-foreground">
        Images <span className="font-normal text-muted-foreground/80">{buildImagesSuffix(platforms)}</span>
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-control-sm border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(url)}
                aria-label="Remove image"
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors duration-(--motion-fast) hover:bg-foreground/90"
              >
                <X className="size-3" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          aria-disabled={uploading || undefined}
          className={cn(
            "flex h-24 flex-col items-center justify-center gap-2 rounded-card border border-dashed px-4 text-center transition-colors duration-(--motion-fast)",
            uploading ? "cursor-wait" : "cursor-pointer",
            isDragging
              ? "border-brand/60 bg-brand-soft"
              : "border-control-border bg-surface-raised hover:border-brand/50 hover:bg-brand-soft/40"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              <span className="text-caption text-muted-foreground">Uploading…</span>
            </>
          ) : (
            <>
              {images.length === 0 ? (
                <Upload className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden />
              )}
              <span className="text-caption text-muted-foreground">
                Drag images or click to upload · JPEG, PNG, WEBP
              </span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={uploading}
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
    </div>
  )
}
