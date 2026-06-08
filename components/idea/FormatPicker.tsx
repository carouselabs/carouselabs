"use client"

import { useRouter } from "next/navigation"
import { FileText, Image, LayoutTemplate, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Format {
  id: string
  label: string
  description: string
  icon: React.ElementType
  proOnly: boolean
  href: (ideaId: string) => string
}

const FORMATS: Format[] = [
  {
    id: "caption",
    label: "Caption Only",
    description: "A scroll-stopping LinkedIn caption, ready to post",
    icon: FileText,
    proOnly: false,
    href: (id) => `/generate/caption?ideaId=${id}`,
  },
  {
    id: "image_caption",
    label: "Image + Caption",
    description: "Caption and a single AI-generated visual",
    icon: Image,
    proOnly: true,
    href: (id) => `/generate/image?ideaId=${id}`,
  },
  {
    id: "slides",
    label: "Caption + Slides",
    description: "Caption and a full 7–8 slide LinkedIn carousel",
    icon: LayoutTemplate,
    proOnly: true,
    href: (id) => `/generate/slides?ideaId=${id}`,
  },
]

interface FormatPickerProps {
  ideaId: string
  plan: "FREE" | "PRO"
}

export function FormatPicker({ ideaId, plan }: FormatPickerProps) {
  const router = useRouter()
  const isPro = plan === "PRO"

  function handleSelect(format: Format) {
    if (format.proOnly && !isPro) return
    router.push(format.href(ideaId))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
        Choose Output Type
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FORMATS.map((format) => {
          const locked = format.proOnly && !isPro
          const Icon = format.icon

          return (
            <button
              key={format.id}
              onClick={() => handleSelect(format)}
              disabled={locked}
              className={cn(
                "group relative flex flex-col gap-2.5 p-4 rounded-xl border text-left transition-all duration-150 outline-none",
                locked
                  ? "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] cursor-not-allowed opacity-60"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.06)] focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50 cursor-pointer",
              )}
            >
              {/* Pro badge */}
              {format.proOnly && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-[#FCD34D] bg-[rgba(252,211,77,0.1)] border border-[rgba(252,211,77,0.2)] px-1.5 py-0.5 rounded-full">
                  {locked && <Lock size={9} strokeWidth={2.5} />}
                  Pro
                </span>
              )}

              <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-[#A78BFA]" strokeWidth={1.8} />
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[rgba(255,255,255,0.82)]">
                  {format.label}
                </span>
                <span className="text-[12px] text-[rgba(255,255,255,0.35)] leading-[1.4]">
                  {format.description}
                </span>
              </div>

              {locked && (
                <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
                  Upgrade to Pro to unlock
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
