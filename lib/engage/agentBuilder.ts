// lib/engage/agentBuilder.ts — the AI agent builder behind
// app/api/ext/agents/builder (the extension panel only: the website never
// generates). Three actions, each one model call:
//   interview: the next question to ask, or done;
//   draft:     the agent's setup, from the description and the answers;
//   refine:    an improved setup, following an instruction.
//
// Free, but capped per person per day (BUILDER_DAILY_CALLS, counted from the
// recorded AI calls). Guards on what the model returns, so the agent never
// claims what the person didn't say: a fact quoting a number they never gave
// is dropped, an example reply must be one they wrote, and refining can't
// touch their facts, examples or rules (it may only add rules).
import { db } from "@/lib/db"
import { callCommentModelWithInfo, generationDeadline, GenerationTimeout } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"
import {
  buildDraftSystem,
  buildDraftUser,
  buildInterviewSystem,
  buildInterviewUser,
  buildRefineSystem,
  buildRefineUser,
  INTERVIEW_TOPICS,
  type BuilderAnswer,
} from "@/lib/ai/prompts/agentBuilderPrompt"
import { AGENT_LIMITS, normalizeAgentConfig, parseAgentInput, type AgentConfig, type AgentInput } from "@/lib/engageAgents"
import type { EngagePlatform } from "@/lib/engage/features"

export const BUILDER_ROUTE = "ext/agents/builder"
// Model calls a day (a backup model's turn counts too): an interview of up to
// MAX_QUESTIONS, its draft and a few refinements, several times over.
export const BUILDER_DAILY_CALLS = 60
export const MAX_QUESTIONS = 8
const MAX_DESCRIPTION = 3000
const MAX_ANSWER = 1500
const MAX_INSTRUCTION = 500

export class BuilderError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? Array.from(value.trim()).slice(0, max).join("") : ""
}

export function parseAnswers(raw: unknown): BuilderAnswer[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => {
      const topic = typeof a.topic === "string" && (INTERVIEW_TOPICS as readonly string[]).includes(a.topic) ? a.topic : undefined
      return { question: str(a.question, 300), answer: str(a.answer, MAX_ANSWER), ...(topic ? { topic } : {}) }
    })
    .filter((a) => a.question)
    .slice(0, MAX_QUESTIONS)
}

export function parseDescription(raw: unknown): string {
  const description = str(raw, MAX_DESCRIPTION)
  if (description.length < 10) throw new BuilderError(400, "Say a little about what you want your agent to help you achieve first.")
  return description
}

// The first JSON object in a model's answer (bare, or in a code fence).
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const candidates = [raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1], raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)]
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      // Try the next form.
    }
  }
  return null
}

// How many builder calls this person made in the last 24 hours.
async function callsToday(userId: string): Promise<number> {
  return db.engageAiCall.count({
    where: { userId, route: { startsWith: BUILDER_ROUTE }, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })
}

export async function assertBuilderAllowance(userId: string): Promise<void> {
  if ((await callsToday(userId)) >= BUILDER_DAILY_CALLS) {
    throw new BuilderError(
      429,
      "You've used today's free agent-building. It frees up again within 24 hours; your agents and replies aren't affected.",
      "builder_daily_cap",
    )
  }
}

// One model call, its answer as a JSON object; one more try if the answer
// isn't JSON. 502 when there's still nothing usable.
async function ask(
  userId: string,
  platform: EngagePlatform,
  action: string,
  system: string,
  user: string,
): Promise<Record<string, unknown>> {
  const deadline = generationDeadline()
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { raw } = await callCommentModelWithInfo(system, user, `${BUILDER_ROUTE}:${action}`, {
        deadline,
        patient: true,
        engage: { userId, kind: platform === "x" ? "x_messages" : "messages" },
      })
      const parsed = parseJsonObject(raw)
      if (parsed) return parsed
      console.warn(`[${BUILDER_ROUTE}:${action}] attempt ${attempt}: no JSON in the answer`)
    } catch (err) {
      if (err instanceof GenerationTimeout) break
      console.error(`[${BUILDER_ROUTE}:${action}] attempt ${attempt} failed:`, err)
    }
  }
  throw new BuilderError(502, "The AI couldn't do that just now. Try again in a moment.")
}

const platformName = (platform: EngagePlatform) => (platform === "x" ? "X (formerly Twitter)" : "LinkedIn")

// ── interview ───────────────────────────────────────────────────────────

export interface InterviewStep {
  done: boolean
  question?: string
  hint?: string
  optional?: boolean
  topic?: string
}

export async function nextInterviewStep(
  userId: string,
  platform: EngagePlatform,
  description: string,
  answers: BuilderAnswer[],
): Promise<InterviewStep> {
  // Enough asked: no call needed.
  if (answers.length >= MAX_QUESTIONS) return { done: true }
  const covered = new Set(answers.map((a) => a.topic).filter((t) => t && t !== "other"))
  const system = buildInterviewSystem(MAX_QUESTIONS, platformName(platform))
  // Seen with real models: after a skip, the same topic again and again in
  // new words. A topic already asked about gets one reminder, then the
  // interview ends rather than going round in circles.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const reminder =
      attempt === 2 ? 'Your last question was about a topic in <covered>. Ask about a different gap, or finish with {"done": true}.' : undefined
    const out = await ask(userId, platform, "interview", system, buildInterviewUser(description, answers, reminder))
    const question = str(out.question, 300)
    if (out.done === true || !question) return { done: true }
    const topic = typeof out.topic === "string" && (INTERVIEW_TOPICS as readonly string[]).includes(out.topic) ? out.topic : "other"
    const repeated = covered.has(topic) || answers.some((a) => a.question.toLowerCase() === question.toLowerCase())
    if (!repeated) return { done: false, question, hint: str(out.hint, 160), optional: out.optional !== false, topic }
  }
  return { done: true }
}

// ── draft ───────────────────────────────────────────────────────────────

const normalized = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()

// The setup the model wrote, held to what the person said.
export function guardDraft(rawDraft: Record<string, unknown>, description: string, answers: BuilderAnswer[]): AgentInput {
  const said = [description, ...answers.map((a) => a.answer)].join("\n")
  const saidNormalized = normalized(said)
  const raw =
    typeof rawDraft.description === "string" ? { ...rawDraft, description: fitDescription(rawDraft.description.trim()) } : rawDraft
  const parsed = parseAgentInput({ ...raw, status: "draft" })
  if (!parsed.ok) {
    // No name: name it after what it's for.
    const named = parseAgentInput({ ...raw, name: "My agent", status: "draft" })
    if (!named.ok) throw new BuilderError(502, "The AI couldn't do that just now. Try again in a moment.")
    return guardConfig(named.value, said, saidNormalized, description)
  }
  return guardConfig(parsed.value, said, saidNormalized, description)
}

// A description longer than the limit, cut at a word with an ellipsis rather
// than mid-word.
function fitDescription(text: string): string {
  const max = AGENT_LIMITS.description
  if (Array.from(text).length <= max) return text
  const cut = Array.from(text).slice(0, max - 1).join("")
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).trimEnd()}…`
}

function guardConfig(value: AgentInput, said: string, saidNormalized: string, description: string): AgentInput {
  const config: AgentConfig = {
    ...value.config,
    goals: value.config.goals || str(description, AGENT_LIMITS.longText),
    // A fact quoting a number they never gave is the model's, not theirs.
    facts: value.config.facts.filter((fact) => findUnsourcedNumbers(fact, said).length === 0),
    // Example replies are only ever their own words.
    examples: value.config.examples.filter((example) => {
      const n = normalized(example)
      return n.length > 0 && saidNormalized.includes(n)
    }),
  }
  return { ...value, config }
}

export async function draftAgent(
  userId: string,
  platform: EngagePlatform,
  description: string,
  answers: BuilderAnswer[],
): Promise<AgentInput> {
  const out = await ask(userId, platform, "draft", buildDraftSystem(platformName(platform)), buildDraftUser(description, answers))
  return guardDraft(out, description, answers)
}

// ── refine ──────────────────────────────────────────────────────────────

const REFINABLE: (keyof AgentConfig)[] = ["business", "offer", "audience", "goals", "nextStep", "strategy", "tone", "length", "language"]

// The improved setup: the model's wording for the fields it may change, the
// person's own facts, examples, rules (plus any added) and name kept as they
// were. `changed` names the fields that differ, for the panel to say.
export function mergeRefinement(current: AgentInput, raw: Record<string, unknown>): { draft: AgentInput; changed: string[] } {
  const proposed = normalizeAgentConfig({ ...current.config, ...(raw.config && typeof raw.config === "object" ? raw.config : {}) })
  const config: AgentConfig = { ...current.config }
  const changed: string[] = []
  for (const key of REFINABLE) {
    const next = proposed[key]
    // An emptied field is the model dropping something: keep theirs.
    if (typeof next === "string" && next && next !== config[key]) {
      ;(config as unknown as Record<string, unknown>)[key] = next
      changed.push(key)
    }
  }
  // Situations may be added to, never taken away.
  const added = proposed.objections.filter((o) => !config.objections.includes(o))
  if (added.length > 0) {
    config.objections = [...config.objections, ...added].slice(0, AGENT_LIMITS.objections)
    changed.push("objections")
  }
  const append = (existing: string, addition: unknown) => {
    const extra = str(addition, AGENT_LIMITS.rules)
    if (!extra || existing.includes(extra)) return existing
    return str(existing ? `${existing}\n${extra}` : extra, AGENT_LIMITS.rules)
  }
  const alwaysDo = append(config.alwaysDo, raw.alwaysAdd)
  const neverDo = append(config.neverDo, raw.neverAdd)
  if (alwaysDo !== config.alwaysDo) changed.push("alwaysDo")
  if (neverDo !== config.neverDo) changed.push("neverDo")
  config.alwaysDo = alwaysDo
  config.neverDo = neverDo

  const description = str(raw.description, AGENT_LIMITS.description) || current.description
  if (description !== current.description) changed.push("description")
  return { draft: { ...current, description, config }, changed }
}

export async function refineAgent(
  userId: string,
  platform: EngagePlatform,
  current: AgentInput,
  instructionRaw: unknown,
): Promise<{ draft: AgentInput; changed: string[] }> {
  const instruction = str(instructionRaw, MAX_INSTRUCTION) || "Improve it: clearer, more specific, more useful for writing replies."
  const agentJson = JSON.stringify({ name: current.name, description: current.description, purpose: current.purpose, config: current.config })
  const out = await ask(userId, platform, "refine", buildRefineSystem(platformName(platform)), buildRefineUser(agentJson, instruction))
  return mergeRefinement(current, out)
}
