// lib/engage/promptSamples.ts — what each Engage feature sends the AI, built
// by the same functions the routes use, from one fixed sample (a profile, a
// post, a conversation), for admin → Engage → AI → Prompts. Read-only: the
// prompts are changed in code, where they are tested.
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
  buildReplySystemMessage,
  buildReplyUserMessage,
  buildRewriteSystemMessage,
  buildRewriteUserMessage,
  countSentences,
  targetLengthRange,
} from "@/lib/ai/prompts/commentPrompt"
import { buildConnectionNoteSystemMessage, buildConnectionNoteUserMessage } from "@/lib/ai/prompts/connectionNotePrompt"
import { buildMessageSystemMessage, buildMessageUserMessage } from "@/lib/ai/prompts/messagePrompt"
import { buildXReplySystemMessage, buildXReplyUserMessage } from "@/lib/ai/prompts/xReplyPrompt"
import { xLength, X_MAX_LENGTH } from "@/lib/xText"
import type { EngageFeature } from "@/lib/engage/features"

export interface PromptSample {
  id: string
  label: string
  feature: EngageFeature
  // System message (instructions) and user message (the content), as sent.
  system: string
  user: string
}

const PROFILE = {
  whoIAm: "A B2B SaaS founder who has shipped onboarding to 10k users",
  goal: "adds one useful insight",
  tone: "friendly",
  length: "100-220 characters",
  emoji: "None",
  language: "English",
  alwaysDo: "Tie the point to one detail from the post.",
  neverDo: "No hashtags.",
  samples: ["Moving the invite step after the first win is the part most teams miss."],
}

const POST = {
  author: "Priya Raman",
  headline: "Head of Growth at Northwind",
  text: "We cut onboarding from 14 steps to 5. Activation went from 31% to 48%.",
  type: "text",
  url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
}

const COMMENT = "Moving the invite step after the first real win is the part most teams miss. Order beats count."

const X_POST = {
  author: "Priya Raman",
  handle: "priya",
  text: "We cut onboarding from 14 steps to 5. Activation went from 31% to 48%.",
  url: "https://x.com/priya/status/1840000000000000001",
  media: ["image"],
}

const THREAD = [
  { sender: "me" as const, text: "Would love to compare notes on pricing for seat-based plans." },
  { sender: "them" as const, text: "Sure! We moved to usage-based last quarter. What are you working on?" },
]

const REASON = { goal: "A potential client: understand their situation before proposing anything", tone: "Natural" }

export function promptSamples(): PromptSample[] {
  const range = targetLengthRange(PROFILE.length)
  return [
    {
      id: "comment",
      label: "AI comment",
      feature: "comments",
      system: buildCommentSystemMessage(PROFILE),
      user: buildCommentUserMessage(POST),
    },
    {
      id: "reply",
      label: "Comment reply",
      feature: "replies",
      system: buildReplySystemMessage(PROFILE, false),
      user: buildReplyUserMessage(POST, {
        thread: [
          { author: "Sam Lee", text: "What changed first, the steps or the order?", depth: 0, isTarget: true, isSelf: false, isPostAuthor: false },
        ],
        isOwnPost: false,
      }),
    },
    {
      id: "rewrite",
      label: "Shorter (LinkedIn)",
      feature: "comments",
      system: buildRewriteSystemMessage("shorter", COMMENT.length, countSentences(COMMENT)),
      user: buildRewriteUserMessage(COMMENT),
    },
    {
      id: "connection_note",
      label: "Connection note",
      feature: "connection_notes",
      system: buildConnectionNoteSystemMessage({ min: 120, max: 220 }, "none", {
        angle: "A peer in the same field",
        goal: "Get the invite accepted",
        tone: "Friendly",
        length: "120-220 characters",
      }),
      user: buildConnectionNoteUserMessage(
        { name: "Maya Lindqvist", headline: "Talent Partner", currentRole: "Talent Partner at Northwind", about: "" },
        { kind: "none" },
      ),
    },
    {
      id: "message",
      label: "Conversation assistant",
      feature: "messages",
      system: buildMessageSystemMessage(REASON, false, "linkedin"),
      user: buildMessageUserMessage({ name: "Sam Lee", headline: "Founder at Lattice" }, THREAD, undefined, "linkedin"),
    },
    {
      id: "x_reply",
      label: "X reply",
      feature: "x_replies",
      system: buildXReplySystemMessage(PROFILE, Math.min(range.max, X_MAX_LENGTH), false),
      user: buildXReplyUserMessage({ post: X_POST, thread: [], quoted: null, isOwnPost: false }),
    },
    {
      id: "x_rewrite",
      label: "Shorter (X)",
      feature: "x_replies",
      system: buildRewriteSystemMessage("shorter", xLength(COMMENT), countSentences(COMMENT), { maxLength: X_MAX_LENGTH }),
      user: buildRewriteUserMessage(COMMENT),
    },
    {
      id: "x_message",
      label: "X message",
      feature: "x_messages",
      system: buildMessageSystemMessage(REASON, false, "x"),
      user: buildMessageUserMessage({ name: "Sam Lee", headline: "@sam_lee" }, THREAD, undefined, "x"),
    },
  ]
}
