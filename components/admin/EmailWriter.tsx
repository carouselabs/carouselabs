"use client"

// /admin/broadcasts/writer — the AI email writer. Also opened from a
// person's admin profile (/admin/users/[id]/email) to write and send a
// personal email to just them: the writer then knows their account facts. Describe the email in plain
// words; the writer drafts it (subject, preview line, body) and proposes the
// picture and stickers. Nothing is painted until you approve the art (edit
// the ideas first if you like). Saved art from earlier emails is reused where
// it fits (the writer suggests it, or pick it from the library), so only
// what's new is painted.
// Refine by chatting, test it in your inbox, then make it a campaign and send
// it in batches (lib/campaigns.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Brush, ListChecks, Mail, RotateCcw, Send, Sparkles } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { carryArt, designStickers, isFullyPainted, unpaintedArt, type EmailDesign } from "@/lib/emailDesign"
import { artActionLabel, paintingsNeeded } from "@/lib/emailArtReuse"
import { EmailArtPicker, type SavedArtItem } from "@/components/admin/EmailArtPicker"
import { SeenStatus, type SeenInfo } from "@/components/admin/SeenStatus"
import { UseAgainDialog } from "@/components/admin/UseAgainDialog"
import { AudiencePicker, EMPTY_AUDIENCE, audienceRequest, type Audience } from "@/components/admin/AudiencePicker"
import { SendingPicker } from "@/components/admin/SendingPicker"
import { DEFAULT_SENDING_CHOICE, type SendingChoice } from "@/lib/sendingRules"
import { isLeadAudience } from "@/lib/leadRules"
import type { WriterTurn } from "@/lib/ai/emailWriter"

const STORAGE_KEY = "email-writer-draft-v1"
const STARTERS = [
  "People who installed Engage for LinkedIn but have barely used it. Show them the three quickest wins and get them to try it today.",
  "Tell Free users what Pro adds, without being pushy.",
  "Welcome back people who haven't opened CarouseLabs in a month.",
  "For my leads, people who've never used CarouseLabs: introduce Engage for LinkedIn in a few lines and invite them to try it free.",
]
const personStarters = (first: string) => [
  `${first} installed Engage but has barely used it. Write a friendly note showing the one thing worth trying first.`,
  `Check in with ${first}: ask how CarouseLabs is going and offer help if anything's in the way.`,
  `Thank ${first} for being with us, and point out what they haven't tried yet that fits how they use it.`,
]

export type EmailRecipient = { id: string; email: string; name: string | null; firstName: string }
// tracked: emails sent before tracking existed have no seen/clicked.
// reuse: "personal:<id>" when it was kept in full and can be used again.
type SentEmail = { id: string; sentAt: string; by: string; subject: string; picture: string | null; tracked?: boolean; reuse?: string | null } & Partial<SeenInfo>

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Something went wrong")
  return data as T
}

// reuse: "campaign:<id>" | "personal:<id>" | "template:<id>": an email sent
// before, opened here to edit and send again (Broadcasts → Sent emails).
export function EmailWriter({ recipient, reuse }: { recipient?: EmailRecipient; reuse?: string } = {}) {
  const { toast } = useToast()
  // Each person's draft is kept apart from the others and from broadcast drafts.
  const storageKey = recipient ? `${STORAGE_KEY}:${recipient.id}` : STORAGE_KEY
  const [sending, setSending] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)
  const [sent, setSent] = useState<SentEmail[] | null>(null)
  const router = useRouter()
  const [turns, setTurns] = useState<WriterTurn[]>([])
  const [design, setDesign] = useState<EmailDesign | null>(null)
  const [input, setInput] = useState("")
  const [writing, setWriting] = useState(false)
  // What's being painted right now: "hero" and/or sticker ideas.
  const [painting, setPainting] = useState<Set<string>>(new Set())
  const [previewHtml, setPreviewHtml] = useState("")
  const [device, setDevice] = useState<"desktop" | "phone">("desktop")
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE)
  // What sends it and who it's from (lib/sendingRules.ts).
  const [sendingChoice, setSendingChoice] = useState<SendingChoice>(DEFAULT_SENDING_CHOICE)
  const [testing, setTesting] = useState(false)
  const [confirmCount, setConfirmCount] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  // The saved-art picker: for the picture, or for the sticker with this idea.
  const [picker, setPicker] = useState<null | { kind: "picture" } | { kind: "sticker"; idea: string }>(null)
  const [usingAgain, setUsingAgain] = useState<SentEmail | null>(null)
  const chatEnd = useRef<HTMLDivElement>(null)
  const restored = useRef(false)

  // A draft survives a reload (this browser only).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null")
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring once from browser storage
      if (saved?.turns) setTurns(saved.turns)
      if (saved?.design) setDesign(saved.design)
    } catch {}
    restored.current = true
  }, [storageKey])
  useEffect(() => {
    if (!restored.current) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ turns, design }))
    } catch {}
  }, [turns, design, storageKey])

  // An email to use again replaces the draft, art and all; the address bar
  // forgets it so a reload keeps the edits.
  useEffect(() => {
    if (!reuse) return
    let cancelled = false
    fetch(`/api/admin/sent-emails/content?source=${encodeURIComponent(reuse)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Couldn't load that email")
        if (cancelled) return
        if (!data.design) throw new Error("That email was written without the AI writer, so it can't be edited here")
        setDesign(data.design)
        setTurns([
          {
            role: "writer",
            text: `Loaded "${data.subject}" to use again. Its picture and stickers are already painted. Change anything you like${data.mentionsName ? `; it still says "${data.mentionsName}" by name, so ask me to change that to their own name` : ""}, then send it.`,
          },
        ])
        window.history.replaceState(null, "", window.location.pathname)
      })
      .catch((err) => !cancelled && toast(err instanceof Error ? err.message : "Couldn't load that email", "error"))
    return () => {
      cancelled = true
    }
  }, [reuse, toast])

  // The personal emails already sent to this person.
  const loadSent = useCallback(async () => {
    if (!recipient) return
    try {
      const res = await fetch(`/api/admin/users/${recipient.id}/email`)
      const data = await res.json().catch(() => ({}))
      setSent(res.ok ? data.emails : [])
    } catch {
      setSent([])
    }
  }, [recipient])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loadSent sets state after its fetch
  useEffect(() => void loadSent(), [loadSent])
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup.
    chatEnd.current?.scrollIntoView({ block: "end" })
  }, [turns, writing])

  // The preview is rendered by the server exactly as it'll be sent.
  useEffect(() => {
    if (!design) return
    const timer = setTimeout(() => {
      postJson<{ html: string }>("/api/admin/email-writer/preview", { design })
        .then((d) => setPreviewHtml(d.html))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [design])

  const recipients = audienceRequest(audience)

  async function ask(request: string) {
    const text = request.trim()
    if (!text || writing) return
    const history = turns
    setTurns((t) => [...t, { role: "admin", text }])
    setInput("")
    setWriting(true)
    try {
      const data = await postJson<{ reply: string; design: EmailDesign }>("/api/admin/email-writer/draft", {
        request: text,
        history,
        current: design,
        recipientUserId: recipient?.id,
      })
      setTurns((t) => [...t, { role: "writer", text: data.reply }])
      setDesign(data.design)
    } catch (e) {
      // Take the message back so it can be sent again.
      setTurns(history)
      setInput(text)
      toast(e instanceof Error ? e.message : "The writer couldn't answer", "error")
    } finally {
      setWriting(false)
    }
  }

  // Edits from the art card: changed ideas lose their old painting.
  const editDesign = useCallback((edit: (d: EmailDesign) => EmailDesign) => {
    setDesign((d) => (d ? carryArt(d, edit(d)) : d))
  }, [])

  const mark = (key: string, on: boolean) =>
    setPainting((p) => {
      const next = new Set(p)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  async function paintHero(d: EmailDesign, { fresh = false } = {}) {
    const { scene, lead, accent } = d.hero
    mark("hero", true)
    try {
      let paintingUrl = fresh ? undefined : d.hero.paintingUrl
      if (!paintingUrl) {
        paintingUrl = (await postJson<{ url: string }>("/api/admin/email-writer/paint", { kind: "scene", scene })).url
        setDesign((cur) => (cur && cur.hero.scene === scene ? { ...cur, hero: { ...cur.hero, paintingUrl, imageUrl: undefined } } : cur))
      }
      const imageUrl = (await postJson<{ url: string }>("/api/admin/email-writer/paint", { kind: "headline", paintingUrl, lead, accent })).url
      setDesign((cur) =>
        cur && cur.hero.scene === scene && cur.hero.lead === lead && cur.hero.accent === accent
          ? { ...cur, hero: { ...cur.hero, paintingUrl, imageUrl } }
          : cur,
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't paint the picture", "error")
    } finally {
      mark("hero", false)
    }
  }

  async function paintSticker(idea: string) {
    mark(idea, true)
    try {
      const { url } = await postJson<{ url: string }>("/api/admin/email-writer/paint", { kind: "sticker", idea })
      setDesign((cur) =>
        cur
          ? {
              ...cur,
              blocks: cur.blocks.map((b) =>
                b.type === "features"
                  ? { ...b, items: b.items.map((i) => (i.sticker.idea === idea ? { ...i, sticker: { idea, imageUrl: url } } : i)) }
                  : b,
              ),
            }
          : cur,
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : `Couldn't paint "${idea}"`, "error")
    } finally {
      mark(idea, false)
    }
  }

  // Saved art is already painted: it goes straight in, past carryArt (which
  // would drop it for having a new description). A saved picture only needs
  // this email's headline drawn on.
  function pickSaved(art: SavedArtItem) {
    const target = picker
    setPicker(null)
    if (!target || !design) return
    if (target.kind === "picture") {
      setDesign({ ...design, hero: { ...design.hero, scene: art.description, paintingUrl: art.url, imageUrl: undefined } })
      return
    }
    if (designStickers(design).some((s) => s.idea === art.description && s.idea !== target.idea)) {
      toast("That sticker is already in this email", "error")
      return
    }
    setDesign({
      ...design,
      blocks: design.blocks.map((b) =>
        b.type === "features"
          ? { ...b, items: b.items.map((i) => (i.sticker.idea === target.idea ? { ...i, sticker: { idea: art.description, imageUrl: art.url } } : i)) }
          : b,
      ),
    })
  }

  function paintMissing() {
    if (!design) return
    const jobs: Promise<void>[] = []
    if (!design.hero.imageUrl && !painting.has("hero")) jobs.push(paintHero(design))
    for (const s of designStickers(design)) if (!s.imageUrl && !painting.has(s.idea)) jobs.push(paintSticker(s.idea))
    void Promise.all(jobs)
  }

  async function sendTest() {
    if (!design) return
    setTesting(true)
    try {
      const data = await postJson<{ sentTo: string }>("/api/admin/email-writer/test", { design })
      toast(`Test sent to ${data.sentTo}`, "success")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Test send failed", "error")
    } finally {
      setTesting(false)
    }
  }

  const campaignBody = () => ({ design, ...recipients, sending: sendingChoice })

  async function startCampaign() {
    try {
      const data = await postJson<{ count: number }>("/api/admin/campaigns", { ...campaignBody(), dryRun: true })
      if (data.count === 0) {
        toast("Nobody matches that selection", "error")
        return
      }
      setConfirmCount(data.count)
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't count who it's for", "error")
    }
  }

  async function createCampaign() {
    setCreating(true)
    try {
      const data = await postJson<{ id: string; total: number }>("/api/admin/campaigns", campaignBody())
      try {
        localStorage.removeItem(storageKey)
      } catch {}
      toast(`Campaign created for ${data.total} people. Pick who to send to first.`, "success")
      router.push(`/admin/broadcasts/campaigns/${data.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create the campaign", "error")
      setCreating(false)
      setConfirmCount(null)
    }
  }

  async function sendToPerson() {
    if (!design || !recipient) return
    setSending(true)
    try {
      const data = await postJson<{ sentTo: string }>(`/api/admin/users/${recipient.id}/email`, { design, sending: sendingChoice })
      toast(`Sent to ${data.sentTo}`, "success")
      try {
        localStorage.removeItem(storageKey)
      } catch {}
      startOver()
      await loadSent()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send it", "error")
    } finally {
      setSending(false)
      setConfirmSend(false)
    }
  }

  function startOver() {
    setTurns([])
    setDesign(null)
    setPreviewHtml("")
    setInput("")
  }

  const missing = useMemo(() => (design ? unpaintedArt(design) : null), [design])
  const paintLabel = design ? artActionLabel(paintingsNeeded(design)) : ""
  const painted = design ? isFullyPainted(design) : false
  const anyPainting = painting.size > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lead font-bold text-foreground">
            {recipient ? `Email ${recipient.name ?? recipient.email}` : "Write with AI"}
          </h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {recipient
              ? `A personal email to ${recipient.email} only. Say what you want to tell them; the writer knows their plan and how they use CarouseLabs, and suggests a picture and stickers you approve before anything is painted.`
              : "Say who it's for and what it should do. The writer drafts it and suggests a picture and stickers; you approve them before anything is painted."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(turns.length > 0 || design) && (
            <button
              type="button"
              onClick={startOver}
              className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Start over
            </button>
          )}
          <Link
            href={recipient ? `/admin/users/${recipient.id}` : "/admin/broadcasts"}
            className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {recipient ? "Their profile" : "Broadcasts"}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* The conversation */}
          <AdminCard title="Writer">
            <div className="flex flex-col gap-4">
              <div className="flex max-h-[26rem] min-h-40 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
                {turns.length === 0 && !writing && (
                  <div className="flex flex-col gap-2">
                    <p className="text-caption text-muted-foreground">Try one of these, or write your own:</p>
                    {(recipient ? personStarters(recipient.firstName) : STARTERS).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void ask(s)}
                        className="rounded-control border border-border bg-background px-3 py-2 text-left text-caption text-foreground transition-colors hover:border-brand"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {turns.map((t, i) => (
                  <div
                    key={i}
                    className={
                      t.role === "admin"
                        ? "ml-8 self-end rounded-card rounded-br-md bg-brand/15 px-3.5 py-2.5 text-label text-foreground"
                        : "mr-8 self-start rounded-card rounded-bl-md border border-border bg-background px-3.5 py-2.5 text-label whitespace-pre-wrap text-foreground"
                    }
                  >
                    {t.text}
                  </div>
                ))}
                {writing && (
                  <div className="mr-8 inline-flex items-center gap-2 self-start rounded-card border border-border bg-background px-3.5 py-2.5 text-label text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand motion-reduce:animate-none" aria-hidden />
                    Writing… this takes about half a minute
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void ask(input)
                }}
                className="flex flex-col gap-2"
              >
                <textarea
                  id="email-writer-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void ask(input)
                    }
                  }}
                  rows={3}
                  disabled={writing}
                  placeholder={design ? "Ask for a change: shorter, friendlier, a different picture…" : "Who's it for, and what should it do?"}
                  aria-label="Message to the writer"
                  className="w-full rounded-control-sm border border-border bg-background p-3 text-label text-foreground outline-none placeholder:text-muted-foreground/80 focus:border-brand"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption text-muted-foreground/80">Enter to send · Shift+Enter for a new line</span>
                  <AdminButton type="submit" loading={writing} disabled={!input.trim()}>
                    <Send aria-hidden />
                    {design ? "Revise" : "Write it"}
                  </AdminButton>
                </div>
              </form>
            </div>
          </AdminCard>

          {/* The picture and stickers: approve (or edit) before painting */}
          {design && (
            <AdminCard
              title="Picture & stickers"
              actions={
                missing && (missing.hero || missing.stickers > 0) ? (
                  <AdminButton onClick={paintMissing} loading={anyPainting} disabled={anyPainting}>
                    <Brush aria-hidden />
                    {anyPainting ? "Painting…" : paintLabel}
                  </AdminButton>
                ) : (
                  <span className="text-caption font-medium text-success">All painted</span>
                )
              }
            >
              <div className="flex flex-col gap-5">
                <p className="text-caption text-muted-foreground">
                  Check the ideas, change anything you like, then paint. Saved pictures and stickers cost nothing to reuse; new ones
                  take about a minute each.
                </p>
                <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <div className="relative aspect-[5/3] overflow-hidden rounded-control border border-border bg-background">
                    {design.hero.imageUrl || design.hero.paintingUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a preview of R2 art
                      <img src={design.hero.imageUrl ?? design.hero.paintingUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center p-2 text-center text-caption text-muted-foreground">
                        {painting.has("hero") ? "Painting…" : "Not painted yet"}
                      </span>
                    )}
                    {painting.has("hero") && <span className="absolute inset-0 animate-pulse bg-brand/20 motion-reduce:animate-none" aria-hidden />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-col gap-2">
                      <AdminInput
                        aria-label="Headline, plain part"
                        value={design.hero.lead}
                        maxLength={40}
                        onChange={(e) => editDesign((d) => ({ ...d, hero: { ...d.hero, lead: e.target.value } }))}
                      />
                      <AdminInput
                        aria-label="Headline, italic part"
                        value={design.hero.accent}
                        maxLength={40}
                        className="italic"
                        onChange={(e) => editDesign((d) => ({ ...d, hero: { ...d.hero, accent: e.target.value } }))}
                      />
                    </div>
                    <textarea
                      aria-label="What the picture shows"
                      value={design.hero.scene}
                      maxLength={300}
                      rows={2}
                      onChange={(e) => editDesign((d) => ({ ...d, hero: { ...d.hero, scene: e.target.value } }))}
                      className="w-full rounded-control-sm border border-border bg-background p-2.5 text-caption text-foreground outline-none focus:border-brand"
                    />
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <button
                        type="button"
                        disabled={painting.has("hero")}
                        onClick={() => setPicker({ kind: "picture" })}
                        className="text-caption font-medium text-brand hover:underline disabled:opacity-50"
                      >
                        Use a saved picture
                      </button>
                      {design.hero.imageUrl && (
                        <button
                          type="button"
                          disabled={painting.has("hero")}
                          onClick={() => void paintHero(design, { fresh: true })}
                          className="text-caption font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          Paint a new picture
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {designStickers(design).length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-caption font-semibold text-muted-foreground">Stickers</span>
                    {designStickers(design).map((s) => (
                      <div key={s.idea} className="flex items-center gap-3">
                        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                          {s.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- a preview of R2 art
                            <img src={s.imageUrl} alt="" className="size-10 object-contain" />
                          ) : (
                            <span className={`size-3 rounded-full ${painting.has(s.idea) ? "animate-pulse bg-brand" : "bg-border"}`} aria-hidden />
                          )}
                        </span>
                        <AdminInput
                          aria-label="Sticker idea"
                          defaultValue={s.idea}
                          maxLength={120}
                          className="flex-1"
                          onBlur={(e) => {
                            const idea = e.target.value.trim()
                            if (idea.length < 2 || idea === s.idea) return
                            editDesign((d) => ({
                              ...d,
                              blocks: d.blocks.map((b) =>
                                b.type === "features"
                                  ? { ...b, items: b.items.map((i) => (i.sticker.idea === s.idea ? { ...i, sticker: { idea } } : i)) }
                                  : b,
                              ),
                            }))
                          }}
                        />
                        <button
                          type="button"
                          disabled={painting.has(s.idea)}
                          onClick={() => setPicker({ kind: "sticker", idea: s.idea })}
                          aria-label={`Use a saved sticker instead of ${s.idea}`}
                          className="shrink-0 text-caption font-medium text-brand hover:underline disabled:opacity-50"
                        >
                          Saved…
                        </button>
                        {s.imageUrl && (
                          <button
                            type="button"
                            disabled={painting.has(s.idea)}
                            onClick={() => void paintSticker(s.idea)}
                            className="shrink-0 text-caption font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            Repaint
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {picker && <EmailArtPicker kind={picker.kind} onPick={pickSaved} onClose={() => setPicker(null)} />}
            </AdminCard>
          )}

          {/* A personal email: test it, then send it to them */}
          {recipient && design && (
            <AdminCard title="Send it">
              <div className="flex flex-col gap-4">
                <p className="text-label text-foreground">
                  To <span className="font-semibold">{recipient.name ?? recipient.firstName}</span>{" "}
                  <span className="text-muted-foreground">&lt;{recipient.email}&gt;</span>
                </p>
                <SendingPicker idPrefix="person-sending" personal value={sendingChoice} onChange={setSendingChoice} />
                {!painted && <p className="text-caption text-warning">Paint the picture and stickers before testing or sending.</p>}
                <div className="flex flex-wrap gap-2">
                  <AdminButton variant="secondary" onClick={() => void sendTest()} loading={testing} disabled={!painted}>
                    <Mail aria-hidden />
                    Send test to me
                  </AdminButton>
                  <AdminButton onClick={() => setConfirmSend(true)} disabled={!painted} className="ml-auto">
                    <Send aria-hidden />
                    Send to {recipient.firstName}
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          )}

          {recipient && (
            <AdminCard title={`Emails sent to ${recipient.firstName}`}>
              {usingAgain?.reuse && <UseAgainDialog source={usingAgain.reuse} subject={usingAgain.subject} onClose={() => setUsingAgain(null)} />}
              {sent === null ? (
                <p className="text-caption text-muted-foreground">Loading…</p>
              ) : sent.length === 0 ? (
                <p className="text-caption text-muted-foreground">No personal emails yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {sent.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      {e.picture && (
                        // eslint-disable-next-line @next/next/no-img-element -- a thumbnail of R2 art
                        <img src={e.picture} alt="" className="h-9 w-14 shrink-0 rounded-detail object-cover" />
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-label text-foreground">{e.subject}</span>
                        <span className="text-caption text-muted-foreground">
                          {fmtDateTime(e.sentAt)} · {e.by}
                        </span>
                        {e.tracked && (
                          <span className="text-caption">
                            <SeenStatus openedAt={e.openedAt ?? null} openCount={e.openCount ?? 0} clickedAt={e.clickedAt ?? null} clickCount={e.clickCount ?? 0} />
                          </span>
                        )}
                      </span>
                      {e.reuse && (
                        <button
                          type="button"
                          onClick={() => setUsingAgain(e)}
                          className="ml-auto shrink-0 text-caption font-medium text-brand hover:underline"
                        >
                          Use again
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          )}

          {/* Who it's for, test, campaign */}
          {!recipient && design && (
            <AdminCard title="Send it">
              <div className="flex flex-col gap-4">
                <AudiencePicker id="writer-audience" value={audience} onChange={setAudience} />
                <SendingPicker idPrefix="writer-sending" value={sendingChoice} onChange={setSendingChoice} forLeads={isLeadAudience(audience.audience)} />
                {!painted && <p className="text-caption text-warning">Paint the picture and stickers before testing or sending.</p>}
                <div className="flex flex-wrap gap-2">
                  <AdminButton variant="secondary" onClick={() => void sendTest()} loading={testing} disabled={!painted}>
                    <Mail aria-hidden />
                    Send test to me
                  </AdminButton>
                  <AdminButton onClick={() => void startCampaign()} disabled={!painted || !recipients} className="ml-auto">
                    <ListChecks aria-hidden />
                    Create campaign
                  </AdminButton>
                </div>
                <p className="text-caption text-muted-foreground/80">
                  A campaign sends nothing yet: you pick who gets it, a batch at a time, from its page.
                </p>
              </div>
            </AdminCard>
          )}
        </div>

        {/* The email as it'll arrive */}
        <AdminCard
          title="Preview"
          className="min-w-0 xl:sticky xl:top-0"
          actions={
            design ? (
              <div className="flex rounded-control-sm border border-border bg-background p-0.5" role="group" aria-label="Screen">
                {(["desktop", "phone"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={device === d}
                    onClick={() => setDevice(d)}
                    className={`rounded-md px-2.5 py-1 text-caption font-semibold capitalize ${device === d ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        >
          {design ? (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-caption">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="font-semibold text-foreground">{design.subject}</dd>
                <dt className="text-muted-foreground">Preview</dt>
                <dd className="text-muted-foreground">{design.preview}</dd>
              </dl>
              <div className="flex justify-center rounded-control bg-[#F0ECE5] p-2">
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className={`h-[72vh] max-w-full rounded-control-sm border-0 bg-[#F0ECE5] transition-[width] duration-200 ${device === "phone" ? "w-[390px]" : "w-full"}`}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="h-5 w-5 text-brand" aria-hidden />
              <p className="text-label text-foreground">Your email will appear here</p>
              <p className="max-w-sm text-caption text-muted-foreground">
                In the same design as every CarouseLabs email, with a picture and stickers painted just for it.
              </p>
            </div>
          )}
        </AdminCard>
      </div>

      {recipient && (
        <ConfirmModal
          open={confirmSend}
          onClose={() => setConfirmSend(false)}
          loading={sending}
          title={`Send this to ${recipient.name ?? recipient.firstName}?`}
          body={`"${design?.subject ?? ""}" goes to ${recipient.email} now. This can't be undone.`}
          confirmLabel={`Send to ${recipient.firstName}`}
          onConfirm={() => void sendToPerson()}
        />
      )}

      <ConfirmModal
        open={confirmCount !== null}
        onClose={() => setConfirmCount(null)}
        loading={creating}
        title="Create this campaign?"
        body={`A campaign for ${confirmCount ?? 0} ${confirmCount === 1 ? "person" : "people"}. Nothing is sent yet: you'll pick who gets it, a batch at a time.`}
        confirmLabel="Create campaign"
        onConfirm={() => void createCampaign()}
      />
    </div>
  )
}
