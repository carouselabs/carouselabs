// lib/engageAgents.ts — custom AI conversation agents (model EngageAgent):
// what one holds, how it's validated (app/api/ext/agents), and how it turns
// into the reply prompt's instructions (lib/ai/prompts/messagePrompt.ts).
//
// The setup is kept structured, never as one block of prompt text: the
// builder (and later the AI interview) fill in fields, and the prompt is
// assembled from them on every reply, so a prompt change reaches every
// agent without touching what people saved.

export const AGENT_PURPOSES = ["sales", "networking", "recruiting", "partnerships", "support", "other"] as const
export type AgentPurpose = (typeof AGENT_PURPOSES)[number]
export const AGENT_PURPOSE_LABELS: Record<AgentPurpose, string> = {
  sales: "Sales",
  networking: "Networking",
  recruiting: "Recruiting",
  partnerships: "Partnerships",
  support: "Customer support",
  other: "Other",
}

export const AGENT_LENGTHS = ["auto", "short", "medium", "long"] as const
export type AgentLength = (typeof AGENT_LENGTHS)[number]

export const AGENT_STATUSES = ["active", "draft"] as const
export type AgentStatus = (typeof AGENT_STATUSES)[number]

// The default language: write in whatever language the conversation is in.
export const MATCH_CONVERSATION_LANGUAGE = "Match the conversation"

export interface AgentConfig {
  // Who the account holder is and what their business does.
  business: string
  // The product or service, and why it's worth having.
  offer: string
  // Who they talk to: the ideal customer, the people they want to meet.
  audience: string
  // What a good conversation achieves (required).
  goals: string
  // The next step to move toward when the moment is right (a call, a demo).
  nextStep: string
  // How to move a conversation along: what to ask first, when to mention
  // the offer, how to follow up.
  strategy: string
  tone: string
  length: AgentLength
  language: string
  // The only claims about the offer the agent may make: prices, features,
  // results. Anything else it must not state.
  facts: string[]
  // Common objections or situations, each with how to handle it.
  objections: string[]
  alwaysDo: string
  neverDo: string
  // Replies that sound right, for voice.
  examples: string[]
}

export interface AgentInput {
  name: string
  description: string
  purpose: AgentPurpose
  status: AgentStatus
  config: AgentConfig
}

export const AGENT_LIMITS = {
  agentsPerUser: 30,
  name: 60,
  description: 200,
  longText: 1500,
  nextStep: 300,
  tone: 60,
  language: 40,
  rules: 1000,
  listItem: 400,
  example: 1000,
  facts: 25,
  objections: 12,
  examples: 5,
} as const

function str(value: unknown, max: number): string {
  return typeof value === "string" ? Array.from(value.trim()).slice(0, max).join("") : ""
}

function list(value: unknown, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => str(item, maxChars)).filter(Boolean).slice(0, maxItems)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

// A stored config read back, filled out to the current shape: a field added
// later (or a hand-edited row) never reaches the prompt as undefined.
export function normalizeAgentConfig(raw: unknown): AgentConfig {
  const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const L = AGENT_LIMITS
  return {
    business: str(c.business, L.longText),
    offer: str(c.offer, L.longText),
    audience: str(c.audience, L.longText),
    goals: str(c.goals, L.longText),
    nextStep: str(c.nextStep, L.nextStep),
    strategy: str(c.strategy, L.longText),
    tone: str(c.tone, L.tone) || "Natural",
    length: oneOf(c.length, AGENT_LENGTHS, "auto"),
    language: str(c.language, L.language) || MATCH_CONVERSATION_LANGUAGE,
    facts: list(c.facts, L.facts, L.listItem),
    objections: list(c.objections, L.objections, L.listItem),
    alwaysDo: str(c.alwaysDo, L.rules),
    neverDo: str(c.neverDo, L.rules),
    examples: list(c.examples, L.examples, L.example),
  }
}

// The cleaned agent, or the first problem in words for the person.
export function parseAgentInput(body: unknown): { ok: true; value: AgentInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" }
  const raw = body as Record<string, unknown>
  const value: AgentInput = {
    name: str(raw.name, AGENT_LIMITS.name),
    description: str(raw.description, AGENT_LIMITS.description),
    purpose: oneOf(raw.purpose, AGENT_PURPOSES, "other"),
    status: oneOf(raw.status, AGENT_STATUSES, "active"),
    config: normalizeAgentConfig(raw.config),
  }
  if (!value.name) return { ok: false, error: "Agent name is required" }
  // A draft (the AI builder, part-way) may be incomplete; an agent in use
  // needs to know what its conversations are for.
  if (value.status === "active" && !value.config.goals) {
    return { ok: false, error: "Say what this agent's conversations are for (Goal)" }
  }
  return { ok: true, value }
}

// ── The prompt ──────────────────────────────────────────────────────────

const LENGTH_GUIDANCE: Record<AgentLength, string> = {
  auto: "Match what the moment calls for: one line or several, never padded.",
  short: "Keep it short: one to three sentences.",
  medium: "Usually a short paragraph: a few sentences.",
  long: "Can run to a couple of paragraphs when there is real substance to cover; never padding.",
}

// What an agent asks of every reply, written as the prompt's instructions in
// place of a message profile's "why this conversation is happening". The
// user's own words go in as they wrote them: they are the account holder's
// instructions, not third-party data. The thread stays data (see
// buildMessageUserMessage), and the fixed rules below come after everything
// the user wrote, so their text can add rules but not lift these.
export function agentPromptSections(name: string, config: AgentConfig, toneOverride?: string): {
  sections: string[]
  tone: string
} {
  const tone = toneOverride || config.tone
  const sections: string[] = []

  const about: string[] = []
  if (config.business) about.push(`Who they are / their business:\n${config.business}`)
  if (config.offer) about.push(`What they offer:\n${config.offer}`)
  if (config.audience) about.push(`Who they talk to:\n${config.audience}`)
  if (about.length > 0) sections.push(`## Who you are writing for (the account holder)\n${about.join("\n\n")}`)

  const aims = [`What these conversations are for:\n${config.goals}`]
  if (config.nextStep) aims.push(`The next step to move toward, only once the conversation is ready for it:\n${config.nextStep}`)
  if (config.strategy) aims.push(`How to move the conversation along:\n${config.strategy}`)
  sections.push(`## The agent's purpose ("${name}")\n${aims.join("\n\n")}`)

  if (config.facts.length > 0) {
    sections.push(`## Verified facts
These are the ONLY things you may state about the account holder's product,
pricing, features or results. Use one only when it answers what they asked or
clearly helps them. If they ask about something not covered here, do not
guess: say you'll check, or ask a question back.
${config.facts.map((fact) => `- ${fact}`).join("\n")}`)
  } else {
    sections.push(`## Product claims
No verified product facts were given. Never state prices, features, numbers,
customer results or testimonials. If they ask, say you'll share details or
ask what they need.`)
  }

  if (config.objections.length > 0) {
    sections.push(`## Situations and how to handle them\n${config.objections.map((o) => `- ${o}`).join("\n")}`)
  }

  const style = [`- Tone: ${tone}`, `- Length: ${LENGTH_GUIDANCE[config.length]}`]
  style.push(
    config.language === MATCH_CONVERSATION_LANGUAGE
      ? "- Language: the language the conversation is in (English if it's empty)."
      : `- Language: ${config.language}`,
  )
  sections.push(`## Style\n${style.join("\n")}`)

  const constraints: string[] = []
  if (config.alwaysDo) constraints.push(`- Always: ${config.alwaysDo}`)
  if (config.neverDo) constraints.push(`- Never: ${config.neverDo}`)
  if (constraints.length > 0) sections.push(`## Constraints\n${constraints.join("\n")}`)

  if (config.examples.length > 0) {
    sections.push(`## Voice
Match the voice of these replies. Copy their rhythm, sentence length and level
of formality, not their subject matter.

<samples>
${config.examples.map((example) => `<sample>${example}</sample>`).join("\n")}
</samples>`)
  }

  sections.push(`## How this agent behaves, always
- Answer what they actually said or asked first; the agent's goal comes
  second and never at the expense of a real answer.
- Read where the conversation is. Do not pitch the offer or push the next
  step before they have shown interest or the conversation makes it natural;
  a first reply is almost never the moment.
- Never claim the account holder did, said, read or used something unless
  the thread shows it.
- If they decline, say they're not interested, or ask not to be contacted,
  respect it: a short, gracious reply with no pitch and no further ask.`)

  return { sections, tone }
}

// Text the reply may take figures from (prices, numbers in facts), for the
// unsourced-number guard (lib/ai/numberGuard.ts).
export function agentNumberSources(config: AgentConfig): string {
  return [config.business, config.offer, config.audience, config.goals, config.nextStep, ...config.facts, ...config.objections].join(" ")
}

// An agent as the API returns it.
export function agentForClient(row: {
  id: string
  name: string
  description: string
  purpose: string
  config: unknown
  status: string
  isDefault: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    purpose: oneOf(row.purpose, AGENT_PURPOSES, "other"),
    status: oneOf(row.status, AGENT_STATUSES, "active"),
    isDefault: row.isDefault,
    version: row.version,
    config: normalizeAgentConfig(row.config),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
