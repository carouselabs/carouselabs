// How human the comments read, with the REAL prompts, the REAL generation
// engine (retries and guards included) and the REAL models: every built-in
// LinkedIn profile on six everyday posts, LinkedIn replies to a comment, and
// every built-in X profile. Each profile works through its posts in turn and
// sees what it already wrote, as in real use. Prints every comment so they
// can be read side by side, and counts the AI tells below (a wider list than
// the one production retries on, so it measures the prompt rather than the
// retry) and openers a profile repeats.
//
// Costs a few cents per run.
//   npx vitest run --config vitest.bench.config.ts tests/bench/commentQuality.bench.test.ts
// COMMENT_BENCH_PROFILES=sys-witty,sys-celebrator limits it to some profiles.
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { generateComment, type GenerationInput } from "../../../lib/engage/commentEngine";
import { RECENT_COMMENTS } from "../../../lib/engage/recentComments";
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
  buildReplySystemMessage,
  buildReplyUserMessage,
  copiedPhrase,
  lengthSlack,
  targetLengthRange,
  type CommentProfileInput,
} from "../../../lib/ai/prompts/commentPrompt";
import { buildXReplySystemMessage, buildXReplyUserMessage, xNumberSources } from "../../../lib/ai/prompts/xReplyPrompt";
import { xLength, X_MAX_LENGTH } from "../../../lib/xText";
import { POSTS } from "./fixtures";

const require = createRequire(import.meta.url);
type PresetData = Partial<CommentProfileInput> & { id: string; name: string; whoIAm: string; goal: string; tone: string; length: string };
const { SYSTEM_PROFILES } = require("../../../scripts/seed-comment-profiles.js") as { SYSTEM_PROFILES: PresetData[] };
const { X_PRESETS } = require("../../../scripts/x-profile-presets.js") as { X_PRESETS: PresetData[] };

const MORE_POSTS = [
  {
    author: "Chris Malone",
    headline: "Demand Gen Lead | B2B",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:4",
    text: "3 marketing tactics I think are dying by 2027:\n\n1. Gated ebooks. Nobody wants to trade their email for a 40 page PDF anymore.\n2. Cold DMs that open with a calendar link.\n3. Webinars with 45 minutes of slides and 5 minutes of Q&A.\n\nWhat replaces them? Useful stuff given away for free, real conversations, and shorter live sessions where the audience drives.\n\nAgree or disagree?",
  },
  {
    author: "Aisha Bello",
    headline: "Founder, Crumb & Co. Bakery",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:5",
    text: "Four years ago I was baking at 5am before my office job.\n\nToday we signed the lease on our first shop.\n\nThank you to everyone who bought a loaf at the Saturday market when it was just me and a folding table. We open in March.",
  },
  {
    author: "Tom Reyes",
    headline: "VP Engineering",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:6",
    text: "Unpopular opinion: most recurring meetings should be a written update.\n\nWe killed our weekly status meeting 6 months ago. Everyone posts 3 bullets on Monday. Anyone can ask questions in the thread.\n\nWe got back about 4 hours per person per month, and decisions actually got faster because people read the updates instead of half listening on a call.",
  },
];

const ALL_POSTS = [...MORE_POSTS, ...POSTS];

// Read as AI-written by people who see a lot of LinkedIn comments.
const TELLS: { label: string; pattern: RegExp }[] = [
  { label: "opens with a quote", pattern: /^\s*["“‘'][^"”’'\n]{2,120}["”’']/ },
  { label: "grades the post", pattern: /\b(?:bold|great|powerful|strong|interesting|important|key|solid|smart|excellent|brilliant|insightful|crucial|valuable|good|fair|real)\s+(?:prediction|claim|take|point|call|insight|reminder|observation|perspective|statement|framing|distinction|detail|lesson|shift)\b/i },
  { label: "'stands out' / 'is the key'", pattern: /\bstands? out\b|\bis the (?:key|real|important|interesting|best|hard|tricky) (?:part|bit|detail|point|piece|line)\b/i },
  { label: "'the point/part about'", pattern: /\bthe (?:point|bit|part|line|idea|detail) (?:about|on)\b/i },
  { label: "asks for their opinion", pattern: /\b(?:do|would) you think\b|\bthoughts\?|\bwhat(?:'|’)?s your take\b|\bhow do you see\b|\bwould love to hear\b|\bcurious (?:to|what|how|if|whether)\b|\bwhich (?:one|of)\b[^?]*\?/i },
  { label: "ends with a question", pattern: /\?\s*$/ },
  { label: "semicolon", pattern: /;/ },
  { label: "'it's not X, it's Y'", pattern: /\b(?:it|this|that)(?:'|’)?s not (?:just |only |about )?[^.!?\n]{1,60}[,;]\s*(?:it|this|that)(?:'|’)?s\b|\bisn(?:'|’)?t (?:about|just)\b[^.!?\n]{1,60}[,;]\s*it(?:'|’)?s\b/i },
  { label: "AI vocabulary", pattern: /\b(?:resonat\w*|game[\s-]?changer|underrated|testament|invaluable|crucial|leverag\w*|landscape|navigat\w*|unlock\w*|spot on|hits home|well said|so true|love this|great reminder|food for thought|nuance[ds]?|pivotal|realm|foster\w*|underscore\w*|in today(?:'|’)?s|game plan|mindset shift|the real (?:story|lesson|win|takeaway|unlock|insight|magic|question|test))\b/i },
  { label: "neat closing line", pattern: /\b(?:beats|wins|over)\b[^.!?\n]{0,25}\.\s*$|\bthat(?:'|’)?s (?:the|where|what|why)\b[^.!?\n]{0,60}[.!]\s*$/i },
];

const tellsIn = (text: string, post: string) => {
  const tells = TELLS.filter(({ pattern }) => pattern.test(text)).map((t) => t.label);
  const copied = copiedPhrase(text, post, 4);
  return copied ? [...tells, `copies "${copied}"`] : tells;
};

// The first two words, for spotting a profile that opens every comment alike.
const opener = (text: string) => text.toLowerCase().split(/\s+/).slice(0, 2).join(" ");

const asInput = (p: PresetData): CommentProfileInput => ({
  whoIAm: p.whoIAm,
  goal: p.goal,
  tone: p.tone,
  length: p.length,
  emoji: p.emoji ?? "None",
  language: p.language ?? "English",
  alwaysDo: p.alwaysDo ?? null,
  neverDo: p.neverDo ?? null,
  samples: p.samples ?? [],
});

// One thing to write: the input for the engine, given the comments this
// profile already wrote (newest first, as lib/engage/recentComments.ts gives
// them), and the text the comment answers.
interface Job {
  label: string;
  source: string;
  input: (recent: string[]) => GenerationInput;
}
type Row = { label: string; source: string; comment: string; attempts: number; ms: number };

// Like one person working through their feed: each profile writes its jobs in
// turn and sees what it already wrote; six profiles at a time, so a run takes
// about a minute without rate limits. Prints everything, then the totals.
async function session(groups: { name: string; jobs: Job[] }[]) {
  const reasons = new Map<string, number>();
  const warn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const reason = String(args[0]).replace(/^\[[^\]]+\] attempt \d+: /, "").replace(/\(".*"\)/, '("…")');
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  });
  const run = async (jobs: Job[]) => {
    const done: Row[] = [];
    for (const job of jobs) {
      const recent = done.map((r) => r.comment).filter(Boolean).reverse().slice(0, RECENT_COMMENTS);
      const start = performance.now();
      const result = await generateComment(job.input(recent));
      done.push({ label: job.label, source: job.source, comment: result.comment, attempts: result.attempts, ms: Math.round(performance.now() - start) });
    }
    return done;
  };
  const results: Row[][] = [];
  for (let i = 0; i < groups.length; i += 6) results.push(...(await Promise.all(groups.slice(i, i + 6).map((g) => run(g.jobs)))));
  warn.mockRestore();

  let flagged = 0;
  let retried = 0;
  let repeatedOpeners = 0;
  groups.forEach((group, i) => {
    process.stdout.write(`\n=== ${group.name}\n`);
    for (const r of results[i]) {
      const tells = tellsIn(r.comment, r.source);
      if (tells.length > 0) flagged += 1;
      if (r.attempts > 1) retried += 1;
      process.stdout.write(
        `- [${r.label}] ${r.comment || "(failed)"}\n    ${r.comment.length} chars, ${r.ms} ms, ${r.attempts} ${r.attempts > 1 ? "tries" : "try"}${tells.length ? `, TELLS: ${tells.join("; ")}` : ""}\n`,
      );
    }
    const openers = results[i].map((r) => opener(r.comment)).filter(Boolean);
    repeatedOpeners += openers.length - new Set(openers).size;
  });
  const all = results.flat();
  process.stdout.write(
    `\n${flagged}/${all.length} with an AI tell, ${repeatedOpeners} repeat an opener already used by the same profile, ${retried}/${all.length} needed a second try, ${all.filter((r) => !r.comment).length} failed\n`,
  );
  process.stdout.write(`Second tries: ${[...reasons].map(([reason, n]) => `${n}x ${reason}`).join(" | ") || "none"}\n\n`);
  expect(all.filter((r) => r.comment).length).toBeGreaterThan(all.length * 0.9);
}

const only = process.env.COMMENT_BENCH_PROFILES?.split(",").map((s) => s.trim());
const chosen = <T extends { id: string }>(list: T[]) => list.filter((p) => !only || only.includes(p.id));

describe("comment quality with real models", () => {
  it("LinkedIn: every built-in profile comments on every post", async () => {
    await session(
      chosen(SYSTEM_PROFILES).map((p) => {
        const profile = asInput(p);
        const { min, max } = targetLengthRange(profile.length);
        return {
          name: `${p.name} (${p.length})`,
          jobs: ALL_POSTS.map((post) => ({
            label: post.author.split(" ")[0],
            source: post.text,
            input: (recent) => ({
              systemMessage: buildCommentSystemMessage(profile),
              userMessage: buildCommentUserMessage(post, undefined, recent),
              min,
              max,
              lengthSlack: lengthSlack(profile.length),
              numberSources: [post.text, post.headline, post.author].join(" "),
              copySource: post.text,
              label: "bench/quality",
            }),
          })),
        };
      }),
    );
  });

  it("LinkedIn: replies to a comment under a post", async () => {
    const threads = [
      { post: ALL_POSTS[0], who: "Dana Kim", says: "Hard disagree on webinars. Ours still bring in our best leads, people just hate bad ones." },
      { post: ALL_POSTS[2], who: "Raj Patel", says: "We tried this and people stopped reading the updates after a month. How did you avoid that?" },
      { post: ALL_POSTS[3], who: "Lena Fox", says: "The invite timing point is so good. We saw the same thing with our referral prompt." },
    ];
    const replyProfiles = chosen(SYSTEM_PROFILES).filter((p) =>
      ["sys-carouselabs-simple-human", "sys-thoughtful-expert", "sys-carouselabs-balanced", "sys-supportive-peer"].includes(p.id),
    );
    await session(
      replyProfiles.map((p) => {
        const profile = asInput(p);
        const { min, max } = targetLengthRange(profile.length);
        return {
          name: `${p.name} replying (${p.length})`,
          jobs: threads.map(({ post, who, says }) => {
            const reply = {
              thread: [{ author: who, text: says, depth: 0, isTarget: true, isSelf: false, isPostAuthor: false }],
              isOwnPost: false,
            };
            return {
              label: `to ${who.split(" ")[0]}`,
              source: says,
              input: (recent: string[]) => ({
                systemMessage: buildReplySystemMessage(profile, false),
                userMessage: buildReplyUserMessage(post, reply, undefined, recent),
                min,
                max,
                lengthSlack: lengthSlack(profile.length),
                numberSources: [post.text, post.headline, post.author, says].join(" "),
                copySource: says,
                label: "bench/quality-reply",
              }),
            };
          }),
        };
      }),
    );
  });

  it("X: every built-in X profile replies to every post", async () => {
    await session(
      chosen(X_PRESETS).map((p) => {
        const profile = asInput(p);
        const range = targetLengthRange(profile.length);
        const max = Math.min(range.max, X_MAX_LENGTH);
        return {
          name: `${p.name} (${p.length})`,
          jobs: ALL_POSTS.map((post) => {
            const handle = post.author.toLowerCase().replace(/[^a-z]/g, "");
            const reply = {
              post: { author: post.author, handle, text: post.text, url: `https://x.com/${handle}/status/1`, media: [] },
              thread: [],
              quoted: null,
              isOwnPost: false,
            };
            return {
              label: post.author.split(" ")[0],
              source: post.text,
              input: (recent: string[]) => ({
                systemMessage: buildXReplySystemMessage(profile, max, false),
                userMessage: buildXReplyUserMessage(reply, undefined, recent),
                min: Math.min(range.min, max),
                max,
                numberSources: xNumberSources(reply),
                measure: xLength,
                copySource: post.text,
                label: "bench/quality-x",
              }),
            };
          }),
        };
      }),
    );
  });
});
