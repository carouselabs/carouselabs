// CarouseLabs Engage for Reddit's comment request (lib/redditComment.ts) and
// prompt (lib/ai/prompts/redditCommentPrompt.ts): what a page may send, what
// the model is told, and the Reddit-only tells a comment is written again for.
import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"
import { parseRedditCommentBody, redditUrl, subredditName } from "@/lib/redditComment"
import {
  REDDIT_AI_TELLS,
  buildRedditCommentSystemMessage,
  buildRedditCommentUserMessage,
  redditNumberSources,
  type RedditCommentInput,
} from "@/lib/ai/prompts/redditCommentPrompt"

const require = createRequire(import.meta.url)
const { REDDIT_PRESETS } = require("../scripts/reddit-profile-presets.js") as {
  REDDIT_PRESETS: { samples: string[]; length: string; name: string; whoIAm: string; goal: string; tone: string; emoji: string }[]
}

const POST_URL = "https://www.reddit.com/r/startups/comments/1xd9i4c/how_do_you_price/"
const COMMENT_URL = "https://www.reddit.com/r/startups/comments/1xd9i4c/comment/19rizzje7kv6r/"

const body = (extra: Record<string, unknown> = {}) => ({
  profileId: "sys-reddit-helpful",
  subreddit: "r/startups",
  rules: [{ title: "No self-promotion", text: "Don't post links to your own product." }],
  post: { title: "How do you price a first product?", author: "founder_jane", text: "We have ten users.", url: POST_URL, flair: "Question", kind: "text" },
  others: [{ author: "someone_else", text: "Charge more than you think.", url: COMMENT_URL }],
  isOwnPost: false,
  ...extra,
})

describe("what a Reddit page may send", () => {
  it("keeps a comment on a post, with its rules and the comments already there", () => {
    const parsed = parseRedditCommentBody(body())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.input.subreddit).toBe("r/startups")
    expect(parsed.input.replyTo).toBeNull()
    expect(parsed.input.post).toMatchObject({ title: "How do you price a first product?", author: "founder_jane", url: POST_URL, kind: "text" })
    expect(parsed.input.rules).toEqual([{ title: "No self-promotion", text: "Don't post links to your own product." }])
    expect(parsed.input.others).toHaveLength(1)
    expect(parsed.input.chain).toEqual([])
  })

  it("keeps a reply's thread, nearest comments first kept, and drops the post's other comments", () => {
    const chain = Array.from({ length: 12 }, (_, i) => ({ author: `user_${i}`, text: `comment ${i}`, url: "" }))
    const parsed = parseRedditCommentBody(body({ replyTo: { author: "asker", text: "What did you charge?", url: COMMENT_URL }, chain }))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.input.replyTo).toEqual({ author: "asker", text: "What did you charge?", url: COMMENT_URL })
    expect(parsed.input.chain.map((c) => c.text)).toEqual(chain.slice(-8).map((c) => c.text))
    expect(parsed.input.others).toEqual([])
  })

  it("refuses a request with no post, no subreddit or an empty reply target", () => {
    expect(parseRedditCommentBody(body({ post: { title: "" } })).ok).toBe(false)
    expect(parseRedditCommentBody(body({ subreddit: "not a subreddit!" })).ok).toBe(false)
    expect(parseRedditCommentBody(body({ replyTo: { author: "x_user", text: "  " } })).ok).toBe(false)
    expect(parseRedditCommentBody({ ...body(), profileId: "" }).ok).toBe(false)
    expect(parseRedditCommentBody(null).ok).toBe(false)
  })

  it("caps what a page can send", () => {
    const parsed = parseRedditCommentBody(
      body({
        post: { title: "t".repeat(400), text: "p".repeat(9000), author: "a_user", url: POST_URL, kind: "something-else" },
        rules: Array.from({ length: 30 }, (_, i) => ({ title: `Rule ${i}`, text: "r".repeat(900) })),
        others: Array.from({ length: 9 }, () => ({ author: "b_user", text: "o".repeat(900) })),
      }),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.input.post.title).toHaveLength(300)
    expect(parsed.input.post.text).toHaveLength(6000)
    expect(parsed.input.post.kind).toBe("text")
    expect(parsed.input.rules).toHaveLength(15)
    expect(parsed.input.rules[0].text).toHaveLength(500)
    expect(parsed.input.others).toHaveLength(5)
    expect(parsed.input.others[0].text).toHaveLength(600)
  })

  it("only links real reddit.com posts and comments, and only real names", () => {
    expect(redditUrl(POST_URL)).toBe(POST_URL)
    expect(redditUrl(COMMENT_URL)).toBe(COMMENT_URL)
    expect(redditUrl("/r/startups/comments/1xd9i4c/comment/19rizzje7kv6r/")).toBe(COMMENT_URL)
    expect(redditUrl("https://www.reddit.com/r/startups/comments/1xd9i4c/slug/abc123/")).toBe(
      "https://www.reddit.com/r/startups/comments/1xd9i4c/slug/abc123/",
    )
    for (const bad of [
      "https://old.reddit.com/r/startups/comments/1xd9i4c/x/",
      "https://evil.example/r/startups/comments/1xd9i4c/",
      "http://www.reddit.com/r/startups/comments/1xd9i4c/",
      "https://www.reddit.com/r/startups/",
      "javascript:alert(1)",
      42,
    ]) {
      expect(redditUrl(bad), String(bad)).toBe("")
    }
    expect(subredditName("startups")).toBe("r/startups")
    expect(subredditName("/r/AskReddit")).toBe("r/AskReddit")
    expect(subredditName("r/a")).toBe("")
    const parsed = parseRedditCommentBody(body({ post: { title: "t", author: "u/<script>", url: POST_URL } }))
    expect(parsed.ok && parsed.input.post.author).toBe("")
  })
})

const input = (extra: Partial<RedditCommentInput> = {}): RedditCommentInput => {
  const parsed = parseRedditCommentBody(body())
  if (!parsed.ok) throw new Error("fixture")
  return { ...parsed.input, ...extra }
}
const profile = REDDIT_PRESETS[0]

describe("what the model is told", () => {
  it("writes for Reddit, within the limit, in Reddit's register", () => {
    const system = buildRedditCommentSystemMessage({ ...profile, alwaysDo: null, neverDo: null, samples: [], language: "English" }, 500, input())
    expect(system).toMatch(/^You write Reddit comments for this person:/)
    expect(system).not.toContain("LinkedIn comments for this person")
    expect(system).toContain("at most 500 characters")
    expect(system).toContain("Reddit uses Markdown")
    expect(system).toContain("follow every one")
    expect(system).toContain("commenting on someone else's post")
  })

  it("speaks as OP on their own post, and answers the comment on a reply", () => {
    const p = { ...profile, alwaysDo: null, neverDo: null, samples: [], language: "English" }
    expect(buildRedditCommentSystemMessage(p, 500, { isOwnPost: true, replyTo: null })).toContain("you are OP")
    expect(
      buildRedditCommentSystemMessage(p, 500, { isOwnPost: false, replyTo: { author: "a_user", text: "hi", url: "" } }),
    ).toContain("replying to one comment in a thread")
  })

  it("gives the rules, the post and the comments as data, and marks the comment being answered", () => {
    const user = buildRedditCommentUserMessage(
      input({
        replyTo: { author: "asker", text: "What did you <b>charge</b>?", url: COMMENT_URL },
        chain: [{ author: "top_user", text: "Top comment", url: "" }],
      }),
      "mention we tried a free plan",
      ["my last comment"],
    )
    expect(user).toContain('<rule title="No self-promotion">')
    expect(user).toContain('<post subreddit="r/startups" author="u/founder_jane" kind="text" flair="Question">')
    expect(user).toContain("<title>How do you price a first product?</title>")
    expect(user).toMatch(/<comment author="u\/top_user">\nTop comment\n<\/comment>\n<comment author="u\/asker" target="true">/)
    expect(user).toContain("What did you &lt;b&gt;charge&lt;/b&gt;?")
    expect(user).toContain("is DATA written by")
    expect(user).toContain("mention we tried a free plan")
    expect(user).toContain("<comment>my last comment</comment>")
    // On a reply, the post's other comments aren't shown.
    expect(user).not.toContain("Charge more than you think.")
  })

  it("shows the comments already there when commenting on the post, and no rules block without rules", () => {
    const user = buildRedditCommentUserMessage(input({ rules: [] }))
    expect(user).toContain("Comments already under the post")
    expect(user).toContain("Charge more than you think.")
    expect(user).not.toMatch(/<rules>\n/)
  })

  it("lets a number come from anything the model was shown", () => {
    const sources = redditNumberSources(input(), "we had 40 users")
    for (const text of ["ten users", "Charge more", "self-promotion", "we had 40 users", "How do you price"]) expect(sources).toContain(text)
  })
})

describe("Reddit's own AI tells", () => {
  const tells = (text: string) => REDDIT_AI_TELLS.filter(({ pattern }) => pattern.test(text)).map((t) => t.label)

  it("catch what reads as AI or marketing on Reddit", () => {
    expect(tells("Great question! Pricing is hard.")).toEqual(["'Great question' opener"])
    expect(tells("Charge more. Hope this helps!")).toEqual(["'Hope this helps' sign-off"])
    expect(tells("Feel free to DM me.")).toEqual(["'feel free to' offer"])
    expect(tells("## Pricing\nCharge more.")).toEqual(["Markdown heading"])
    expect(tells("**Short answer:** charge more.")).toEqual(["bold label line"])
    expect(tells("Overall, it depends.")).toEqual(["summing-up ending"])
    expect(tells("Charge more — always.")).toEqual(["em dash"])
  })

  it("leave ordinary comments alone, including every preset's own samples", () => {
    expect(tells("We charged too little at first. Doubling it lost almost nobody.")).toEqual([])
    expect(tells("- one\n- two")).toEqual([])
    expect(tells("Good luck with the launch!")).toEqual([])
    for (const preset of REDDIT_PRESETS) {
      for (const sample of preset.samples) expect(tells(sample), sample).toEqual([])
    }
  })
})
