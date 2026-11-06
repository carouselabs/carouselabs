// "Share a LinkedIn post" emails (lib/postEmail.ts): what's checked before one
// can go out, the card for every kind of post, the whole or cut text, words
// from the post never taken for merge fields, the pictures made on the
// server only while they still match, what a campaign keeps; the AI's
// screenshot reading and writing (lib/ai/postEmailAi.ts, the model faked);
// filling the form from a screenshot; and starring one as a template.
import { beforeEach, describe, expect, it, vi } from "vitest"

const anthropic = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: anthropic.create }
  },
}))
const db = vi.hoisted(() => ({
  emailCampaign: { findUnique: vi.fn() },
  emailTemplate: { create: vi.fn(), findUnique: vi.fn() },
}))
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/auditLog", () => ({ logAdminAction: vi.fn() }))

import {
  CARD_WIDTH,
  POST_TYPES,
  currentBuilt,
  dayLabel,
  fixedHtmlOf,
  followersLine,
  initials,
  isLinkedInUrl,
  newPostEmail,
  pictureKeys,
  postAsReady,
  postCardHtml,
  postDesignOf,
  postEmailHtml,
  postEmailProblems,
  postEmailSchema,
  postEmailText,
  postPictureUrls,
  postSnapshot,
  shortCaption,
  viewLabel,
  type PostEmail,
  type PostType,
} from "@/lib/postEmail"
import { readyDesignOf, readySnapshot, READY_EMAILS } from "@/lib/readyEmails"
import { applyVariables } from "@/lib/broadcastRender"
import { __test, normalizeRead, readPostScreenshot, writePostEmailWords, PostEmailAiError } from "@/lib/ai/postEmailAi"
import { applyScreenshot, screenshotNotes } from "@/components/admin/postEmail/applyScreenshot"
import { emailContent, saveTemplate } from "@/lib/sentEmails"

const R2 = "https://media.test/email-post/up"
const pic = (name: string, width = 1116, height = 1116) => ({ url: `${R2}/${name}.jpg`, width, height })
const POST_URL = "https://www.linkedin.com/feed/update/urn:li:activity:7390000000000000000/"
const LONG = `I stopped posting for 30 days. I only commented.

Here's what happened.

For two years I posted 4 times a week. Some posts did well. Most didn't.
Every week felt like shouting into a room that was already loud.

#LinkedInTips #Growth`

function email(type: PostType = "text"): PostEmail {
  const e = newPostEmail("2026-11-06")
  e.subject = "The 10-minute habit"
  e.preview = "Maya's post on daily commenting"
  e.intro = "I came across this post.\n\nIt's the clearest case I've seen."
  e.post = {
    ...e.post,
    type,
    url: POST_URL,
    author: { ...e.post.author, name: "Maya Rao", bio: "Growth lead · B2B", followers: "18,402", time: "2d", photo: pic("maya", 400, 400) },
    caption: LONG,
    counts: { reactions: "2,318", comments: "412", reposts: "96" },
  }
  return e
}

describe("what's needed before it can go out", () => {
  it("a new email lists what's missing, in order", () => {
    expect(postEmailProblems(newPostEmail("2026-11-06"))).toEqual([
      "Write a subject",
      "Add the post's link",
      "Add the author's name",
      "Upload the author's photo",
      "Add the post's text",
    ])
    expect(postEmailProblems(email())).toEqual([])
  })

  it("each kind of post needs its own parts", () => {
    const need = (type: PostType) => postEmailProblems({ ...email(type), post: { ...email(type).post, caption: "" } })
    expect(need("image")).toEqual(["Upload the post's image"])
    expect(need("photos")).toEqual(["Upload at least 2 photos"])
    expect(need("slideshow")).toEqual(["Upload at least 2 slides"])
    expect(need("video")).toEqual(["Upload the video's cover"])
    expect(need("gif")).toEqual(["Upload the GIF"])
    expect(need("poll")).toEqual(["Add the poll's question"])
    expect(need("article")).toEqual(["Add the article's title"])
    expect(need("link")).toEqual(["Add the link's title and website"])
    expect(need("repost")).toEqual(["Add the original post's author"])
    expect(need("event")).toEqual(["Add the event's name"])
    // A text post with no text can't go; the others can go without text.
    expect(need("text")).toEqual(["Add the post's text"])
  })

  it("a top comment or a button that's on needs its words; a picture banner needs its picture", () => {
    const e = email()
    e.post.topComment.show = true
    e.button = { show: true, label: "", url: "" }
    e.post.author.banner = { kind: "picture", color: "#A0C4E8", picture: null }
    expect(postEmailProblems(e)).toEqual([
      "Upload the banner, or use a colour",
      "Add the top comment's name and words, or turn it off",
      "Give the button its words and link, or turn it off",
    ])
  })

  it("the post's link must be LinkedIn; the button only goes where emails may link; merge fields must exist", () => {
    expect(isLinkedInUrl(POST_URL)).toBe(true)
    expect(isLinkedInUrl("https://linkedin.com/posts/x")).toBe(true)
    for (const bad of ["http://www.linkedin.com/x", "https://evil.com/linkedin.com", "https://linkedin.com.evil.com/x", "javascript:alert(1)"]) expect(isLinkedInUrl(bad)).toBe(false)
    const bad = (patch: Partial<PostEmail>) => postEmailSchema.safeParse({ ...email(), ...patch }).success
    expect(bad({})).toBe(true)
    expect(bad({ post: { ...email().post, url: "https://example.com/post" } })).toBe(false)
    expect(bad({ button: { show: true, label: "Go", url: "https://evil.example" } })).toBe(false)
    expect(bad({ button: { show: true, label: "Go", url: "https://carouselabs.com/#extension" } })).toBe(true)
    expect(bad({ intro: "Hi {{company}}" })).toBe(true) // a lead's column: checked when sent
    expect(bad({ intro: "Hi {{first name}}" })).toBe(true)
    expect(bad({ intro: "Hi {{1x}}" })).toBe(false)
    expect(bad({ fromName: "Evil <x@y.z>" })).toBe(false)
    expect(bad({ fromName: "Anant from CarouseLabs" })).toBe(true)
  })
})

describe("the card", () => {
  it("shows the whole text by default, line breaks kept and hashtags blue", () => {
    const html = postCardHtml(email())
    expect(html).toContain("I stopped posting for 30 days. I only commented.<br><br>Here's what happened.")
    expect(html).toContain("Every week felt like shouting into a room that was already loud.")
    expect(html).toMatch(/<span style="color:#0A66C2;font-weight:600">#LinkedInTips<\/span>/)
    expect(html).not.toContain("see more")
  })

  it("or its first 3 lines and “…see more”, like the feed", () => {
    const e = email()
    e.post.captionMode = "short"
    const html = postCardHtml(e)
    expect(html).toContain("I stopped posting for 30 days. I only commented.<br><br>Here's what happened")
    expect(html).toContain("&hellip;see more")
    expect(html).not.toContain("For two years")
    expect(shortCaption("One line only")).toEqual({ text: "One line only", cut: false })
    const words = "word ".repeat(80).trim()
    const cut = shortCaption(words)
    expect(cut.cut).toBe(true)
    expect(cut.text.length).toBeLessThanOrEqual(210)
    expect(cut.text.endsWith("word")).toBe(true)
  })

  it("everything opens the post", () => {
    const html = postCardHtml({ ...email("image"), post: { ...email("image").post, image: pic("post") } })
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
    // banner, name, text, picture, likes, the button
    expect(hrefs.length).toBe(6)
    expect(new Set(hrefs)).toEqual(new Set([POST_URL]))
  })

  it("words from the post are escaped, and never taken for merge fields", () => {
    const e = email()
    e.post.author.name = 'Maya <script>alert("x")</script>'
    e.post.caption = "Use {{firstName}} in your DMs & see"
    const html = postEmailHtml(e)
    expect(html).not.toContain("<script>")
    expect(html).toContain("Maya &lt;script&gt;")
    // Filled in for a person, the greeting changes and the post's braces don't.
    const filled = applyVariables(html, { firstName: "Asha" })
    expect(filled).toContain("Hi Asha,")
    expect(filled).toContain("Use &#123;&#123;firstName&#125;&#125; in your DMs &amp; see")
  })

  it("names, followers and dates read the way LinkedIn writes them", () => {
    expect(followersLine("18,402")).toBe("18,402 followers")
    expect(followersLine("12.5K")).toBe("12.5K followers")
    expect(followersLine("500+ connections")).toBe("500+ connections")
    expect(dayLabel("2026-11-06")).toBe("6 Nov 2026")
    expect(initials("Maya Rao")).toBe("MR")
    expect(initials("  ")).toBe("?")
    expect(postCardHtml(email())).toContain("18,402 followers &middot; 2d")
    expect(postCardHtml(email())).toContain("numbers as of 6 Nov 2026")
  })

  it("every kind of post has its button under it, and its own words can replace it", () => {
    const labels = Object.fromEntries(POST_TYPES.map((t) => [t.id, viewLabel(email(t.id))]))
    expect(labels).toMatchObject({ text: "View the post on LinkedIn", video: "Watch the video on LinkedIn", poll: "Vote on LinkedIn", article: "Read the article on LinkedIn", event: "See the event on LinkedIn" })
    const slides = email("slideshow")
    slides.post.slides.pages = 8
    expect(viewLabel(slides)).toBe("See all 8 slides on LinkedIn")
    slides.post.viewLabel = "Swipe through it"
    expect(postCardHtml(slides)).toContain("Swipe through it &rarr;")
  })

  it("draws each kind: poll results or buttons, article, link, repost, event, top comment", () => {
    const poll = email("poll")
    poll.post.poll = { question: "How often do you comment?", options: [{ label: "Every day", percent: 41 }, { label: "Never", percent: 9 }], votes: "1,284", timeLeft: "3 days left", showResults: true }
    expect(postCardHtml(poll)).toContain("41%")
    expect(postCardHtml(poll)).toContain("1,284 votes &middot; 3 days left")
    poll.post.poll.showResults = false
    expect(postCardHtml(poll)).not.toContain("41%")

    const article = email("article")
    article.post.article = { cover: pic("cover"), title: "The Deep Work Issue", source: "Studio Notes", readTime: "6 min read", blurb: "" }
    expect(postCardHtml(article)).toContain("Studio Notes &middot; 6 min read")

    const repost = email("repost")
    repost.post.repost = { author: { name: "Lena Fischer", bio: "Head of Content", photo: null }, time: "1w", text: "Comments beat posts.", picture: null }
    const r = postCardHtml(repost)
    expect(r).toContain("Lena Fischer")
    expect(r).toContain(">LF<") // her initials, with no photo
    expect(r).toContain("Comments beat posts.")

    const event = email("event")
    event.post.event = { cover: null, title: "Live session", date: "2026-11-14", when: "Thu, 6:00 PM IST", place: "Online", attendees: "1,240" }
    expect(postCardHtml(event)).toMatch(/NOV<\/td>[\s\S]*>14<\/td>/)
    expect(postCardHtml(event)).toContain("1,240 attendees")

    const commented = email()
    commented.post.topComment = { show: true, name: "Arjun Mehta", bio: "", photo: null, text: "Same here.", likes: "24" }
    expect(postCardHtml(commented)).toContain("Top comment")
    expect(postCardHtml(commented)).toContain("24 likes")
    commented.post.topComment.show = false
    expect(postCardHtml(commented)).not.toContain("Top comment")
  })

  it("the preview shows gray hints where something is missing; the real email never does", () => {
    const e = newPostEmail("2026-11-06")
    e.post.type = "image"
    expect(postCardHtml(e, { preview: true })).toContain("Author's name")
    expect(postCardHtml(e, { preview: true })).toContain("The post's image")
    expect(postCardHtml(e)).not.toContain("Author's name")
  })
})

describe("pictures made on the server", () => {
  it("each is needed only by the posts that use it, and shown only while it still matches", () => {
    const e = email()
    expect(Object.entries(pictureKeys(e)).filter(([, k]) => k).map(([kind]) => kind)).toEqual(["header"])
    const photos = email("photos")
    photos.post.photos = { items: [pic("a"), pic("b")], total: 5 }
    expect(pictureKeys(photos).grid).toBe(JSON.stringify(["grid", 1, [`${R2}/a.jpg`, `${R2}/b.jpg`], 3]))
    expect(pictureKeys(email("photos")).grid).toBeNull()
    const key = pictureKeys(e).header!
    e.built.header = { url: "https://media.test/email-post/built/header-x-1116x236.jpg", width: 1116, height: 236, key }
    expect(currentBuilt(e, "header")).toBeTruthy()
    expect(postEmailHtml(e)).toContain("header-x-1116x236.jpg")
    // A new banner colour: the made picture no longer counts, the stand-in shows.
    e.post.author.banner.color = "#211F1C"
    expect(currentBuilt(e, "header")).toBeNull()
    expect(postEmailHtml(e)).not.toContain("header-x-1116x236.jpg")
    expect(postEmailHtml(e)).toContain("background-color:#211F1C")
  })

  it("every picture the email points at is listed, so each can be checked", () => {
    const e = email("photos")
    e.post.photos.items = [pic("a"), pic("b")]
    e.post.topComment.photo = pic("c", 160, 160)
    expect(postPictureUrls(e)).toEqual([`${R2}/maya.jpg`, `${R2}/a.jpg`, `${R2}/b.jpg`, `${R2}/c.jpg`])
  })

  it("pictures sit at the card's width, sized for Outlook", () => {
    const e = email("image")
    e.post.image = pic("tall", 1116, 1674)
    expect(postCardHtml(e)).toContain(`width="${CARD_WIDTH}" height="${Math.round(CARD_WIDTH * 1.5)}"`)
  })
})

describe("the whole email and what a campaign keeps", () => {
  it("is a CarouseLabs email: greeting, words, card, button, sign-off, footer", () => {
    const e = email()
    e.outro = "Try 5 comments a day this week."
    e.button = { show: true, label: "Try CarouseLabs Engage", url: "https://carouselabs.com/#extension" }
    const html = postEmailHtml(e)
    const order = ["Hi {{firstName}},", "I came across this post.", "It's the clearest case", "Maya Rao", "Try 5 comments a day", "Try CarouseLabs Engage", "See you in the comments,", "The CarouseLabs Team", "&copy; "]
    let at = 0
    for (const part of order) {
      const i = html.indexOf(part, at)
      expect(i, part).toBeGreaterThan(-1)
      at = i
    }
    expect(html).toContain("<title>The 10-minute habit</title>")
    expect(html).toContain("Maya's post on daily commenting")
    expect(Buffer.byteLength(html)).toBeLessThan(60_000)
  })

  it("its plain text has the words, the post and its link", () => {
    const text = postEmailText(email())
    expect(text).toContain("Hi {{firstName}},")
    expect(text).toContain("Maya Rao · Growth lead · B2B")
    expect(text).toContain("#LinkedInTips #Growth")
    expect(text).toContain(`View the post on LinkedIn: ${POST_URL}`)
  })

  it("a campaign keeps the email as data and as HTML, and sends it like a ready-made one", () => {
    const e = postEmailSchema.parse(email())
    const design = postSnapshot(e)
    expect(design).toMatchObject({ kind: "post", subject: "The 10-minute habit", fromName: "CarouseLabs", html: postEmailHtml(e) })
    expect(postDesignOf(JSON.parse(JSON.stringify(design)))).toEqual(design)
    expect(postAsReady(design)).toEqual({ kind: "ready", id: "post", subject: "The 10-minute habit", fromName: "CarouseLabs", html: design.html })
    expect(fixedHtmlOf(design)).toEqual(postAsReady(design))
    const ready = readySnapshot(READY_EMAILS[0])
    expect(fixedHtmlOf(ready)).toEqual(readyDesignOf(ready))
    expect(fixedHtmlOf({ version: 1, subject: "An AI email" })).toBeNull()
    expect(postDesignOf({ kind: "post", subject: "x" })).toBeNull()
  })
})

describe("the AI", () => {
  beforeEach(() => anthropic.create.mockReset())
  const answer = (text: string) => ({ content: [{ type: "text", text }], stop_reason: "end_turn" })

  it("reads a screenshot word for word, cutting each field to size and keeping only real boxes", async () => {
    anthropic.create.mockResolvedValueOnce(
      answer(
        "```json\n" +
          JSON.stringify({
            type: "poll",
            author: { name: "Arjun Mehta", bio: "Sales coach", followers: "6,115", time: "3d" },
            caption: "How often do you comment?\n\nBe honest 👇",
            captionCut: false,
            counts: { reactions: "312", comments: "97", reposts: "8" },
            poll: { question: "How often?", options: [{ label: "Every day", percent: "41%" }, { label: "", percent: 3 }, { label: "Never", percent: 9 }], votes: "1,284", timeLeft: "3 days left" },
            event: { date: "Nov 14" },
            topComment: { name: "Maya Rao", text: "Every day!", likes: "24" },
            boxes: { authorPhoto: [0.02, 0.03, 0.09, 0.08], media: [0.5, 0.5, 0.5, 0.9], commentPhoto: "nope", repostPhoto: null },
          }) +
          "\n```",
      ),
    )
    const read = await readPostScreenshot({ base64: "aGk=", mediaType: "image/jpeg" })
    const sent = anthropic.create.mock.calls[0][0]
    expect(sent.model).toBe("claude-opus-5-5")
    expect(sent.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "aGk=" } })
    expect(read).toMatchObject({
      type: "poll",
      author: { name: "Arjun Mehta", followers: "6,115" },
      caption: "How often do you comment?\n\nBe honest 👇",
      poll: { options: [{ label: "Every day", percent: 41 }, { label: "Never", percent: 9 }], votes: "1,284" },
      event: { date: "" },
      topComment: { name: "Maya Rao", text: "Every day!", likes: "24" },
      boxes: { authorPhoto: [0.02, 0.03, 0.09, 0.08], media: null, commentPhoto: null, repostPhoto: null },
    })
    anthropic.create.mockResolvedValueOnce(answer("Sorry, I can't see a post."))
    await expect(readPostScreenshot({ base64: "aGk=", mediaType: "image/jpeg" })).rejects.toBeInstanceOf(PostEmailAiError)
    expect(normalizeRead({ type: "tiktok" }).type).toBe("text")
  })

  it("writes the words, and sends back answers with stock phrases, other merge fields or links elsewhere", async () => {
    const good = { subject: "Comment first", preview: "Maya's 30 days", greeting: "Hi {{firstName}},", intro: "Maya tried something.", outro: "", button: { show: true, label: "Try Engage", url: "https://carouselabs.com/#extension" }, signoff: "See you there," }
    anthropic.create
      .mockResolvedValueOnce(answer(JSON.stringify({ ...good, intro: "This is a game-changer — truly." })))
      .mockResolvedValueOnce(answer(JSON.stringify({ ...good, intro: "Hi {{company}}" })))
      .mockResolvedValueOnce(answer(JSON.stringify({ ...good, button: { show: true, label: "Go", url: "https://evil.example" } })))
    await expect(writePostEmailWords({ email: email(), goal: "promote Engage" })).rejects.toBeInstanceOf(PostEmailAiError)
    expect(anthropic.create).toHaveBeenCalledTimes(3)
    // Each answer was sent back with what was wrong with it.
    const told = (anthropic.create.mock.calls[2][0].messages as { role: string; content: string }[]).filter((m) => m.role === "user").slice(1).map((m) => m.content)
    expect(told[0]).toContain("no em dashes")
    expect(told[1]).toContain("merge field")
    expect(told[2]).toContain("button's url must be one of")

    anthropic.create.mockReset()
    anthropic.create.mockResolvedValueOnce(answer(JSON.stringify(good)))
    expect(await writePostEmailWords({ email: email(), goal: "promote Engage" })).toEqual(good)
    const prompt = anthropic.create.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain("Author: Maya Rao, Growth lead · B2B, 18,402 followers")
    expect(prompt).toContain("What this email is for: promote Engage")
    expect(prompt).not.toContain("media.test")
  })

  it("a button that's off still keeps sensible words and a link we allow", () => {
    const { words } = __test.checkWords({ subject: "S", intro: "I", button: { show: false, label: "", url: "https://evil.example" } })
    expect(words?.button).toEqual({ show: false, label: "Try CarouseLabs Engage", url: "https://carouselabs.com/#extension" })
    // Shown, it may only point at our own pages, not anywhere emails may link (LinkedIn, X).
    const elsewhere = __test.checkWords({ subject: "S", intro: "I", button: { show: true, label: "Follow her", url: "https://x.com/someone" } })
    expect(elsewhere.words).toBeNull()
    expect(elsewhere.problem).toContain("must be one of")
  })
})

describe("filling the form from a screenshot", () => {
  it("fills what it found, keeps the rest, and puts each cut-out picture where its kind of post shows it", () => {
    const before = email()
    before.post.author.banner = { kind: "color", color: "#211F1C", picture: null }
    before.subject = "Mine"
    const read = normalizeRead({
      type: "image",
      author: { name: "Daniel Okafor", bio: "", followers: "", time: "5d" },
      caption: "Every founder made 3 of these.",
      captionCut: true,
      counts: { reactions: "1,204" },
      topComment: { name: "Lena", text: "Number 2!" },
    })
    const after = applyScreenshot(before, read, { authorPhoto: pic("daniel", 400, 400), media: pic("post"), commentPhoto: null, repostPhoto: null })
    expect(after.subject).toBe("Mine")
    expect(after.post.url).toBe(POST_URL)
    expect(after.post.author).toMatchObject({ name: "Daniel Okafor", bio: "Growth lead · B2B", time: "5d", photo: pic("daniel", 400, 400), banner: { color: "#211F1C" } })
    expect(after.post.image).toEqual(pic("post"))
    expect(after.post.counts).toEqual({ reactions: "1,204", comments: "412", reposts: "96" })
    expect(after.post.topComment).toMatchObject({ show: true, name: "Lena", text: "Number 2!" })
    const notes = screenshotNotes(read, { authorPhoto: pic("daniel"), media: null, commentPhoto: null, repostPhoto: null })
    expect(notes.join(" ")).toContain("cuts the post's text at “…more”")
  })
})

describe("used again and starred", () => {
  it("a shared-post campaign comes back as the post, and can be starred as a template", async () => {
    const design = postSnapshot(postEmailSchema.parse(email()))
    db.emailCampaign.findUnique.mockResolvedValue({ subject: design.subject, body: "plain", design })
    const content = await emailContent({ kind: "campaign", id: "c1" })
    expect(content).toMatchObject({ subject: "The 10-minute habit", body: "plain", design: null, mentionsName: null })
    expect(content?.post?.post.author.name).toBe("Maya Rao")
    db.emailTemplate.create.mockResolvedValue({ id: "t1", name: "Daily commenting" })
    await saveTemplate({ source: { kind: "campaign", id: "c1" }, name: "Daily commenting", adminEmail: "admin@carouselabs.com" })
    expect(db.emailTemplate.create.mock.calls[0][0].data.design).toEqual(design)
  })
})
