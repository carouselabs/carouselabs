"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import type { ProfileData } from "@/lib/profile/options"

interface VoiceGuidelinesToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

// Optional "Apply my voice guidelines" checkbox shown above caption generation.
// Self-gating: it fetches the profile once and renders NOTHING unless the user
// has actually saved (non-empty) voice guidelines, so users who haven't set them
// up never see the toggle. The checked state is owned by the parent, which passes
// `useVoiceGuidelines` into the caption generation request.
export function VoiceGuidelinesToggle({ checked, onChange }: VoiceGuidelinesToggleProps) {
  const [hasGuidelines, setHasGuidelines] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/profile")
        if (!res.ok) return
        const data = await res.json()
        const vg = ((data.profile as ProfileData)?.voiceGuidelines ?? "").trim()
        if (active) setHasGuidelines(vg.length > 0)
      } catch {
        // best-effort — if the lookup fails, just don't show the toggle
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (!hasGuidelines) return null

  return (
    <label className="flex items-center gap-2.5 self-start cursor-pointer select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border transition-colors",
          checked
            ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
            : "bg-[#F4F2EC] border-[#D6D3CC] hover:border-[#1A1A1A]",
        ].join(" ")}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>
      <span className="text-[13px] font-medium text-[#4B5563]">
        Apply my voice guidelines
      </span>
    </label>
  )
}
