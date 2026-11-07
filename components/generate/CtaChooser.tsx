"use client"

// The CTA step of Image + Caption and Carousel, after the structure choice:
// which saved CTA (or a new one, set up right here), and where it goes. The
// AI draws it into the same picture (lib/creatorCta.ts), as the only call to
// action on it.
//   Image:    Let AI decide · I'll describe where · No CTA
//   Carousel: on the slides (every slide · Let AI decide · I'll describe · not
//             on the slides) and the last slide (your CTA · CarouseLabs ·
//             nothing extra)
import { useState } from "react"
import Link from "next/link"
import { Loader2, Plus, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { ChoiceHeader, StepActions } from "@/components/create/CreateKit"
import { CtaEditor } from "@/components/cta/CtaEditor"
import { CtaPhotoPicker } from "@/components/cta/CtaPhotoPicker"
import { useMyCta } from "@/components/cta/useMyCta"
import {
  CTA_PLACE_EXAMPLES,
  CTA_PLACE_MAX_CHARS,
  MAX_CTAS,
  cleanCtaText,
  ctaPlaceProblem,
  drawsCreatorCta,
  lastCtaKey,
  readCtaChoice,
  type CtaCardData,
  type CtaChoice,
  type CtaFormat,
  type CtaLast,
  type CtaWhere,
} from "@/lib/creatorCta"

function Tile({ checked, title, subtitle, onClick }: { checked: boolean; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className="flex flex-col items-start gap-0.5 rounded-card border border-border bg-surface p-3.5 text-left transition-[border-color,background-color] duration-(--motion-fast) hover:border-control-border aria-checked:border-brand aria-checked:bg-brand-soft aria-checked:ring-1 aria-checked:ring-brand"
    >
      <span className="text-label font-semibold text-foreground">{title}</span>
      <span className="text-caption text-muted-foreground">{subtitle}</span>
    </button>
  )
}

function Group({ label, children, cols = 3 }: { label: string; children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", cols === 3 && "lg:grid-cols-3", cols === 4 && "lg:grid-cols-4")}>
        {children}
      </div>
    </div>
  )
}

const IMAGE_WHERE: { value: CtaWhere; title: string; subtitle: string }[] = [
  { value: "ai", title: "Let AI decide", subtitle: "It keeps a clean spot for your CTA and puts it there" },
  { value: "describe", title: "I'll describe where", subtitle: "e.g. “small badge, bottom right corner”" },
  { value: "none", title: "No CTA", subtitle: "Just the image, with no call to action" },
]
const SLIDES_WHERE: { value: CtaWhere; title: string; subtitle: string }[] = [
  { value: "every", title: "Every slide", subtitle: "A slim strip along the bottom" },
  { value: "ai", title: "Let AI decide", subtitle: "Only where it fits, up to 2 slides" },
  { value: "describe", title: "I'll describe", subtitle: "e.g. “first and last slides, top right”" },
  { value: "none", title: "Not on the slides", subtitle: "Keep the slides clean" },
]
const LAST: { value: CtaLast; title: string; subtitle: string }[] = [
  { value: "cta", title: "Your CTA slide", subtitle: "Your photo, name and CTA line" },
  { value: "carouselabs", title: "CarouseLabs slide", subtitle: "“Made with CarouseLabs”" },
  { value: "none", title: "Nothing extra", subtitle: "Ends on a closing takeaway" },
]

export function CtaChooser({
  format,
  choice,
  onChoose,
  onBack,
}: {
  format: CtaFormat
  choice: CtaChoice | null
  onChoose: (choice: CtaChoice, card: CtaCardData | null) => void
  onBack: () => void
}) {
  const api = useMyCta()
  const { data, error } = api
  // This post's choice, else the last one made (a new post starts from it).
  const [start] = useState<CtaChoice | null>(() => choice ?? readCtaChoice(lastCtaKey(format), format)?.choice ?? null)
  const [picked, setCtaId] = useState<string | null>(start?.ctaId ?? null)
  // Where it goes and the last slide, once chosen; until then, a CTA when
  // they have one saved and none when they don't.
  const [wherePicked, setWhere] = useState<CtaWhere | null>(start?.where ?? null)
  const [lastPicked, setLast] = useState<CtaLast | null>(start?.last ?? null)
  const [describe, setDescribe] = useState(start?.describe ?? "")
  const [creating, setCreating] = useState(false)
  const [tried, setTried] = useState(false)

  // The CTA picked (before, or just now) if it's still there, else the default.
  const ctaId = data && picked && data.cards.some((c) => c.id === picked) ? picked : ((data?.cards.find((c) => c.isDefault) ?? data?.cards[0])?.id ?? null)
  const hasCta = !!data?.cards.length
  const where: CtaWhere = wherePicked ?? (format === "image" && hasCta ? "ai" : "none")
  const last: CtaLast = lastPicked ?? (hasCta ? "cta" : "none")

  const draft: CtaChoice = { ctaId, where, ...(format === "carousel" ? { last } : {}), ...(where === "describe" ? { describe: cleanCtaText(describe) } : {}) }
  const draws = drawsCreatorCta(draft)
  const card = data?.cards.find((c) => c.id === ctaId) ?? null
  const placeProblem = where === "describe" ? ctaPlaceProblem(cleanCtaText(describe)) : null
  const missing = !draws ? null : !card ? "Pick one of your CTAs, or create one." : !data?.photoUrl ? "Add your photo: it goes on your CTA." : placeProblem

  function next() {
    setTried(true)
    if (missing) return
    onChoose(draws ? draft : { ctaId: null, where: "none", ...(format === "carousel" ? { last: last === "carouselabs" ? "carouselabs" : "none" } : {}) }, draws ? card : null)
  }

  const noCta: CtaChoice = { ctaId: null, where: "none", ...(format === "carousel" ? { last: "none" as const } : {}) }

  if (!data) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-label text-muted-foreground" role="status">
        {error ? <span className="text-danger">{error}</span> : <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
        {!error && "Loading your CTA…"}
        {error && (
          <Button variant="outline" size="sm" onClick={() => onChoose(noCta, null)}>
            Continue without a CTA
          </Button>
        )}
      </div>
    )
  }

  if (!data.ready) {
    return (
      <>
        <ChoiceHeader title="Add your CTA?" description="My CTA isn't switched on yet. It will be ready shortly." />
        <StepActions>
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button className="ml-auto" onClick={() => onChoose(noCta, null)}>
            Continue without a CTA →
          </Button>
        </StepActions>
      </>
    )
  }

  const settingUp = creating || data.cards.length === 0

  return (
    <>
      <ChoiceHeader
        title="Add your CTA?"
        description={
          format === "image"
            ? "Your photo and call to action, drawn into the image in its own style. It's the only call to action on it."
            : "Your photo and call to action, drawn into the slides in the carousel's own style. It's the only call to action in it."
        }
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-caption font-medium text-muted-foreground">Your CTA</span>
          <Link href="/settings/cta" target="_blank" className="text-caption font-medium text-brand hover:underline">
            Manage in Settings → My CTA
          </Link>
        </div>
        {data.cards.length > 0 && (
          <div role="radiogroup" aria-label="Your CTA" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.cards.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={ctaId === c.id}
                onClick={() => setCtaId(c.id)}
                className="flex items-start gap-3 rounded-card border border-border bg-surface p-3.5 text-left transition-[border-color,background-color] duration-(--motion-fast) hover:border-control-border aria-checked:border-brand aria-checked:bg-brand-soft aria-checked:ring-1 aria-checked:ring-brand"
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted">
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the creator's own photo
                    <img src={data.photoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-5 text-muted-foreground" aria-hidden />
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-label font-semibold text-foreground">{c.label}</span>
                  <span className="text-caption text-muted-foreground [overflow-wrap:anywhere]">{c.line}</span>
                </span>
              </button>
            ))}
            {!creating && data.cards.length < MAX_CTAS && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center justify-center gap-2 rounded-card border border-dashed border-border p-3.5 text-label font-medium text-muted-foreground hover:border-control-border hover:text-foreground"
              >
                <Plus className="size-4" aria-hidden />
                New CTA
              </button>
            )}
          </div>
        )}
        {(settingUp || !data.photoUrl) && (
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-4 md:p-5">
            {settingUp && <p className="text-label font-semibold text-foreground">{data.cards.length === 0 ? "Set up your CTA (saved for every post)" : "New CTA"}</p>}
            <CtaPhotoPicker api={api} compact={!settingUp} />
            {settingUp && (
              <CtaEditor
                api={api}
                submitLabel="Save as my CTA"
                onSaved={(saved) => {
                  setCtaId(saved.id)
                  setCreating(false)
                  if (where === "none" && format === "image") setWhere("ai")
                }}
                onCancel={data.cards.length > 0 ? () => setCreating(false) : undefined}
              />
            )}
          </div>
        )}
      </div>

      {format === "image" ? (
        <Group label="Where it goes">
          {IMAGE_WHERE.map((o) => (
            <Tile key={o.value} checked={where === o.value} title={o.title} subtitle={o.subtitle} onClick={() => setWhere(o.value)} />
          ))}
        </Group>
      ) : (
        <>
          <Group label="On the slides" cols={4}>
            {SLIDES_WHERE.map((o) => (
              <Tile key={o.value} checked={where === o.value} title={o.title} subtitle={o.subtitle} onClick={() => setWhere(o.value)} />
            ))}
          </Group>
          <Group label="Last slide">
            {LAST.map((o) => (
              <Tile key={o.value} checked={last === o.value} title={o.title} subtitle={o.subtitle} onClick={() => setLast(o.value)} />
            ))}
          </Group>
        </>
      )}

      {where === "describe" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={describe}
            onChange={(e) => setDescribe(e.target.value)}
            rows={2}
            maxLength={CTA_PLACE_MAX_CHARS}
            aria-label="Where should your CTA go?"
            aria-invalid={tried && !!placeProblem}
            placeholder={`e.g. ${CTA_PLACE_EXAMPLES[format][0]}`}
            className={cn(controlClasses, "resize-none px-4 py-3 leading-relaxed")}
          />
          <div className="flex flex-wrap gap-2">
            {CTA_PLACE_EXAMPLES[format].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setDescribe(example)}
                className="rounded-full border border-border px-3 py-1.5 text-left text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {tried && missing && (
        <p role="alert" className="text-label text-danger">
          {missing}
        </p>
      )}

      <StepActions>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button className="ml-auto" onClick={next} disabled={tried && !!missing}>
          {draws ? "Continue with my CTA →" : "Continue →"}
        </Button>
      </StepActions>
    </>
  )
}
