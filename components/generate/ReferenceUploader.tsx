"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X } from "lucide-react"

interface ReferenceUploaderProps {
  value: string | null
  onChange: (base64: string, mediaType: string) => void
  onClear: () => void
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

export function ReferenceUploader({ value, onChange, onClear }: ReferenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return
      try {
        // Compression always re-encodes to JPEG, so report that media type.
        const base64 = await compressImage(file)
        setPreviewUrl(`data:image/jpeg;base64,${base64}`)
        onChange(base64, "image/jpeg")
      } catch (err) {
        console.error("[ReferenceUploader] image compression failed:", err)
      }
    },
    [onChange],
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
        <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
          Reference Style
        </p>
        <div className="flex items-start gap-3">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#E5E3DE] flex-shrink-0">
            <img src={previewUrl} alt="Reference" className="w-full h-full object-cover" />
            <button
              onClick={handleClear}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[rgba(0,0,0,0.65)] flex items-center justify-center hover:bg-[rgba(0,0,0,0.85)] transition-colors"
            >
              <X size={10} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-[12px] text-[#9CA3AF] leading-[1.55] mt-1">
            Claude will match this visual style when generating the image prompt.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
        Reference Style{" "}
        <span className="normal-case tracking-normal font-normal text-[#C4C0B6]">
          (optional)
        </span>
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 h-24 rounded-xl border border-dashed cursor-pointer transition-all duration-150 ${
          isDragging
            ? "border-[rgba(26,26,26,0.55)] bg-[rgba(26,26,26,0.08)]"
            : "border-[#E5E3DE] bg-[#F6F4EE] hover:border-[#D6D3CC] hover:bg-[#F4F2EC]"
        }`}
      >
        <Upload size={15} className="text-[#ADA99F]" strokeWidth={1.8} />
        <p className="text-[12px] text-[#9CA3AF]">
          Drag an image or click to upload a style reference
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  )
}
