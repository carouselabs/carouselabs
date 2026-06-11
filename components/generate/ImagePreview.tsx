"use client"

import { useState } from "react"

interface ImagePreviewProps {
  src: string
  alt: string
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
      {!loaded && (
        <div className="absolute inset-0 bg-[rgba(255,255,255,0.03)] animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}
