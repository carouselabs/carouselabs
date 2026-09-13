"use client"

// Content Hub "Post Preview" — a platform-styled card mimicking how a post
// will actually render, so formatting issues (an overlong caption getting
// cut off mid-sentence, a missing image, etc.) are visible before
// scheduling. LinkedIn gets an authentic layout (the actual card chrome,
// avatar, and its real "...see more" truncation point around 210
// characters) since it's the only platform with real posting access today;
// every other platform gets a simpler generic card, honestly labeled as an
// approximation rather than claiming a fidelity we can't back up.
import { useState } from "react"
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe } from "lucide-react"
import { PLATFORM_META, type Platform } from "@/lib/platforms"
import { PlatformBadge } from "./platforms"

// LinkedIn's real feed truncation point is commonly cited around 210
// characters before it collapses the rest behind "...see more" — this is an
// approximation (LinkedIn doesn't publish an exact number and it can vary by
// surface), close enough to catch "my hook doesn't survive the cut" issues.
const LINKEDIN_TRUNCATE_AT = 210

interface PlatformPreviewProps {
  platform: Platform
  caption: string
  imageUrl?: string
  userName: string
}

export function PlatformPreview({ platform, caption, imageUrl, userName }: PlatformPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = PLATFORM_META[platform]
  const trimmed = caption.trim()
  const isTruncated = trimmed.length > LINKEDIN_TRUNCATE_AT
  const displayCaption = !isTruncated || expanded ? trimmed : trimmed.slice(0, LINKEDIN_TRUNCATE_AT)

  if (platform === "linkedin") {
    return (
      <div className="rounded-xl border border-[#E5E3DE] bg-white overflow-hidden">
        <div className="flex items-center gap-2.5 p-3.5 pb-2.5">
          <div className="w-11 h-11 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0">
            {(userName?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13.5px] font-semibold text-[#0A0A0A] truncate leading-tight">
              {userName || "You"}
            </span>
            <span className="text-[11.5px] text-[#6B7280] leading-tight">Your headline here</span>
            <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1 leading-tight mt-0.5">
              Now · <Globe size={10} strokeWidth={2.2} />
            </span>
          </div>
        </div>

        <div className="px-3.5 pb-2.5">
          {trimmed ? (
            <p className="text-[13.5px] text-[#0A0A0A] leading-[1.5] whitespace-pre-wrap break-words">
              {displayCaption}
              {isTruncated && !expanded && (
                <>
                  …{" "}
                  <button
                    onClick={() => setExpanded(true)}
                    className="text-[#6B7280] font-medium hover:underline"
                  >
                    see more
                  </button>
                </>
              )}
            </p>
          ) : (
            <p className="text-[13.5px] text-[#ADA99F] italic">No caption yet</p>
          )}
        </div>

        {imageUrl && (
          <div className="w-full bg-[#F4F2EC]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-auto max-h-80 object-cover" />
          </div>
        )}

        <div className="flex items-center justify-around px-2 py-1.5 border-t border-[#E5E3DE] mt-1">
          {[
            { icon: ThumbsUp, label: "Like" },
            { icon: MessageCircle, label: "Comment" },
            { icon: Repeat2, label: "Repost" },
            { icon: Send, label: "Send" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-2 py-1.5 text-[11.5px] text-[#6B7280]">
              <Icon size={15} strokeWidth={1.8} />
              <span className="hidden sm:inline">{label}</span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Generic approximation for every other platform — honestly labeled, not
  // claiming pixel fidelity to that platform's real feed.
  return (
    <div className="rounded-xl border border-[#E5E3DE] bg-white overflow-hidden">
      <div className="flex items-center gap-2.5 p-3.5 pb-2.5">
        <PlatformBadge platform={platform} size={36} />
        <div className="flex flex-col min-w-0">
          <span className="text-[13.5px] font-semibold text-[#0A0A0A] truncate leading-tight">
            {userName || "You"}
          </span>
          <span className="text-[11px] text-[#9CA3AF] leading-tight">
            {meta.label} preview (approximate)
          </span>
        </div>
      </div>
      <div className="px-3.5 pb-2.5">
        {trimmed ? (
          <p className="text-[13.5px] text-[#0A0A0A] leading-[1.5] whitespace-pre-wrap break-words">
            {displayCaption}
            {isTruncated && !expanded && (
              <>
                …{" "}
                <button onClick={() => setExpanded(true)} className="text-[#6B7280] font-medium hover:underline">
                  see more
                </button>
              </>
            )}
          </p>
        ) : (
          <p className="text-[13.5px] text-[#ADA99F] italic">No caption yet</p>
        )}
      </div>
      {imageUrl && (
        <div className="w-full bg-[#F4F2EC]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-auto max-h-80 object-cover" />
        </div>
      )}
    </div>
  )
}
