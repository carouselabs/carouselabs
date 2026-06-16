"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X } from "lucide-react"

interface ReferenceUploaderProps {
  value: string | null
  onChange: (base64: string, mediaType: string) => void
  onClear: () => void
}

export function ReferenceUploader({ value, onChange, onClear }: ReferenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreviewUrl(result)
        const base64 = result.split(",")[1]
        onChange(base64, file.type)
      }
      reader.readAsDataURL(file)
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
              onClick={onClear}
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
