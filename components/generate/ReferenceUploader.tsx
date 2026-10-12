"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReferenceUploaderProps {
  value: string | null
  onChange: (base64: string, mediaType: string) => void
  onClear: () => void
  /** "canvas": a wide 16:9 drop zone and preview, for flows built around the reference. */
  size?: "compact" | "canvas"
}

// Downscale + re-encode to JPEG before uploading. Reference images are only
// used as a style hint, so full-resolution originals are unnecessary and large
// camera photos were tripping the API's request body limit (413 Payload Too
// Large). Returns base64 without the data-URL prefix.
async function compressImage(
  file: File,
  maxSize: number = 1024,
  quality: number = 0.8,
): Promise<string> {
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

        const base64 = canvas.toDataURL("image/jpeg", quality)
        resolve(base64.split(",")[1]) // remove data:image/jpeg;base64, prefix
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ReferenceUploader({ value, onChange, onClear, size = "compact" }: ReferenceUploaderProps) {
  const canvas = size === "canvas"
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") || isProcessing) return
      setIsProcessing(true)
      try {
        // Compression always re-encodes to JPEG, so report that media type.
        const base64 = await compressImage(file)
        setPreviewUrl(`data:image/jpeg;base64,${base64}`)
        onChange(base64, "image/jpeg")
      } catch (err) {
        console.error("[ReferenceUploader] image compression failed:", err)
      } finally {
        setIsProcessing(false)
      }
    },
    [onChange, isProcessing],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // Reset our own preview alongside the parent's value so the thumbnail can't
  // linger as stale state after the image is removed.
  const handleClear = useCallback(() => {
    setPreviewUrl(null)
    onClear()
  }, [onClear])

  if (value && previewUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-caption font-medium text-muted-foreground">Reference Style</p>
        <div className={cn("flex items-start gap-3", canvas && "flex-col")}>
          <div
            className={cn(
              "relative shrink-0 overflow-hidden border border-border",
              canvas ? "aspect-video w-full rounded-card bg-surface-muted shadow-card" : "size-24 rounded-control"
            )}
          >
            <img src={previewUrl} alt="Reference" className={cn("h-full w-full", canvas ? "object-contain" : "object-cover")} />
            <button
              type="button"
              onClick={handleClear}
              aria-label="Remove reference"
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-foreground/75 text-background transition-colors duration-(--motion-fast) after:absolute after:-inset-2 after:content-[''] hover:bg-foreground"
            >
              <X className="size-3" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <p className={cn("text-label text-muted-foreground", !canvas && "mt-1")}>
            Claude will match this visual style when generating the image prompt.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-medium text-muted-foreground">
        Reference Style <span className="font-normal">(optional)</span>
      </p>
      {/* A real button, so the upload can be reached and opened from the keyboard. */}
      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        aria-busy={isProcessing || undefined}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 border border-dashed px-4 text-center transition-colors duration-(--motion-fast)",
          canvas ? "aspect-video rounded-card" : "h-28 rounded-control",
          isProcessing ? "cursor-wait" : "cursor-pointer",
          isDragging
            ? "border-brand bg-brand-soft/60"
            : "border-control-border/70 bg-surface hover:border-control-border hover:bg-surface-raised"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
            <span className="text-label text-muted-foreground">Processing image…</span>
          </>
        ) : (
          <>
            <Upload className={cn("text-muted-foreground", canvas ? "size-6" : "size-4")} strokeWidth={1.8} aria-hidden />
            <span className="text-label text-muted-foreground">
              Drag an image or click to upload a style reference
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={isProcessing}
        className="hidden"
        onChange={handleInputChange}
        tabIndex={-1}
      />
    </div>
  )
}
