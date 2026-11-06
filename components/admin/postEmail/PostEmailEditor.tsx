"use client"

// /admin/broadcasts/post — Share a LinkedIn post (lib/postEmail.ts): the
// admin fills in any post (or lets the AI fill it from a screenshot), writes
// their words around it (or lets the AI write them), sees the email as
// people will, sends themselves a test, then makes it a campaign
// (UseAgainDialog), where it's sent a batch at a time like any other.
// Everything is kept in this browser as a draft until it's sent, so a closed
// tab loses nothing. ?reuse=campaign:<id>|template:<id> opens one sent before.
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  ChartBar,
  Film,
  GalleryHorizontal,
  Image as ImageIcon,
  Images,
  Link2,
  Loader2,
  MailCheck,
  Newspaper,
  Repeat2,
  RotateCcw,
  ScanText,
  Send,
  Sparkles,
  Type,
  Video,
  X,
} from "lucide-react"
import { AdminButton, AdminCard, ConfirmModal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { UseAgainDialog, type UseAgainContent } from "@/components/admin/UseAgainDialog"
import {
  POST_TYPES,
  currentBuilt,
  newPostEmail,
  pictureKeys,
  postEmailHtml,
  postEmailProblems,
  postEmailSchema,
  type BuiltKind,
  type PostEmail,
  type PostType,
} from "@/lib/postEmail"
import { personalizePreview } from "@/lib/readyEmails"
import type { ScreenshotRead } from "@/lib/ai/postEmailAi"
import { applyScreenshot, screenshotNotes, type ScreenshotPictures } from "./applyScreenshot"
import { Switch, TextArea, TextField } from "./fields"
import { AuthorFields, CaptionFields, NumbersFields, TopCommentFields, TypeFields, type EditPost } from "./PostFields"
import { json } from "./upload"

const DRAFT_KEY = "postEmailDraft:v1"
const EXAMPLE_NAME = "Priya"
const DEFAULT_GOAL = "Share this post with our readers and why it's worth reading. If it fits, point them to CarouseLabs Engage, which helps them comment thoughtfully every day."

const TYPE_ICONS: Record<PostType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  photos: Images,
  slideshow: GalleryHorizontal,
  video: Video,
  gif: Film,
  poll: ChartBar,
  article: Newspaper,
  link: Link2,
  repost: Repeat2,
  event: CalendarDays,
}

// Names for the fields a check can point at.
const FIELD_NAMES: Record<string, string> = {
  subject: "Subject",
  preview: "Inbox preview line",
  fromName: "From name",
  greeting: "Greeting",
  intro: "Words before the post",
  outro: "Words after the post",
  signoff: "Sign-off",
  signature: "Signature",
  label: "Button words",
  url: "Link",
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// A saved draft over today's blank email, so a field added later still has its default.
function fromDraft(raw: string | null): PostEmail | null {
  if (!raw) return null
  try {
    const draft = JSON.parse(raw) as Partial<PostEmail>
    if (!draft || draft.version !== 1 || typeof draft.post !== "object") return null
    const blank = newPostEmail(today())
    return { ...blank, ...draft, button: { ...blank.button, ...draft.button }, post: { ...blank.post, ...draft.post }, built: draft.built ?? {} }
  } catch {
    return null
  }
}

function readDraft(): PostEmail | null {
  try {
    return fromDraft(localStorage.getItem(DRAFT_KEY))
  } catch {
    return null
  }
}

function saveDraft(email: PostEmail) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(email))
  } catch {
    // Private windows and full storage: the page works without a saved draft.
  }
}

const areaCls = "h-auto min-h-20 w-full rounded-control border border-control-border bg-surface px-3 py-2 text-label leading-relaxed text-foreground"

export function PostEmailEditor({ reuse }: { reuse?: string }) {
  const { toast } = useToast()
  const [email, setEmail] = useState<PostEmail | null>(null)
  const [device, setDevice] = useState<"desktop" | "phone">("desktop")
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [buildTry, setBuildTry] = useState(0)
  const [reading, setReading] = useState(false)
  const [notes, setNotes] = useState<string[]>([])
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [writing, setWriting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [campaign, setCampaign] = useState(false)
  const [startOver, setStartOver] = useState(false)
  const screenshotInput = useRef<HTMLInputElement>(null)

  // Open: an email sent before (Use again → Edit first), the draft, or a new one.
  useEffect(() => {
    let cancelled = false
    async function open() {
      if (reuse) {
        try {
          const content = await json<{ post?: unknown }>(await fetch(`/api/admin/sent-emails/content?source=${encodeURIComponent(reuse)}`))
          const parsed = postEmailSchema.safeParse(content.post)
          if (parsed.success) {
            if (!cancelled) setEmail({ ...parsed.data, post: { ...parsed.data.post, asOf: today() } })
            return
          }
          toast("That email isn't a shared post, so a new one is open", "error")
        } catch (err) {
          toast(err instanceof Error ? err.message : "Couldn't load that email", "error")
        }
      }
      if (!cancelled) setEmail(readDraft() ?? newPostEmail(today()))
    }
    void open()
    return () => {
      cancelled = true
    }
    // Opened once per address; toast only reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuse])

  // Kept as a draft as it changes.
  useEffect(() => {
    if (!email) return
    const timer = setTimeout(() => saveDraft(email), 400)
    return () => clearTimeout(timer)
  }, [email])

  const edit: EditPost = (fn) => setEmail((e) => (e ? { ...e, post: { ...e.post, ...fn(e.post) } } : e))
  const set = (patch: Partial<PostEmail>) => setEmail((e) => (e ? { ...e, ...patch } : e))

  // The pictures made on the server, made again when what they're made from changes.
  const keys = email ? pictureKeys(email) : null
  const keysJson = JSON.stringify(keys)
  const missing = email && keys ? (Object.keys(keys) as BuiltKind[]).filter((k) => keys[k] && !currentBuilt(email, k)) : []
  const needsBuild = missing.length > 0
  useEffect(() => {
    if (!email || !needsBuild) return
    const snapshot = email
    const timer = setTimeout(async () => {
      setBuilding(true)
      try {
        const p = snapshot.post
        const data = await json<{ built: PostEmail["built"] }>(
          await fetch("/api/admin/post-email/pictures", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: { post: { type: p.type, author: p.author, photos: p.photos, video: p.video, slides: p.slides }, built: snapshot.built } }),
          }),
        )
        // Only what still matches the email as it is now (it may have changed meanwhile).
        setEmail((e) => {
          if (!e) return e
          const now = pictureKeys(e)
          const built = { ...e.built }
          for (const kind of Object.keys(data.built) as BuiltKind[]) {
            const made = data.built[kind]
            if (made && made.key === now[kind]) built[kind] = made
          }
          return { ...e, built }
        })
        setBuildError(null)
      } catch (err) {
        setBuildError(err instanceof Error ? err.message : "Couldn't make the pictures")
      } finally {
        setBuilding(false)
      }
    }, 600)
    return () => clearTimeout(timer)
    // keysJson says when what the pictures are made from changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysJson, needsBuild, buildTry])

  const html = useMemo(() => (email ? personalizePreview(postEmailHtml(email, { preview: true }), EXAMPLE_NAME) : ""), [email])

  const problems = useMemo(() => {
    if (!email) return []
    const parsed = postEmailSchema.safeParse(email)
    const shape = parsed.success
      ? []
      : parsed.error.issues.slice(0, 3).map((i) => {
          const field = [...i.path].reverse().find((k) => typeof k === "string" && FIELD_NAMES[k])
          return field ? `${FIELD_NAMES[field as string]}: ${i.message}` : i.message
        })
    return [...new Set([...postEmailProblems(email), ...shape])]
  }, [email])
  const ready = problems.length === 0 && !needsBuild

  const campaignContent = useMemo<UseAgainContent | null>(
    () => (email && campaign ? { subject: email.subject, body: "", design: null, post: email, mentionsName: null } : null),
    // Opened with the email as it was when "Make a campaign" was pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaign],
  )

  async function readScreenshot(file: File) {
    setReading(true)
    setNotes([])
    try {
      const form = new FormData()
      form.append("file", file, file.name)
      const data = await json<{ read: ScreenshotRead; pictures: ScreenshotPictures }>(await fetch("/api/admin/post-email/screenshot", { method: "POST", body: form }))
      setEmail((e) => (e ? applyScreenshot(e, data.read, data.pictures) : e))
      setNotes(screenshotNotes(data.read, data.pictures))
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't read that screenshot", "error")
    } finally {
      setReading(false)
    }
  }

  async function writeWords() {
    if (!email) return
    setWriting(true)
    try {
      const data = await json<{ words: Pick<PostEmail, "subject" | "preview" | "greeting" | "intro" | "outro" | "signoff" | "button"> }>(
        await fetch("/api/admin/post-email/words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, goal }),
        }),
      )
      set(data.words)
      toast("Written. Read it over and change anything.", "success")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't write the words", "error")
    } finally {
      setWriting(false)
    }
  }

  async function sendTest() {
    if (!email) return
    setTesting(true)
    try {
      const data = await json<{ sentTo: string; built: PostEmail["built"] }>(
        await fetch("/api/admin/post-email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),
      )
      toast(`Test sent to ${data.sentTo}`, "success")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't send the test", "error")
    } finally {
      setTesting(false)
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-caption text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Opening…
      </div>
    )
  }
  const p = email.post

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/broadcasts" className="inline-flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        Broadcasts
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title-sm font-semibold text-foreground">Share a LinkedIn post</h1>
          <p className="max-w-[70ch] text-label text-muted-foreground">
            Any post, shown the way LinkedIn shows it: the author&apos;s banner and photo, their headline and followers, the post, its likes and a
            top comment. Every part of it opens the post. Your words go around it. Kept here as a draft until you send it.
          </p>
        </div>
        <AdminButton variant="ghost" onClick={() => setStartOver(true)}>
          <RotateCcw aria-hidden />
          Start over
        </AdminButton>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <AdminCard title="1. The post">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-medium text-muted-foreground">What kind of post</span>
                <div role="radiogroup" aria-label="What kind of post" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {POST_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t.id]
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={p.type === t.id}
                        onClick={() => edit(() => ({ type: t.id }))}
                        className="flex items-center gap-2 rounded-control-sm border border-border px-3 py-2 text-left text-label font-medium text-foreground transition-colors aria-checked:border-brand aria-checked:bg-brand-soft"
                      >
                        <Icon className="size-4 shrink-0 text-brand" aria-hidden />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <TextField
                label="The post's link"
                type="url"
                value={p.url}
                onChange={(url) => edit(() => ({ url: url.trim() }))}
                max={500}
                placeholder="https://www.linkedin.com/feed/update/urn:li:activity:…"
                hint="On LinkedIn: the post's ••• menu → Copy link to post. Every click in the email goes here."
              />
              <div className="flex flex-col gap-2 rounded-control-sm border border-dashed border-border bg-surface-muted/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-label font-semibold text-foreground">Fill from a screenshot</span>
                    <span className="text-caption text-muted-foreground">
                      Take a screenshot of the post on LinkedIn (with its likes, and a comment if you want one). The AI copies everything and cuts out the
                      pictures. About 20 seconds.
                    </span>
                  </div>
                  <AdminButton variant="secondary" loading={reading} onClick={() => screenshotInput.current?.click()}>
                    {!reading && <ScanText aria-hidden />}
                    {reading ? "Reading…" : "Choose screenshot"}
                  </AdminButton>
                  <input
                    ref={screenshotInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Screenshot of the post"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (file) void readScreenshot(file)
                    }}
                  />
                </div>
                {notes.length > 0 && (
                  <div role="status" className="flex items-start gap-2 rounded-control-sm bg-brand-soft px-3 py-2 text-caption text-foreground">
                    <ul className="flex flex-1 list-disc flex-col gap-1 pl-4">
                      {notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => setNotes([])} aria-label="Hide these notes" className="text-muted-foreground hover:text-foreground">
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>

          <AdminCard title="2. Who posted it">
            <AuthorFields post={p} edit={edit} />
          </AdminCard>

          <AdminCard title="3. What the post says and shows">
            <div className="flex flex-col gap-6">
              <CaptionFields post={p} edit={edit} />
              <div className="border-t border-border pt-5">
                <TypeFields post={p} edit={edit} />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="4. Likes and the top comment">
            <div className="flex flex-col gap-6">
              <NumbersFields post={p} edit={edit} />
              <div className="border-t border-border pt-5">
                <TopCommentFields post={p} edit={edit} />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="5. Your words">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 rounded-control-sm border border-dashed border-border bg-surface-muted/60 p-4">
                <label htmlFor="post-email-goal" className="text-label font-semibold text-foreground">
                  Write with AI
                </label>
                <textarea id="post-email-goal" value={goal} maxLength={600} rows={3} onChange={(e) => setGoal(e.target.value)} className={areaCls} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-caption text-muted-foreground">Say what the email is for. It writes the subject, preview, words and button; the post stays as it is.</span>
                  <AdminButton onClick={() => void writeWords()} loading={writing}>
                    {!writing && <Sparkles aria-hidden />}
                    {writing ? "Writing…" : "Write with AI"}
                  </AdminButton>
                </div>
              </div>
              <TextField label="Subject" value={email.subject} onChange={(subject) => set({ subject })} max={200} placeholder="The 10-minute habit that grew her reach 4x" />
              <TextField label="Inbox preview line" value={email.preview} onChange={(preview) => set({ preview })} max={200} hint="Shown after the subject in the inbox." />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="From name" value={email.fromName} onChange={(fromName) => set({ fromName })} max={80} hint="At the address you pick when you make the campaign." />
                <TextField label="Greeting" value={email.greeting} onChange={(greeting) => set({ greeting })} max={120} hint="{{firstName}} becomes each person's first name." />
              </div>
              <TextArea label="Words before the post" value={email.intro} onChange={(intro) => set({ intro })} max={3000} rows={4} hint="A blank line starts a new paragraph." />
              <TextArea label="Words after the post (optional)" value={email.outro} onChange={(outro) => set({ outro })} max={3000} rows={3} />
              <div className="flex flex-col gap-3 rounded-control-sm border border-border p-4">
                <Switch label="A button after your words" checked={email.button.show} onChange={(show) => set({ button: { ...email.button, show } })} />
                {email.button.show && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Button words" value={email.button.label} onChange={(label) => set({ button: { ...email.button, label } })} max={60} />
                    <TextField
                      label="Button link"
                      type="url"
                      value={email.button.url}
                      onChange={(url) => set({ button: { ...email.button, url: url.trim() } })}
                      max={500}
                      hint="carouselabs.com, the Chrome Web Store listings, LinkedIn or X."
                    />
                  </div>
                )}
              </div>
              <TextField
                label="The button under the post"
                value={p.viewLabel}
                onChange={(viewLabel) => edit(() => ({ viewLabel }))}
                max={60}
                placeholder="Empty: the usual words for this kind of post"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Sign-off" value={email.signoff} onChange={(signoff) => set({ signoff })} max={200} />
                <TextField label="Signature" value={email.signature} onChange={(signature) => set({ signature })} max={80} />
              </div>
            </div>
          </AdminCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-0">
          <AdminCard
            title="Preview"
            actions={
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
            }
          >
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-caption">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="min-w-0 break-words font-semibold text-foreground">{email.subject || <span className="font-normal text-muted-foreground">Not written yet</span>}</dd>
                <dt className="text-muted-foreground">Preview</dt>
                <dd className="min-w-0 break-words text-muted-foreground">{email.preview || "—"}</dd>
              </dl>
              <div className="flex justify-center rounded-control bg-[#F0ECE5] p-2">
                <iframe
                  title="Email preview"
                  srcDoc={html}
                  sandbox=""
                  className={`h-[72vh] max-w-full rounded-control-sm border-0 bg-[#F0ECE5] transition-[width] duration-200 ${device === "phone" ? "w-[390px]" : "w-full"}`}
                />
              </div>
              <p className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground" aria-live="polite">
                {building ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                    Making the pictures…
                  </>
                ) : buildError ? (
                  <>
                    <span className="text-danger">{buildError}</span>
                    <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setBuildTry((n) => n + 1)}>
                      Try again
                    </button>
                  </>
                ) : (
                  <>Shown with the example name {EXAMPLE_NAME}. Gray words are hints that won&apos;t be sent.</>
                )}
              </p>
            </div>
          </AdminCard>

          <AdminCard title="Send">
            <div className="flex flex-col gap-3">
              {problems.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-caption font-semibold text-foreground">Before it can go out:</span>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-caption text-muted-foreground">
                    {problems.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : needsBuild ? (
                <p className="text-caption text-muted-foreground">Waiting for the pictures…</p>
              ) : (
                <p className="text-caption text-muted-foreground">Ready. Send yourself a test to see it in a real inbox, then make it a campaign.</p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <AdminButton variant="secondary" onClick={() => void sendTest()} loading={testing} disabled={!ready}>
                  {!testing && <MailCheck aria-hidden />}
                  Send me a test
                </AdminButton>
                <AdminButton onClick={() => setCampaign(true)} disabled={!ready}>
                  <Send aria-hidden />
                  Make a campaign
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      {campaign && campaignContent && (
        <UseAgainDialog source="" subject={email.subject} title="Make a campaign" content={campaignContent} onClose={() => setCampaign(false)} />
      )}
      <ConfirmModal
        open={startOver}
        onClose={() => setStartOver(false)}
        onConfirm={() => {
          setEmail(newPostEmail(today()))
          setNotes([])
          setStartOver(false)
        }}
        title="Start over?"
        body="This clears the post and your words. Pictures you uploaded stay saved, but this email won't point at them."
        confirmLabel="Start over"
      />
    </div>
  )
}
