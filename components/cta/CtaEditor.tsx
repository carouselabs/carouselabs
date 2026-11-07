"use client"

// One CTA's words: what it's called, the name and headline drawn on it, the
// CTA line (typed, or picked from three the AI writes) and an optional extra
// line. Checked here the same way the server checks it (lib/creatorCta.ts).
import { useId, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { CTA_LIMITS, ctaCardInputSchema, type CtaCardData, type CtaCardInput } from "@/lib/creatorCta"
import { CtaPreview } from "./CtaPreview"
import type { MyCtaApi } from "./useMyCta"

const inputCls = cn(controlClasses, "h-10 px-3 text-label md:text-label")

function Field({
  label,
  value,
  onChange,
  max,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  max: number
  placeholder?: string
  hint?: string
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium text-muted-foreground">
        {label}
      </label>
      <input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function CtaEditor({
  api,
  card,
  onSaved,
  onCancel,
  submitLabel = "Save CTA",
}: {
  api: MyCtaApi
  // The CTA being changed; a new one when absent.
  card?: CtaCardData
  onSaved: (card: CtaCardData) => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const profile = api.data?.profile
  const [form, setForm] = useState<Required<CtaCardInput>>({
    label: card?.label ?? (api.data?.cards.length ? "" : "Follow me"),
    name: card?.name ?? profile?.name ?? "",
    headline: card?.headline ?? profile?.headline ?? "",
    line: card?.line ?? "",
    extra: card?.extra ?? "",
    isDefault: card?.isDefault ?? !api.data?.cards.length,
  })
  const [about, setAbout] = useState("")
  const [ideas, setIdeas] = useState<string[]>([])
  const [writing, setWriting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<CtaCardInput>) => setForm((f) => ({ ...f, ...patch }))
  const lineId = useId()

  async function write() {
    setWriting(true)
    setError(null)
    try {
      setIdeas(await api.suggest(about, form.name))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write suggestions")
    } finally {
      setWriting(false)
    }
  }

  async function save() {
    const checked = ctaCardInputSchema.safeParse(form)
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? "Check the CTA's words")
      return
    }
    setSaving(true)
    setError(null)
    try {
      onSaved(await api.saveCard(form, card?.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the CTA")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name, as shown" value={form.name} onChange={(name) => set({ name })} max={CTA_LIMITS.name} placeholder="Maya Rao" />
          <Field label="Headline (optional)" value={form.headline} onChange={(headline) => set({ headline })} max={CTA_LIMITS.headline} placeholder="Growth lead · B2B founders" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={lineId} className="text-caption font-medium text-muted-foreground">
            Your CTA line
          </label>
          <textarea
            id={lineId}
            value={form.line}
            maxLength={CTA_LIMITS.line}
            rows={2}
            placeholder="Follow Maya Rao for one LinkedIn growth idea every weekday"
            onChange={(e) => set({ line: e.target.value })}
            className={cn(controlClasses, "resize-none px-3 py-2 text-label leading-relaxed md:text-label")}
          />
          <div className="flex flex-col gap-2 rounded-control border border-dashed border-border bg-surface-muted/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={about}
                maxLength={200}
                onChange={(e) => setAbout(e.target.value)}
                aria-label="What should the CTA do? (optional)"
                placeholder="What should it do? e.g. get followers, get people to comment (optional)"
                className={cn(inputCls, "h-9 min-w-0 flex-1 basis-56")}
              />
              <Button size="sm" variant="brand" disabled={writing} onClick={() => void write()}>
                {writing ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles aria-hidden />}
                {writing ? "Writing…" : "Write with AI"}
              </Button>
            </div>
            {ideas.length > 0 && (
              <div className="flex flex-col gap-1.5" role="group" aria-label="Suggested CTA lines">
                <span className="text-caption text-muted-foreground">Tap one to use it, then change any word:</span>
                {ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => set({ line: idea })}
                    aria-pressed={form.line === idea}
                    className="rounded-control-sm border border-border bg-surface px-3 py-2 text-left text-label text-foreground transition-colors hover:border-brand aria-pressed:border-brand aria-pressed:bg-brand-soft"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Extra line (optional)" value={form.extra} onChange={(extra) => set({ extra })} max={CTA_LIMITS.extra} placeholder="linkedin.com/in/mayarao" hint="Small text under the CTA, like your profile address." />
          <Field label="Name for this CTA" value={form.label} onChange={(label) => set({ label })} max={CTA_LIMITS.label} placeholder="Follow me" hint="Only you see this, when choosing a CTA." />
        </div>
        <label className="flex items-center gap-2 text-label text-foreground">
          <input type="checkbox" checked={form.isDefault} disabled={card?.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />
          Use this one by default
        </label>
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="brand" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {submitLabel}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-caption font-medium text-muted-foreground">What&apos;s on it</span>
        <CtaPreview photoUrl={api.data?.photoUrl ?? null} name={form.name} headline={form.headline} line={form.line} extra={form.extra} />
        <span className="max-w-[16rem] text-caption text-muted-foreground">The AI draws it in each post&apos;s own colours and fonts.</span>
      </div>
    </div>
  )
}
