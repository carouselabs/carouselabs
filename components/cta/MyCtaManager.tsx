"use client"

// Settings → My CTA: the creator's photo and up to 3 saved CTAs, one the
// default. The create flow (components/generate/CtaChooser.tsx) offers them
// on every image and carousel.
import { useState } from "react"
import { Loader2, Pencil, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { MAX_CTAS, type CtaCardData } from "@/lib/creatorCta"
import { CtaEditor } from "./CtaEditor"
import { CtaPhotoPicker } from "./CtaPhotoPicker"
import { useMyCta } from "./useMyCta"

export function MyCtaManager() {
  const api = useMyCta()
  const { data, error } = api
  const [editing, setEditing] = useState<CtaCardData | "new" | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function run(id: string, work: () => Promise<unknown>) {
    setBusy(id)
    setActionError(null)
    try {
      await work()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <SettingsHeader />
      {!data ? (
        <div className="flex items-center gap-2 text-label text-muted-foreground" role="status">
          {error ? <span className="text-danger">{error}</span> : <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {!error && "Loading your CTA…"}
        </div>
      ) : !data.ready ? (
        <SettingsSection title="My CTA" description="Your photo and call to action, drawn into your images and carousels.">
          <p className="rounded-card border border-border bg-surface-raised p-5 text-label text-muted-foreground">My CTA isn&apos;t switched on yet. It will be ready shortly.</p>
        </SettingsSection>
      ) : (
        <>
          <SettingsSection
            title="Your photo"
            description="This is you on every CTA. The AI draws it as a round portrait, keeping your face as it is in the photo."
          >
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <CtaPhotoPicker api={api} />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Your CTAs"
            description={`Your name and a line like “Follow me for more”, at the end of your posts. Keep up to ${MAX_CTAS}, and pick one for each post while creating it.`}
          >
            {actionError && (
              <p role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
                {actionError}
              </p>
            )}
            {data.cards.length > 0 && (
              <ul className="flex flex-col gap-3">
                {data.cards.map((card) =>
                  editing !== "new" && editing?.id === card.id ? (
                    <li key={card.id} className="rounded-card border border-brand/40 bg-surface-raised p-5">
                      <CtaEditor api={api} card={card} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
                    </li>
                  ) : (
                    <li key={card.id} className="flex flex-wrap items-start gap-4 rounded-card border border-border bg-surface-raised p-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2 text-label font-semibold text-foreground">
                          {card.label}
                          {card.isDefault && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand">
                              <Star className="size-3 fill-current" aria-hidden />
                              Default
                            </span>
                          )}
                        </span>
                        <span className="text-label text-foreground [overflow-wrap:anywhere]">{card.line}</span>
                        <span className="text-caption text-muted-foreground [overflow-wrap:anywhere]">
                          {[card.name, card.headline, card.extra].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {!card.isDefault && (
                          <Button size="xs" variant="ghost" disabled={!!busy} onClick={() => void run(card.id, () => api.saveCard({ ...card, headline: card.headline ?? "", extra: card.extra ?? "", isDefault: true }, card.id))}>
                            Make default
                          </Button>
                        )}
                        <Button size="xs" variant="ghost" disabled={!!busy} onClick={() => setEditing(card)}>
                          <Pencil aria-hidden />
                          Edit<span className="sr-only"> {card.label}</span>
                        </Button>
                        <Button size="xs" variant="ghost" disabled={!!busy} onClick={() => void run(card.id, () => api.deleteCard(card.id))}>
                          {busy === card.id ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Trash2 aria-hidden />}
                          Delete<span className="sr-only"> {card.label}</span>
                        </Button>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
            {editing === "new" ? (
              <div className="rounded-card border border-brand/40 bg-surface-raised p-5">
                <CtaEditor api={api} onSaved={() => setEditing(null)} onCancel={data.cards.length ? () => setEditing(null) : undefined} />
              </div>
            ) : data.cards.length === 0 ? (
              <div className="rounded-card border border-border bg-surface-raised p-5">
                <CtaEditor api={api} onSaved={() => setEditing(null)} submitLabel="Save as my CTA" />
              </div>
            ) : (
              data.cards.length < MAX_CTAS && (
                <Button variant="outline" className="self-start" onClick={() => setEditing("new")}>
                  Add another CTA
                </Button>
              )
            )}
          </SettingsSection>
        </>
      )}
    </div>
  )
}
