"use client"

import { useState } from "react"

interface ImagePreviewProps {
  src: string
  alt: string
  /** Aspect-ratio hint from generation. Kept for API compatibility but no longer
   *  drives layout — the image now renders at its natural dimensions so it's
   *  never cropped. */
  size?: "4:5" | "1:1"
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#E9E7E1]">
      {/* Placeholder keeps the frame from collapsing to 0px before the natural
          image height is known. */}
      {!loaded && <div className="w-full h-64 bg-[#F4F2EC] animate-pulse" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-auto object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "absolute inset-0 opacity-0"
        }`}
      />
    </div>
  )
}
