"use client"

// Content Hub "Create a Custom Post" screen — for content the user made
// themselves outside CarouseLabs. No AI generation, no character limit beyond
// what's genuinely needed, no credit charge. See app/api/content-hub/custom-post
// for how this becomes a real Post record, and _client.tsx's handleSchedule
// for how it flows into the same date/time + Schedule/Save-as-Draft step used
// for AI-generated content.
import { PLATFORM_ORDER, PLATFORM_META, type Platform } from "@/lib/platforms"
import { PlatformBadge } from "./platforms"
import { CustomPostImageUploader } from "./CustomPostImageUploader"

interface CustomPostComposerProps {
  caption: string
  onCaptionChange: (v: string) => void
  images: string[]
  onAddImage: (url: string) => void
  onRemoveImage: (url: string) => void
  platforms: Platform[]
  onTogglePlatform: (p: Platform) => void
  customizePerPlatform: boolean
  onToggleCustomizePerPlatform: (v: boolean) => void
  platformCaptions: Partial<Record<Platform, string>>
  onPlatformCaptionChange: (platform: Platform, value: string) => void
  linkedInConnected: boolean | null
  error: string | null
  onBack: () => void
}

export function CustomPostComposer({
  caption,
  onCaptionChange,
  images,
  onAddImage,
  onRemoveImage,
  platforms,
  onTogglePlatform,
  customizePerPlatform,
  onToggleCustomizePerPlatform,
  platformCaptions,
  onPlatformCaptionChange,
  linkedInConnected,
  error,
  onBack,
}: CustomPostComposerProps) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="self-start text-[11px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        ← Back
      </button>
      <p className="text-[11px] font-semibold text-[#ADA99F] uppercase tracking-widest">Create a Custom Post</p>

      <CustomPostImageUploader images={images} onAdd={onAddImage} onRemove={onRemoveImage} />

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Write your caption…"
          rows={5}
          className="w-full px-3 py-2.5 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">Platforms</p>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_ORDER.map((platform) => {
            const meta = PLATFORM_META[platform]
            const checked = platforms.includes(platform)
            return (
              <button
                key={platform}
                type="button"
                onClick={() => onTogglePlatform(platform)}
                className={[
                  "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors",
                  checked
                    ? "border-[rgba(124,58,237,0.5)] bg-[rgba(124,58,237,0.05)]"
                    : "border-[#E5E3DE] bg-white hover:border-[#D1CFC8]",
                ].join(" ")}
              >
                <PlatformBadge platform={platform} size={22} />
                <span className="flex flex-col min-w-0">
                  <span className="text-[12.5px] font-semibold text-[#0A0A0A] truncate">{meta.label}</span>
                  <span className="text-[10px] text-[#9CA3AF] truncate">
                    {meta.functional
                      ? linkedInConnected === false
                        ? "Not connected"
                        : "Ready to post"
                      : "Connect to enable"}
                  </span>
                </span>
                <span
                  className={[
                    "ml-auto w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors",
                    checked ? "bg-[#7C3AED] border-[#7C3AED]" : "border-[#D1D5DB]",
                  ].join(" ")}
                >
                  {checked && <span className="w-1.5 h-1.5 rounded-sm bg-white" />}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">
          Platforms marked &quot;Connect to enable&quot; are saved as pending — CarouseLabs will publish there
          automatically once that connection is available.
        </p>
      </div>

      {platforms.length > 1 && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-[#E5E3DE] bg-[#FBFAF6]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customizePerPlatform}
              onChange={(e) => onToggleCustomizePerPlatform(e.target.checked)}
              className="accent-[#7C3AED]"
            />
            <span className="text-[12px] font-medium text-[#374151]">Customize caption per platform</span>
          </label>
          {customizePerPlatform && (
            <div className="flex flex-col gap-2.5 pt-1">
              {platforms.map((platform) => (
                <div key={platform} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-[#6B7280] flex items-center gap-1.5">
                    <PlatformBadge platform={platform} size={16} />
                    {PLATFORM_META[platform].label}
                  </span>
                  <textarea
                    value={platformCaptions[platform] ?? ""}
                    onChange={(e) => onPlatformCaptionChange(platform, e.target.value)}
                    placeholder={caption || "Same as default caption"}
                    rows={2}
                    className="w-full px-2.5 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[12.5px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}
    </div>
  )
}
