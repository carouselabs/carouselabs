"use client"

// Multi-image uploader for the Custom Post composer. Mirrors
// components/generate/ReferenceUploader.tsx's client-side downscale/re-encode
// approach, extended to (a) handle several files at once and (b) actually
// upload each one to R2 (via /api/content-hub/custom-post/upload) since a
// Post's imageUrls must be real hosted URLs, not base64.
import { useCallback, useRef, useState } from "react"
import { Upload, X, Loader2, ImageIcon } from "lucide-react"

const MAX_IMAGES = 6
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB source file cap, before compression
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface CustomPostImageUploaderProps {
  images: string[] // already-uploaded R2 URLs
  onAdd: (url: string) => void
  onRemove: (url: string) => void
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

export function CustomPostImageUploader({ images, onAdd, onRemove }: CustomPostImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      setError(null)

      const room = MAX_IMAGES - images.length
      if (room <= 0) {
        setError(`You can attach up to ${MAX_IMAGES} images`)
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
    [images.length, onAdd],
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

  const canAddMore = images.length < MAX_IMAGES

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
        Images{" "}
        <span className="normal-case tracking-normal font-normal text-[#C4C0B6]">
          (optional, up to {MAX_IMAGES})
        </span>
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[#E5E3DE]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(url)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[rgba(0,0,0,0.65)] flex items-center justify-center hover:bg-[rgba(0,0,0,0.85)] transition-colors"
              >
                <X size={10} className="text-white" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 h-20 rounded-xl border border-dashed transition-all duration-150 ${
            uploading ? "cursor-wait" : "cursor-pointer"
          } ${
            isDragging
              ? "border-[rgba(124,58,237,0.55)] bg-[rgba(124,58,237,0.08)]"
              : "border-[#E5E3DE] bg-[#F6F4EE] hover:border-[#D6D3CC] hover:bg-[#F4F2EC]"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="text-[#ADA99F] animate-spin" />
              <p className="text-[11.5px] text-[#9CA3AF]">Uploading…</p>
            </>
          ) : (
            <>
              {images.length === 0 ? (
                <Upload size={14} className="text-[#ADA99F]" strokeWidth={1.8} />
              ) : (
                <ImageIcon size={14} className="text-[#ADA99F]" strokeWidth={1.8} />
              )}
              <p className="text-[11.5px] text-[#9CA3AF]">
                Drag images or click to upload · JPEG, PNG, WEBP
              </p>
            </>
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
        </div>
      )}

      {error && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{error}</p>}
    </div>
  )
}
