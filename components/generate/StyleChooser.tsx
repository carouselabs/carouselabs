"use client"

// The screen after "Skip, generate without reference" (Image + Caption and
// Carousel): pick one of the 48 looks, let AI decide, or describe your own
// style. A look is sent as the style reference; a description goes into the
// prompt after the same checks the server makes (lib/styleChoice.ts).
import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { CategoryChips, ChoiceCard, ChoiceHeader, StepActions, StructureArt } from "@/components/create/CreateKit"
import { LOOK_CATEGORIES, STYLE_LOOKS, lookById, lookThumbPath } from "@/lib/styleLooks"
import {
  STYLE_DESCRIPTION_EXAMPLES,
  STYLE_DESCRIPTION_MAX_CHARS,
  cleanStyleDescription,
  styleDescriptionProblem,
  type StyleChoice,
} from "@/lib/styleChoice"

type View = "options" | "looks" | "describe"
const ALL = "All"
const ART_LOOKS = ["neo-brutalist", "dark-premium", "pastel-pop"]

function LooksArt() {
  return (
    <span className="flex items-center">
      {ART_LOOKS.map((id, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed 56px thumbnail
        <img
          key={id}
          src={lookThumbPath(id)}
          alt=""
          width={56}
          height={70}
          className={cn("h-[70px] w-14 rounded-md border-2 border-surface object-cover shadow-card", i > 0 && "-ml-4", i === 1 && "relative z-10 -translate-y-1")}
        />
      ))}
    </span>
  )
}

export function StyleChooser({
  choice,
  onChoose,
  onBack,
}: {
  choice: StyleChoice | null
  onChoose: (choice: StyleChoice) => void
  /** Back to uploading a reference. */
  onBack: () => void
}) {
  const [view, setView] = useState<View>(choice?.kind === "look" ? "looks" : choice?.kind === "describe" ? "describe" : "options")
  const [category, setCategory] = useState<string>(ALL)
  const [picked, setPicked] = useState<string | null>(choice?.kind === "look" ? choice.lookId : null)
  const [text, setText] = useState(choice?.kind === "describe" ? choice.text : "")
  const [tried, setTried] = useState(false)

  if (view === "looks") {
    const shown = category === ALL ? STYLE_LOOKS : STYLE_LOOKS.filter((l) => l.category === category)
    const pickedLook = lookById(picked)
    return (
      <>
        <ChoiceHeader
          title="Pick a look"
          description="Your post's words and layout stay yours. The look sets the colors, fonts and illustration style."
        />
        <CategoryChips categories={[ALL, ...LOOK_CATEGORIES]} value={category} onChange={setCategory} />
        <div role="group" aria-label="Looks" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {shown.map((look) => {
            const selected = picked === look.id
            return (
              <button
                key={look.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPicked(look.id)}
                className="group flex flex-col gap-2 rounded-card text-left focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "relative block overflow-hidden rounded-control border bg-surface-muted transition-[border-color,box-shadow,transform] duration-(--motion-fast) group-hover:-translate-y-0.5 group-hover:shadow-card group-focus-visible:ring-2 group-focus-visible:ring-brand motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
                    selected ? "border-brand ring-2 ring-brand" : "border-border",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static thumbnails from public/ */}
                  <img src={lookThumbPath(look.id)} alt="" width={360} height={450} loading="lazy" className="block aspect-[4/5] w-full object-cover" />
                  {selected && (
                    <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-brand text-brand-foreground shadow-card">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </span>
                <span className={cn("text-label font-medium", selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                  {look.name}
                </span>
              </button>
            )
          })}
        </div>
        {/* Floats in reach while scrolling the 48 looks; above the phone's bottom nav. */}
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-(--z-sticky) md:bottom-0">
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-raised/95 px-4 py-3 shadow-popover backdrop-blur-sm">
            <Button variant="ghost" onClick={() => setView("options")}>
              ← Back
            </Button>
            <Button className="ml-auto" disabled={!pickedLook} onClick={() => pickedLook && onChoose({ kind: "look", lookId: pickedLook.id })}>
              {pickedLook ? `Use ${pickedLook.name} →` : "Pick a look"}
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (view === "describe") {
    const cleaned = cleanStyleDescription(text)
    const problem = styleDescriptionProblem(cleaned)
    const showProblem = tried || cleaned.length >= 40
    return (
      <>
        <ChoiceHeader
          title="Describe your style"
          description="Say how the image should look: colors, fonts, mood, illustration or photo style. Your post's words stay the same."
        />
        <div className="flex flex-col gap-2">
          <textarea
            id="style-description"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={STYLE_DESCRIPTION_MAX_CHARS}
            autoFocus
            aria-label="Describe your style"
            aria-invalid={showProblem && !!problem}
            aria-describedby="style-description-help"
            placeholder="e.g. Dark navy background, bold white headline, neon green accents, sleek and techy"
            className={cn(controlClasses, "resize-none px-4 py-3 leading-relaxed")}
          />
          <div id="style-description-help" className="flex flex-wrap items-start justify-between gap-2 text-caption">
            <p className={showProblem && problem ? "text-danger" : "text-muted-foreground"} aria-live="polite">
              {showProblem && problem ? problem : "Works well: colors, fonts, background, mood, illustration or photo style."}
            </p>
            <p className="ml-auto text-muted-foreground tabular-nums">
              {text.length} / {STYLE_DESCRIPTION_MAX_CHARS}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-caption font-medium text-muted-foreground">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {STYLE_DESCRIPTION_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="rounded-full border border-border px-3 py-1.5 text-left text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">
            Not used: changing the post&apos;s words or size, links, logos, or real people.
          </p>
        </div>
        <StepActions>
          <Button variant="ghost" onClick={() => setView("options")}>
            ← Other options
          </Button>
          <Button
            className="ml-auto"
            disabled={tried && !!problem}
            onClick={() => {
              setTried(true)
              if (!problem) onChoose({ kind: "describe", text: cleaned })
            }}
          >
            Use this style →
          </Button>
        </StepActions>
      </>
    )
  }

  return (
    <>
      <ChoiceHeader
        title="How should your image look?"
        description="No reference? Pick a ready-made look, let AI choose, or describe the style you want."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ChoiceCard
          art={<LooksArt />}
          title="Choose a look"
          subtitle={`${STYLE_LOOKS.length} ready-made styles, from clean editorial to neon.`}
          onClick={() => setView("looks")}
        />
        <ChoiceCard
          art={<StructureArt kind="auto" />}
          title="Let AI decide"
          subtitle="AI picks a style that suits your post."
          onClick={() => onChoose({ kind: "ai" })}
        />
        <ChoiceCard
          art={<StructureArt kind="custom" />}
          title="Describe your style"
          subtitle="Tell us the colors, fonts and mood you want."
          onClick={() => setView("describe")}
        />
      </div>
      <StepActions>
        <Button variant="ghost" onClick={onBack}>
          ← Upload a reference instead
        </Button>
      </StepActions>
    </>
  )
}
