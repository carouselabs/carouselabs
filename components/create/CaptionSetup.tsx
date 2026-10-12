"use client"

// The caption setup steps shared by the caption, image and carousel flows:
// platform → caption structure → (own structure | template). Each flow passes
// its own handlers and keeps its own state; this only renders the screens.
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CAPTION_PLATFORMS } from "@/lib/captionPlatforms"
import { CATEGORY_ORDER, getTemplatesByCategory } from "@/lib/captionTemplates"
import { CategoryChips, ChoiceCard, ChoiceHeader, PlatformTag, StepColumn } from "./CreateKit"

export type CaptionSetupStep = "platform-select" | "structure-select" | "custom-input" | "template-select"

export function CaptionSetup({
  step,
  platformQuestion,
  selectedPlatform,
  onSelectPlatform,
  onSelectAuto,
  onSelectCustom,
  onSelectTemplateMode,
  customStructure,
  onCustomStructureChange,
  onCustomContinue,
  selectedCategory,
  onCategoryChange,
  onTemplatePick,
}: {
  step: CaptionSetupStep
  /** "Which platform is this caption for?" / "… carousel for?" */
  platformQuestion: string
  selectedPlatform: string | null
  onSelectPlatform: (platformId: string) => void
  onSelectAuto: () => void
  onSelectCustom: () => void
  onSelectTemplateMode: () => void
  customStructure: string
  onCustomStructureChange: (value: string) => void
  onCustomContinue: () => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  onTemplatePick: (templateId: string) => void
}) {
  const customWordCount = customStructure.trim() ? customStructure.trim().split(/\s+/).length : 0

  return (
    <StepColumn wide={step !== "custom-input"}>
      {/* Selected platform carries through the later steps */}
      {selectedPlatform && step !== "platform-select" && (
        <div>
          <PlatformTag platformId={selectedPlatform} />
        </div>
      )}

      {/* ── Platform selection: 8 cards ──────────────────────── */}
      {step === "platform-select" && (
        <>
          <ChoiceHeader
            title={platformQuestion}
            description={<>We&apos;ll tailor the tone, length, and style to match.</>}
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CAPTION_PLATFORMS.map((platform) => (
              <ChoiceCard
                key={platform.id}
                emoji={platform.emoji}
                title={platform.name}
                meta={
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] leading-4 font-semibold text-brand tabular-nums">
                    {platform.charLimit.toLocaleString()} chars
                  </span>
                }
                subtitle={platform.guidance}
                onClick={() => onSelectPlatform(platform.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Main selection: 3 large cards ────────────────────── */}
      {step === "structure-select" && (
        <>
          <ChoiceHeader title="How should your caption be structured?" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                emoji: "🤖",
                title: "Auto (AI Chooses)",
                subtitle:
                  "AI analyzes the topic and automatically selects or combines the best caption structure.",
                onClick: onSelectAuto,
              },
              {
                emoji: "✍️",
                title: "Define Your Own",
                subtitle: "Tell us exactly how you want your caption structured.",
                onClick: onSelectCustom,
              },
              {
                emoji: "📋",
                title: "Choose a Template",
                subtitle: "Pick from proven caption frameworks.",
                onClick: onSelectTemplateMode,
              },
            ].map((opt) => (
              <ChoiceCard key={opt.title} emoji={opt.emoji} title={opt.title} subtitle={opt.subtitle} onClick={opt.onClick} />
            ))}
          </div>
        </>
      )}

      {/* ── Custom structure input ───────────────────────────── */}
      {step === "custom-input" && (
        <>
          <ChoiceHeader title="Define your caption structure" />
          <div className="flex flex-col gap-2">
            <textarea
              value={customStructure}
              onChange={(e) => onCustomStructureChange(e.target.value)}
              rows={5}
              autoFocus
              aria-label="Define your caption structure"
              placeholder="Describe how you want your caption structured (e.g. Hook, then 3 quick tips, then a question at the end)"
              className={cn(controlClasses, "resize-none px-4 py-3 leading-relaxed")}
            />
            <p className="text-caption text-muted-foreground tabular-nums" aria-live="polite">
              {customWordCount} {customWordCount === 1 ? "word" : "words"}
            </p>
          </div>
          <Button onClick={onCustomContinue} disabled={!customStructure.trim()} className="self-start">
            Continue →
          </Button>
        </>
      )}

      {/* ── Template grid — tabbed by category ───────────────── */}
      {step === "template-select" && (
        <>
          <ChoiceHeader title="Pick a caption framework" />
          <CategoryChips categories={CATEGORY_ORDER} value={selectedCategory} onChange={onCategoryChange} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(getTemplatesByCategory()[selectedCategory] ?? []).map((template) => (
              <ChoiceCard
                key={template.id}
                emoji={template.emoji}
                title={template.name}
                subtitle={template.structure.join(" → ")}
                onClick={() => onTemplatePick(template.id)}
              />
            ))}
          </div>
        </>
      )}
    </StepColumn>
  )
}
