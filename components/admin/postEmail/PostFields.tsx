"use client"

// The post itself on Share a post: its kind, its text (whole or cut like the
// feed) and what each kind adds (pictures, slides, a poll, an article...).
import { BANNER_COLORS, SHORT_CAPTION, SLIDES_SHOWN, type PostEmail } from "@/lib/postEmail"
import { Choice, PictureField, PictureList, Switch, TextArea, TextField, labelCls } from "./fields"

type Post = PostEmail["post"]
export type EditPost = (fn: (p: Post) => Partial<Post>) => void

export function CaptionFields({ post, edit }: { post: Post; edit: EditPost }) {
  return (
    <div className="flex flex-col gap-4">
      <TextArea
        label={post.type === "repost" ? "What the reposter wrote" : "The post's text"}
        value={post.caption}
        onChange={(caption) => edit(() => ({ caption }))}
        max={3000}
        rows={8}
        count
        placeholder="Paste it exactly as written: line breaks, emoji and hashtags are kept. Hashtags show in LinkedIn blue."
      />
      <Choice
        label="How much of the text shows"
        value={post.captionMode}
        onChange={(captionMode) => edit(() => ({ captionMode }))}
        options={[
          { value: "full", label: "The whole text", hint: "Every line, as written" },
          { value: "short", label: "The first lines", hint: `About ${SHORT_CAPTION.lines} lines, then “…see more”, like the feed` },
        ]}
      />
    </div>
  )
}

export function AuthorFields({ post, edit }: { post: Post; edit: EditPost }) {
  const a = post.author
  const setAuthor = (patch: Partial<Post["author"]>) => edit((p) => ({ author: { ...p.author, ...patch } }))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <PictureField label="Their photo" kind="photo" round value={a.photo} onChange={(photo) => setAuthor({ photo })} hint="Cut to a circle." />
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Banner</span>
          <div role="radiogroup" aria-label="Banner" className="flex gap-2">
            {(["color", "picture"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={a.banner.kind === kind}
                onClick={() => setAuthor({ banner: { ...a.banner, kind } })}
                className="rounded-control-sm border border-border px-3 py-1.5 text-caption font-semibold text-foreground aria-checked:border-brand aria-checked:bg-brand-soft"
              >
                {kind === "color" ? "A colour" : "Their real banner"}
              </button>
            ))}
          </div>
          {a.banner.kind === "color" ? (
            <div className="flex flex-wrap items-center gap-2 pt-1" role="radiogroup" aria-label="Banner colour">
              {BANNER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={a.banner.color.toLowerCase() === c.toLowerCase()}
                  aria-label={c}
                  onClick={() => setAuthor({ banner: { ...a.banner, color: c } })}
                  className="size-7 rounded-full ring-1 ring-border aria-checked:ring-2 aria-checked:ring-brand aria-checked:ring-offset-2 aria-checked:ring-offset-surface"
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <input type="color" value={a.banner.color} onChange={(e) => setAuthor({ banner: { ...a.banner, color: e.target.value } })} className="size-7 cursor-pointer rounded border border-border bg-transparent" />
                Any colour
              </label>
            </div>
          ) : (
            <PictureField label="Their banner" kind="banner" wide value={a.banner.picture} onChange={(picture) => setAuthor({ banner: { ...a.banner, picture } })} hint="From their LinkedIn profile; cut to 4:1." />
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" value={a.name} onChange={(name) => setAuthor({ name })} max={80} placeholder="Maya Rao" />
        <TextField label="Followers" value={a.followers} onChange={(followers) => setAuthor({ followers })} max={40} placeholder="18,402" hint="A number gets “followers” after it." />
      </div>
      <TextField label="Their headline (LinkedIn bio)" value={a.bio} onChange={(bio) => setAuthor({ bio })} max={220} placeholder="Growth lead · Helping B2B founders get seen on LinkedIn" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="When it was posted" value={a.time} onChange={(time) => setAuthor({ time })} max={30} placeholder="2d" />
        <div className="flex items-end pb-1.5">
          <Switch label="Show “+ Follow”" checked={a.follow} onChange={(follow) => setAuthor({ follow })} />
        </div>
      </div>
    </div>
  )
}

const percentOf = (s: string) => Math.min(100, Math.max(0, Number(s.replace(/[^\d.]/g, "")) || 0))

/** What each kind of post adds under its text. */
export function TypeFields({ post, edit }: { post: Post; edit: EditPost }) {
  switch (post.type) {
    case "text":
      return <p className="text-caption text-muted-foreground">Just the text: nothing else to add.</p>
    case "image":
      return <PictureField label="The post's image" kind="media" value={post.image} onChange={(image) => edit(() => ({ image }))} hint="Shown at full width. A very tall one keeps its top, cut at 3:2." />
    case "photos":
      return (
        <div className="flex flex-col gap-4">
          <PictureList
            label="Photos shown"
            kind="media"
            max={3}
            value={post.photos.items}
            onChange={(fn) => edit((p) => ({ photos: { ...p.photos, items: fn(p.photos.items) } }))}
            hint="2 sit side by side; 3 show as one big and two small, like LinkedIn."
          />
          <TextField
            label="How many photos the post has"
            value={post.photos.total ? String(post.photos.total) : ""}
            onChange={(v) => edit((p) => ({ photos: { ...p.photos, total: Math.min(99, Number(v.replace(/\D/g, "")) || 0) } }))}
            max={2}
            placeholder="6"
            hint="More than shown puts “+3” on the last photo."
          />
        </div>
      )
    case "slideshow":
      return (
        <div className="flex flex-col gap-4">
          <PictureList
            label="Slides, in order"
            kind="slide"
            max={20}
            value={post.slides.items}
            onChange={(fn) => edit((p) => ({ slides: { ...p.slides, items: fn(p.slides.items) } }))}
            hint={`They play one after another in the email (the first ${SLIDES_SHOWN}), each about 2.5 seconds, under 1 MB. Outlook on Windows shows slide 1 only. Have a PDF? Save its pages as images first.`}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Document title" value={post.slides.title} onChange={(title) => edit((p) => ({ slides: { ...p.slides, title } }))} max={120} placeholder="How to write hooks" />
            <TextField
              label="Pages in the document"
              value={post.slides.pages ? String(post.slides.pages) : ""}
              onChange={(v) => edit((p) => ({ slides: { ...p.slides, pages: Math.min(999, Number(v.replace(/\D/g, "")) || 0) } }))}
              max={3}
              placeholder={String(post.slides.items.length || 8)}
              hint="Shown as “1 / 8” on each slide."
            />
          </div>
        </div>
      )
    case "video":
      return (
        <div className="flex flex-col gap-4">
          <PictureField label="The video's cover" kind="media" value={post.video.cover} onChange={(cover) => edit((p) => ({ video: { ...p.video, cover } }))} hint="A screenshot of the video works. A play button goes on it; tapping plays it on LinkedIn (no email app can play it)." />
          <TextField label="Length" value={post.video.duration} onChange={(duration) => edit((p) => ({ video: { ...p.video, duration } }))} max={10} placeholder="1:42" />
        </div>
      )
    case "gif":
      return <PictureField label="The GIF" kind="gif" value={post.gif} onChange={(gif) => edit(() => ({ gif }))} hint="It keeps moving, shrunk to the email's width. Outlook on Windows shows its first frame." />
    case "poll": {
      const options = post.poll.options
      const setOptions = (fn: (o: Post["poll"]["options"]) => Post["poll"]["options"]) => edit((p) => ({ poll: { ...p.poll, options: fn(p.poll.options) } }))
      return (
        <div className="flex flex-col gap-4">
          <TextField label="Question" value={post.poll.question} onChange={(question) => edit((p) => ({ poll: { ...p.poll, question } }))} max={200} placeholder="How often do you comment on other people's posts?" />
          <div className="flex flex-col gap-2">
            <span className={labelCls}>Options (2 to 4)</span>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  aria-label={`Option ${i + 1}`}
                  value={o.label}
                  maxLength={80}
                  onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder={`Option ${i + 1}`}
                  className="h-9 min-w-0 flex-1 rounded-control border border-control-border bg-surface px-3 text-label text-foreground"
                />
                {post.poll.showResults && (
                  <input
                    aria-label={`Option ${i + 1} percent`}
                    inputMode="numeric"
                    value={o.percent ? String(o.percent) : ""}
                    onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? { ...x, percent: percentOf(e.target.value) } : x)))}
                    placeholder="%"
                    className="h-9 w-16 rounded-control border border-control-border bg-surface px-2 text-right text-label tabular-nums text-foreground"
                  />
                )}
                <button type="button" onClick={() => setOptions((list) => list.filter((_, j) => j !== i))} className="rounded px-2 py-1 text-caption text-muted-foreground hover:text-danger">
                  Remove
                </button>
              </div>
            ))}
            {options.length < 4 && (
              <button type="button" onClick={() => setOptions((list) => [...list, { label: "", percent: 0 }])} className="w-fit text-caption font-semibold text-brand hover:underline">
                + Add an option
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Votes" value={post.poll.votes} onChange={(votes) => edit((p) => ({ poll: { ...p.poll, votes } }))} max={30} placeholder="1,284" />
            <TextField label="Time left" value={post.poll.timeLeft} onChange={(timeLeft) => edit((p) => ({ poll: { ...p.poll, timeLeft } }))} max={40} placeholder="3 days left" />
          </div>
          <Switch label="Show the results so far" hint="Off: the options show as buttons, to make people curious." checked={post.poll.showResults} onChange={(showResults) => edit((p) => ({ poll: { ...p.poll, showResults } }))} />
        </div>
      )
    }
    case "article":
      return (
        <div className="flex flex-col gap-4">
          <PictureField label="Cover" kind="media" value={post.article.cover} onChange={(cover) => edit((p) => ({ article: { ...p.article, cover } }))} />
          <TextField label="Title" value={post.article.title} onChange={(title) => edit((p) => ({ article: { ...p.article, title } }))} max={200} placeholder="The Deep Work Issue: how to protect your best hours" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Newsletter or source" value={post.article.source} onChange={(source) => edit((p) => ({ article: { ...p.article, source } }))} max={100} placeholder="Studio Notes" />
            <TextField label="Reading time" value={post.article.readTime} onChange={(readTime) => edit((p) => ({ article: { ...p.article, readTime } }))} max={30} placeholder="6 min read" />
          </div>
          <TextArea label="First line (optional)" value={post.article.blurb} onChange={(blurb) => edit((p) => ({ article: { ...p.article, blurb } }))} max={400} rows={2} />
        </div>
      )
    case "link":
      return (
        <div className="flex flex-col gap-4">
          <PictureField label="The link's picture" kind="media" value={post.link.picture} onChange={(picture) => edit((p) => ({ link: { ...p.link, picture } }))} />
          <TextField label="The link's title" value={post.link.title} onChange={(title) => edit((p) => ({ link: { ...p.link, title } }))} max={200} placeholder="What drives profile visits on LinkedIn" />
          <TextField label="Website" value={post.link.domain} onChange={(domain) => edit((p) => ({ link: { ...p.link, domain } }))} max={100} placeholder="example.com" hint="Shown as text. A click opens the post on LinkedIn, where the link is." />
        </div>
      )
    case "repost":
      return (
        <div className="flex flex-col gap-4">
          <p className="text-caption text-muted-foreground">The original post, shown in a smaller card inside.</p>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <PictureField label="Original author's photo" kind="small" round value={post.repost.author.photo} onChange={(photo) => edit((p) => ({ repost: { ...p.repost, author: { ...p.repost.author, photo } } }))} />
            <div className="flex flex-col gap-4">
              <TextField label="Original author" value={post.repost.author.name} onChange={(name) => edit((p) => ({ repost: { ...p.repost, author: { ...p.repost.author, name } } }))} max={80} />
              <TextField label="Their headline" value={post.repost.author.bio} onChange={(bio) => edit((p) => ({ repost: { ...p.repost, author: { ...p.repost.author, bio } } }))} max={220} />
            </div>
          </div>
          <TextField label="When the original was posted" value={post.repost.time} onChange={(time) => edit((p) => ({ repost: { ...p.repost, time } }))} max={30} placeholder="1w" />
          <TextArea label="The original post's text" value={post.repost.text} onChange={(text) => edit((p) => ({ repost: { ...p.repost, text } }))} max={3000} rows={5} hint="Shown whole or cut, like the main text." />
          <PictureField label="The original post's picture (optional)" kind="media" value={post.repost.picture} onChange={(picture) => edit((p) => ({ repost: { ...p.repost, picture } }))} />
        </div>
      )
    case "event":
      return (
        <div className="flex flex-col gap-4">
          <PictureField label="Cover (optional)" kind="media" value={post.event.cover} onChange={(cover) => edit((p) => ({ event: { ...p.event, cover } }))} />
          <TextField label="Event name" value={post.event.title} onChange={(title) => edit((p) => ({ event: { ...p.event, title } }))} max={200} placeholder="Comment your way to clients" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Date" type="date" value={post.event.date} onChange={(date) => edit((p) => ({ event: { ...p.event, date } }))} max={10} />
            <TextField label="Day and time" value={post.event.when} onChange={(when) => edit((p) => ({ event: { ...p.event, when } }))} max={80} placeholder="Thu, 6:00 PM IST" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Where" value={post.event.place} onChange={(place) => edit((p) => ({ event: { ...p.event, place } }))} max={100} placeholder="Online" />
            <TextField label="Attendees" value={post.event.attendees} onChange={(attendees) => edit((p) => ({ event: { ...p.event, attendees } }))} max={40} placeholder="1,240" />
          </div>
        </div>
      )
  }
}

export function NumbersFields({ post, edit }: { post: Post; edit: EditPost }) {
  const set = (patch: Partial<Post["counts"]>) => edit((p) => ({ counts: { ...p.counts, ...patch } }))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Reactions" value={post.counts.reactions} onChange={(reactions) => set({ reactions })} max={20} placeholder="2,318" />
        <TextField label="Comments" value={post.counts.comments} onChange={(comments) => set({ comments })} max={20} placeholder="412" />
        <TextField label="Reposts" value={post.counts.reposts} onChange={(reposts) => set({ reposts })} max={20} placeholder="96" />
      </div>
      <TextField
        label="Numbers copied on"
        type="date"
        value={post.asOf}
        onChange={(asOf) => edit(() => ({ asOf }))}
        max={10}
        hint="The card says “numbers as of” this day, since they keep changing on LinkedIn."
      />
    </div>
  )
}

export function TopCommentFields({ post, edit }: { post: Post; edit: EditPost }) {
  const t = post.topComment
  const set = (patch: Partial<Post["topComment"]>) => edit((p) => ({ topComment: { ...p.topComment, ...patch } }))
  return (
    <div className="flex flex-col gap-4">
      <Switch label="Show a top comment" hint="One comment under the post, as social proof." checked={t.show} onChange={(show) => set({ show })} />
      {t.show && (
        <>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <PictureField label="Their photo" kind="small" round value={t.photo} onChange={(photo) => set({ photo })} />
            <div className="flex flex-col gap-4">
              <TextField label="Name" value={t.name} onChange={(name) => set({ name })} max={80} />
              <TextField label="Their headline (optional)" value={t.bio} onChange={(bio) => set({ bio })} max={160} />
            </div>
          </div>
          <TextArea label="The comment" value={t.text} onChange={(text) => set({ text })} max={1250} rows={3} />
          <TextField label="Likes on the comment (optional)" value={t.likes} onChange={(likes) => set({ likes })} max={20} placeholder="24" />
        </>
      )}
    </div>
  )
}
